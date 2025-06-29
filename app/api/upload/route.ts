import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';
import path from 'path';

// Define the structure for our file metadata
export interface FileMetadata {
  id: string;
  originalName: string;
  blobUrl: string;
  pathname: string;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  uploadedAt: string;
  processedBlobUrl: string | null;
  extractedImages: any[] | null; // Consider a more specific type later
}


export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const originalName = searchParams.get('filename');

  if (!originalName) {
    return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
  }
  
  if (!request.body) {
    return NextResponse.json({ error: 'File body is required' }, { status: 400 });
  }
  
  const fileId = uuidv4();
  // Sanitize filename and create a unique path in the blob storage
  const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '');
  const blobPathname = `uploads/${fileId}/${sanitizedFilename}`;

  try {
    const blob = await put(blobPathname, request.body, {
      access: 'public',
      // We can add cache control headers if needed
      // cacheControl: 'public, max-age=31536000, immutable',
    });

    // Create the metadata object
    const metadata: FileMetadata = {
      id: fileId,
      originalName: originalName,
      blobUrl: blob.url,
      pathname: blob.pathname,
      status: 'uploaded',
      uploadedAt: new Date().toISOString(),
      processedBlobUrl: null,
      extractedImages: null,
    };

    // Use a transaction to ensure both operations succeed
    const multi = kv.multi();
    multi.set(`file:${fileId}`, metadata);
    multi.sadd('files', fileId);
    await multi.exec();

    // Return the full metadata object to the client
    return NextResponse.json(metadata, { status: 200 });

  } catch (error) {
    console.error('Error during file upload and metadata creation:', error);
    // @ts-ignore
    const message = error.message || 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to upload file.', details: message }, { status: 500 });
  }
}
