import { NextRequest, NextResponse } from 'next/server';
import { syncTimeESP32 } from '@/lib/esp32';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Use provided time or current time
    const now = body.time ? new Date(body.time) : new Date();

    const timeData = {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };

    // Forward sync-time command to ESP32
    const result = await syncTimeESP32(timeData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ESP32 time sync failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Device clock synced', time: now.toISOString() });
  } catch (error) {
    console.error('Sync time error:', error);
    return NextResponse.json({ error: 'Failed to sync device clock. Is ESP32 connected?' }, { status: 500 });
  }
}
