import { NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

// This cron job is configured to run once a day at midnight UTC.
// 0 0 * * *
// Adjust the schedule in vercel.json

export async function GET() {
  // Set the threshold to 24 hours ago
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  try {
    const { blobs } = await list();
    // Filter blobs that were uploaded more than 24 hours ago
    const oldBlobs = blobs.filter(blob => new Date(blob.uploadedAt) < oneDayAgo);
    
    if (oldBlobs.length === 0) {
      return NextResponse.json({ message: 'No old blobs to delete.' });
    }

    // Extract URLs of old blobs to be deleted
    const deletedBlobUrls = oldBlobs.map(blob => blob.url);
    await del(deletedBlobUrls);

    return NextResponse.json({ message: `Deleted ${deletedBlobUrls.length} old blobs.` });
  } catch (error) {
    console.error('Error cleaning up blobs:', error);
    if (error instanceof Error) {
        return new Response(error.message, { status: 500 });
    }
    return new Response('An unknown error occurred.', { status: 500 });
  }
} 