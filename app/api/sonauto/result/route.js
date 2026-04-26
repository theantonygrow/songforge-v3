import { NextResponse } from 'next/server';
import { callSonauto, extractSongPaths } from '@/app/lib/sonauto';

export async function GET(req) {
  try {
    const taskId = new URL(req.url).searchParams.get('taskId');
    if (!taskId) return NextResponse.json({ error: 'taskId is required.' }, { status: 400 });

    const raw = await callSonauto(`/generations/${encodeURIComponent(taskId)}`);
    const songPaths = extractSongPaths(raw);
    const audioUrl = songPaths[0] || null;
    return NextResponse.json({ audioUrl, songPaths, raw });
  } catch (err) {
    return NextResponse.json({ error: err.message, details: err.data || null }, { status: err.status || 500 });
  }
}
