import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { syncSchedulesToESP32 } from '@/lib/esp32';
import type { Schedule } from '@/lib/types';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (body.enabled !== undefined) {
      db.prepare("UPDATE schedules SET enabled = ?, updated_at = datetime('now') WHERE id = ?")
        .run(body.enabled ? 1 : 0, id);
    }

    if (body.hour !== undefined || body.minute !== undefined || body.trayA !== undefined) {
      const updates: string[] = [];
      const values: (number | string)[] = [];

      if (body.hour !== undefined) { updates.push('hour = ?'); values.push(body.hour); }
      if (body.minute !== undefined) { updates.push('minute = ?'); values.push(body.minute); }
      if (body.trayA !== undefined) { updates.push('tray_a = ?'); values.push(body.trayA); }
      if (body.trayB !== undefined) { updates.push('tray_b = ?'); values.push(body.trayB); }
      if (body.trayC !== undefined) { updates.push('tray_c = ?'); values.push(body.trayC); }
      if (body.trayD !== undefined) { updates.push('tray_d = ?'); values.push(body.trayD); }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        values.push(id);
        db.prepare(`UPDATE schedules SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }
    }

    const updated = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id) as {
      id: number; hour: number; minute: number; tray_a: number; tray_b: number; tray_c: number; tray_d: number;
      enabled: number; created_at: string; updated_at: string;
    };

    const schedule: Schedule = {
      id: updated.id, hour: updated.hour, minute: updated.minute,
      trayA: updated.tray_a, trayB: updated.tray_b, trayC: updated.tray_c, trayD: updated.tray_d,
      enabled: updated.enabled === 1, createdAt: updated.created_at, updatedAt: updated.updated_at,
    };

    // Sync to ESP32
    await syncToDevice(db);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Schedule PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);

    // Sync to ESP32
    await syncToDevice(db);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
