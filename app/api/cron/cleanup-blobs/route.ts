import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { del } from '@vercel/blob';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  let deletedCount = 0;
  let cursor = 0;
  const now = Date.now();

  try {
    do {
      const [nextCursor, keys] = await kv.scan(cursor, { match: '*:*' });
      cursor = nextCursor;

      for (const key of keys) {
        try {
          const value = await kv.get<{ url: string; expiresAt: number }>(key);

          if (value && value.expiresAt && now > value.expiresAt) {
            await del(value.url);
            await kv.del(key);
            deletedCount++;
            console.log(`Deleted expired blob and KV key: ${key} (URL: ${value.url})`);
          }
        } catch (error) {
          console.error(`Error processing key ${key}:`, error);
        }
      }
    } while (cursor !== 0);

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Cron job for cleanup failed:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
} 