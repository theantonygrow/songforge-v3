import { NextResponse } from 'next/server';
import { callSonauto, extractTaskId } from '../../../lib/sonauto';

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.prompt && !body.lyrics) {
      return NextResponse.json({ error: 'Prompt or lyrics are required.' }, { status: 400 });
    }

    const payload = {
      prompt: body.prompt || undefined,
      lyrics: body.lyrics || undefined,
      tags: body.tags || undefined,
      instrumental: Boolean(body.instrumental),
      prompt_strength: typeof body.prompt_strength === 'number' ? body.prompt_strength : undefined,
      output_format: body.output_format || 'mp3',
      enable_streaming: false,
      stream_format: 'mp3',
      align_lyrics: true,
    };

    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    const raw = await callSonauto('/generations/v3', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const taskId = extractTaskId(raw);
    if (!taskId) {
      return NextResponse.json({ error: 'Provider did not return task_id.', raw }, { status: 502 });
    }

    return NextResponse.json({ taskId, raw });
  } catch (err) {
    return NextResponse.json({ error: err.message, details: err.data || null }, { status: err.status || 500 });
  }
}
