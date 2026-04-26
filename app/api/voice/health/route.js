import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.VOICE_CONVERSION_API_URL && process.env.VOICE_CONVERSION_API_KEY),
    hasEndpoint: Boolean(process.env.VOICE_CONVERSION_API_URL),
    hasKey: Boolean(process.env.VOICE_CONVERSION_API_KEY),
  });
}
