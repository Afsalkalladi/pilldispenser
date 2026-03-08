import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { refillTrayESP32 } from '@/lib/esp32';
import type { TrayStatus } from '@/lib/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM trays WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Tray not found' }, { status: 404 });
    }

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.pillCount !== undefined) { updates.push('pill_count = ?'); values.push(body.pillCount); }
    if (body.label !== undefined) { updates.push('label = ?'); values.push(body.label); }
    if (body.capacity !== undefined) { updates.push('capacity = ?'); values.push(body.capacity); }
    if (body.lowThreshold !== undefined) { updates.push('low_threshold = ?'); values.push(body.lowThreshold); }

    // Handle refill action - also send to ESP32
    if (body.refill) {
      const tray = db.prepare('SELECT capacity FROM trays WHERE id = ?').get(id) as { capacity: number };
      updates.push('pill_count = ?');
      values.push(tray.capacity);

      // Forward refill to ESP32
      try {
        await refillTrayESP32(id);
      } catch (err) {
        console.error('ESP32 refill error:', err);
        // Continue with local DB update even if ESP32 is unreachable
      }
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(id as string);
      db.prepare(`UPDATE trays SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM trays WHERE id = ?').get(id) as {
      id: string; label: string; pill_count: number; capacity: number; low_threshold: number;
    };

    const tray: TrayStatus = {
      id: updated.id as 'A' | 'B' | 'C' | 'D',
      label: updated.label,
      pillCount: updated.pill_count,
      capacity: updated.capacity,
      lowThreshold: updated.low_threshold,
      isLow: updated.pill_count <= updated.low_threshold,
    };

    return NextResponse.json(tray);
  } catch (error) {
    console.error('Tray PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update tray' }, { status: 500 });
  }
}
