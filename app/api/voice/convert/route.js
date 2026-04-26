import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const providerUrl = process.env.VOICE_CONVERSION_API_URL;
    const providerKey = process.env.VOICE_CONVERSION_API_KEY;

    if (!providerUrl || !providerKey) {
      return NextResponse.json({
        error: 'Voice conversion provider is not configured.',
        message: 'Add VOICE_CONVERSION_API_URL and VOICE_CONVERSION_API_KEY in Vercel Environment Variables to enable real My Voice conversion.',
      }, { status: 501 });
    }

    if (!body.audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required.' }, { status: 400 });
    }

    // Generic provider adapter. Change field names here to match your chosen voice conversion service.
    const response = await fetch(providerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_audio_url: body.audioUrl,
        voice_name: body.voiceName || 'My Voice',
        voice_sample_name: body.voiceFileName || undefined,
        language: body.language || 'Russian',
        output_format: 'mp3',
      }),
    });

    const raw = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: raw.error || 'Voice conversion failed.', raw }, { status: response.status });
    }

    const convertedAudioUrl = raw.convertedAudioUrl || raw.audioUrl || raw.output_url || raw.result_url || raw.url || null;
    if (!convertedAudioUrl) {
      return NextResponse.json({ error: 'Provider did not return converted audio URL.', raw }, { status: 502 });
    }

    return NextResponse.json({ convertedAudioUrl, raw });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
