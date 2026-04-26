import { NextResponse } from 'next/server';
import { callSonauto, normalizeStatus } from '../../../lib/sonauto';

export async function GET(req) {
  try {
    const taskId = new URL(req.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId is required.' }, { status: 400 });

    const raw = await callSonauto(`/generations/status/${encodeURIComponent(taskId)}`);
    return NextResponse.json({ status: normalizeStatus(raw), raw });
  } catch (err) {
    return NextResponse.json({ error: err.message, details: err.data || null }, { status: err.status || 500 });
  }
}
