import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Alert } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);

    const severity = searchParams.get('severity');
    const acknowledged = searchParams.get('acknowledged');

    let query = 'SELECT * FROM alerts';
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (severity) {
      conditions.push('severity = ?');
      values.push(severity);
    }

    if (acknowledged !== null) {
      conditions.push('acknowledged = ?');
      values.push(acknowledged === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const rows = db.prepare(query).all(...values) as {
      id: number; type: string; message: string; severity: string; acknowledged: number; created_at: string;
    }[];

    const alerts: Alert[] = rows.map(a => ({
      id: a.id,
      type: a.type as Alert['type'],
      message: a.message,
      severity: a.severity as Alert['severity'],
      acknowledged: a.acknowledged === 1,
      createdAt: a.created_at,
    }));

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Alerts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}
