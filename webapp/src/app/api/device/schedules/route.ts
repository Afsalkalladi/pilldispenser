import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { syncSchedulesToESP32 } from '@/lib/esp32';
import type { Schedule, ScheduleInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Helper to sync all enabled schedules to ESP32
async function syncToDevice(db: ReturnType<typeof getDb>) {
  try {
    const rows = db.prepare(
      'SELECT * FROM schedules WHERE enabled = 1 AND hour >= 0 ORDER BY hour ASC, minute ASC'
    ).all() as { hour: number; minute: number; tray_a: number; tray_b: number; tray_c: number; tray_d: number }[];

    await syncSchedulesToESP32(rows.map(r => ({
      hour: r.hour, minute: r.minute,
      trayA: r.tray_a, trayB: r.tray_b, trayC: r.tray_c, trayD: r.tray_d,
    })));
  } catch {
    console.log('Could not sync schedules to ESP32 (device may be offline)');
  }
}

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM schedules ORDER BY hour ASC, minute ASC').all() as {
      id: number; hour: number; minute: number; tray_a: number; tray_b: number; tray_c: number; tray_d: number;
      enabled: number; created_at: string; updated_at: string;
    }[];

    const schedules: Schedule[] = rows.map(r => ({
      id: r.id, hour: r.hour, minute: r.minute,
      trayA: r.tray_a, trayB: r.tray_b, trayC: r.tray_c, trayD: r.tray_d,
      enabled: r.enabled === 1, createdAt: r.created_at, updatedAt: r.updated_at,
    }));

    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Schedules GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleInput = await request.json();

    if (body.hour < 0 || body.hour > 23 || body.minute < 0 || body.minute > 59) {
      return NextResponse.json({ error: 'Invalid time. Hour must be 0-23, minute must be 0-59.' }, { status: 400 });
    }

    if ((body.trayA || 0) + (body.trayB || 0) + (body.trayC || 0) + (body.trayD || 0) === 0) {
      return NextResponse.json({ error: 'At least one tray must have a pill count greater than 0.' }, { status: 400 });
    }

    const db = getDb();

    const count = db.prepare("SELECT COUNT(*) as count FROM schedules WHERE hour >= 0").get() as { count: number };
    if (count.count >= 10) {
      return NextResponse.json({ error: 'Maximum of 10 schedules allowed (firmware limit).' }, { status: 400 });
    }

    const result = db.prepare(
      "INSERT INTO schedules (hour, minute, tray_a, tray_b, tray_c, tray_d) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(body.hour, body.minute, body.trayA || 0, body.trayB || 0, body.trayC || 0, body.trayD || 0);

    const created = db.prepare('SELECT * FROM schedules WHERE id = ?').get(result.lastInsertRowid) as {
      id: number; hour: number; minute: number; tray_a: number; tray_b: number; tray_c: number; tray_d: number;
      enabled: number; created_at: string; updated_at: string;
    };

    const schedule: Schedule = {
      id: created.id, hour: created.hour, minute: created.minute,
      trayA: created.tray_a, trayB: created.tray_b, trayC: created.tray_c, trayD: created.tray_d,
      enabled: created.enabled === 1, createdAt: created.created_at, updatedAt: created.updated_at,
    };

    // Sync to ESP32
    await syncToDevice(db);

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error('Schedules POST error:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
