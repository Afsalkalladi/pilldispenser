import { NextRequest, NextResponse } from 'next/server';
import { manualDispenseESP32 } from '@/lib/esp32';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const trayA = body.trayA || 0;
    const trayB = body.trayB || 0;
    const trayC = body.trayC || 0;
    const trayD = body.trayD || 0;

    if (trayA + trayB + trayC + trayD === 0) {
      return NextResponse.json({ error: 'At least one tray must have pills to dispense.' }, { status: 400 });
    }

    // Forward manual dispense command to ESP32
    const result = await manualDispenseESP32({ trayA, trayB, trayC, trayD });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'ESP32 manual dispense failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Manual dispense initiated' });
  } catch (error) {
    console.error('Manual dispense error:', error);
    return NextResponse.json({ error: 'Failed to initiate manual dispense. Is ESP32 connected?' }, { status: 500 });
  }
}
