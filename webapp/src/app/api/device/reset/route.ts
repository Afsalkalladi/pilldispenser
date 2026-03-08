import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { resetESP32 } from '@/lib/esp32';

export async function POST() {
  try {
    // Forward reset command to ESP32
    const result = await resetESP32();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ESP32 reset failed' },
        { status: 400 }
      );
    }

    // Update local DB state to match
    const db = getDb();
    db.prepare(
      "UPDATE device_state SET state = 'STANDBY', state_entered_at = datetime('now'), pending_schedule_id = NULL, updated_at = datetime('now') WHERE id = 1"
    ).run();

    return NextResponse.json({ success: true, message: 'Device reset to STANDBY' });
  } catch (error) {
    console.error('Reset API error:', error);
    return NextResponse.json({ error: 'Failed to reset device. Is ESP32 connected?' }, { status: 500 });
  }
}
