import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getESP32Status } from '@/lib/esp32';
import type { DeviceStatusResponse, Schedule, DispenseEvent, VitalsReading, TrayStatus, Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    // Try to get real device status from ESP32
    let esp32Data: Awaited<ReturnType<typeof getESP32Status>> | null = null;
    let deviceConnected = false;

    try {
      esp32Data = await getESP32Status();
      deviceConnected = true;
    } catch {
      // ESP32 not reachable - use last known DB state
      console.log('ESP32 not reachable, using database state');
    }

    if (deviceConnected && esp32Data) {
      // Update device_state table with real ESP32 data
      db.prepare(
        "UPDATE device_state SET state = ?, device_time = ?, updated_at = datetime('now') WHERE id = 1"
      ).run(esp32Data.state, esp32Data.deviceTime);

      // Log vitals if we have new readings
      if (esp32Data.heartRate > 0 || esp32Data.spo2 > 0) {
        const lastVitalsRow = db.prepare(
          'SELECT heart_rate, spo2 FROM vitals_log ORDER BY read_at DESC LIMIT 1'
        ).get() as { heart_rate: number; spo2: number } | undefined;

        // Only log if vitals changed
        if (!lastVitalsRow || lastVitalsRow.heart_rate !== esp32Data.heartRate || lastVitalsRow.spo2 !== esp32Data.spo2) {
          db.prepare(
            "INSERT INTO vitals_log (heart_rate, spo2, safe) VALUES (?, ?, ?)"
          ).run(esp32Data.heartRate, esp32Data.spo2, esp32Data.vitalsSafe ? 1 : 0);

          // Generate vitals alert if unsafe
          if (!esp32Data.vitalsSafe && esp32Data.heartRate > 0) {
            const existing = db.prepare(
              "SELECT COUNT(*) as count FROM alerts WHERE type = 'vitals_unsafe' AND acknowledged = 0"
            ).get() as { count: number };
            if (existing.count === 0) {
              db.prepare(
                "INSERT INTO alerts (type, message, severity) VALUES ('vitals_unsafe', ?, 'critical')"
              ).run(`Unsafe vitals: HR=${esp32Data.heartRate} BPM, SpO2=${esp32Data.spo2}%. Medicine blocked.`);
            }
          }
        }
      }

      // Update tray counts from ESP32
      db.prepare("UPDATE trays SET pill_count = ?, updated_at = datetime('now') WHERE id = 'A'").run(esp32Data.trayA);
      db.prepare("UPDATE trays SET pill_count = ?, updated_at = datetime('now') WHERE id = 'B'").run(esp32Data.trayB);
      db.prepare("UPDATE trays SET pill_count = ?, updated_at = datetime('now') WHERE id = 'C'").run(esp32Data.trayC);
      db.prepare("UPDATE trays SET pill_count = ?, updated_at = datetime('now') WHERE id = 'D'").run(esp32Data.trayD);

      // Check for low tray alerts
      const trayNames = ['A', 'B', 'C', 'D'];
      const trayCounts = [esp32Data.trayA, esp32Data.trayB, esp32Data.trayC, esp32Data.trayD];
      for (let i = 0; i < 4; i++) {
        const tray = db.prepare('SELECT * FROM trays WHERE id = ?').get(trayNames[i]) as {
          low_threshold: number; label: string;
        };
        if (tray && trayCounts[i] <= tray.low_threshold) {
          const existing = db.prepare(
            "SELECT COUNT(*) as count FROM alerts WHERE type = 'tray_low' AND acknowledged = 0 AND message LIKE ?"
          ).get(`%${tray.label}%`) as { count: number };
          if (existing.count === 0) {
            db.prepare(
              "INSERT INTO alerts (type, message, severity) VALUES ('tray_low', ?, 'warning')"
            ).run(`${tray.label} is low on medicine (${trayCounts[i]} pills remaining).`);
          }
        }
      }

      // Log dispense if new
      if (esp32Data.hasDispensed) {
        const lastLog = db.prepare(
          'SELECT dispensed_at FROM dispense_log ORDER BY dispensed_at DESC LIMIT 1'
        ).get() as { dispensed_at: string } | undefined;

        if (!lastLog || lastLog.dispensed_at !== esp32Data.lastDispenseTime) {
          db.prepare(
            "INSERT INTO dispense_log (tray_a, tray_b, tray_c, tray_d, success, dispensed_at) VALUES (0, 0, 0, 0, ?, ?)"
          ).run(esp32Data.lastDispenseSuccess ? 1 : 0, esp32Data.lastDispenseTime);

          if (!esp32Data.lastDispenseSuccess) {
            db.prepare(
              "INSERT INTO alerts (type, message, severity) VALUES ('dispense_failure', 'Pill drop not detected. Dispense may have failed.', 'critical')"
            ).run();
          }
        }
      }
    }

    // Build response from database (which now has latest ESP32 data)
    const deviceState = db.prepare('SELECT * FROM device_state WHERE id = 1').get() as {
      state: string;
      device_time: string;
    };

    // Get next scheduled dose
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const allSchedules = db.prepare(
      'SELECT * FROM schedules WHERE enabled = 1 AND hour >= 0 ORDER BY hour ASC, minute ASC'
    ).all() as { id: number; hour: number; minute: number; tray_a: number; tray_b: number; tray_c: number; tray_d: number; enabled: number; created_at: string; updated_at: string }[];

    let nextDose: Schedule | null = null;
    const futureSchedules = allSchedules.filter(s => s.hour * 60 + s.minute > currentMinutes);
    const chosen = futureSchedules.length > 0 ? futureSchedules[0] : allSchedules[0] || null;

    if (chosen) {
      nextDose = {
        id: chosen.id, hour: chosen.hour, minute: chosen.minute,
        trayA: chosen.tray_a, trayB: chosen.tray_b, trayC: chosen.tray_c, trayD: chosen.tray_d,
        enabled: chosen.enabled === 1, createdAt: chosen.created_at, updatedAt: chosen.updated_at,
      };
    }

    // Get last dispense event
    const lastDispenseRow = db.prepare(
      'SELECT * FROM dispense_log ORDER BY dispensed_at DESC LIMIT 1'
    ).get() as { id: number; schedule_id: number | null; tray_a: number; tray_b: number; tray_c: number; tray_d: number; success: number; dispensed_at: string } | undefined;

    let lastDispense: DispenseEvent | null = null;
    if (lastDispenseRow) {
      lastDispense = {
        id: lastDispenseRow.id, scheduleId: lastDispenseRow.schedule_id,
        trayA: lastDispenseRow.tray_a, trayB: lastDispenseRow.tray_b,
        trayC: lastDispenseRow.tray_c, trayD: lastDispenseRow.tray_d,
        success: lastDispenseRow.success === 1, dispensedAt: lastDispenseRow.dispensed_at,
      };
    }

    // Get last vitals
    const lastVitalsRow = db.prepare(
      'SELECT * FROM vitals_log ORDER BY read_at DESC LIMIT 1'
    ).get() as { heart_rate: number; spo2: number; safe: number; read_at: string } | undefined;

    let lastVitals: VitalsReading | null = null;
    if (lastVitalsRow) {
      lastVitals = {
        heartRate: lastVitalsRow.heart_rate, spo2: lastVitalsRow.spo2,
        safe: lastVitalsRow.safe === 1, readAt: lastVitalsRow.read_at,
      };
    }

    // Get trays
    const trayRows = db.prepare('SELECT * FROM trays ORDER BY id').all() as {
      id: string; label: string; pill_count: number; capacity: number; low_threshold: number;
    }[];

    const trays: TrayStatus[] = trayRows.map(t => ({
      id: t.id as 'A' | 'B' | 'C' | 'D', label: t.label, pillCount: t.pill_count,
      capacity: t.capacity, lowThreshold: t.low_threshold, isLow: t.pill_count <= t.low_threshold,
    }));

    // Get active alerts
    const alertRows = db.prepare(
      'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 20'
    ).all() as { id: number; type: string; message: string; severity: string; acknowledged: number; created_at: string }[];

    const activeAlerts: Alert[] = alertRows.map(a => ({
      id: a.id, type: a.type as Alert['type'], message: a.message,
      severity: a.severity as Alert['severity'], acknowledged: a.acknowledged === 1, createdAt: a.created_at,
    }));

    const response: DeviceStatusResponse = {
      state: (deviceConnected ? esp32Data!.state : deviceState.state) as DeviceStatusResponse['state'],
      deviceTime: deviceConnected ? esp32Data!.deviceTime : deviceState.device_time,
      nextDose, lastDispense, lastVitals, trays, activeAlerts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Status API error:', error);
    return NextResponse.json({ error: 'Failed to get device status' }, { status: 500 });
  }
}
