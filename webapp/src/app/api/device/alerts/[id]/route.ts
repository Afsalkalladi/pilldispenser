import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = getDb();

    const existing = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);
    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (body.acknowledged !== undefined) {
      db.prepare('UPDATE alerts SET acknowledged = ? WHERE id = ?')
        .run(body.acknowledged ? 1 : 0, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alert PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
