import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
  }

  if (!request.body) {
    return NextResponse.json({ error: 'No body provided' }, { status: 400 });
  }

  const blob = await put(filename, request.body, {
    access: 'public',
  });

  // Create metadata record in Vercel KV
  const key = `blob:${uuidv4()}`;
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours in milliseconds
  await kv.set(key, { url: blob.url, expiresAt });

  // Return the original blob response to the client
  return NextResponse.json(blob);
}
