import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireBusinessOwner } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

// Validation schema
const uploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().refine(
    (type) => ['image/jpeg', 'image/png', 'image/webp'].includes(type),
    { message: 'Only JPEG, PNG, and WebP images are allowed' }
  ),
});

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await requireBusinessOwner();

    /*// Rate limit: Max 120 uploads per hour per user
    const rateLimit = await checkRateLimit(
      `upload:${user.id}`,
      120,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }*/

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validation = uploadSchema.safeParse({
      fileName: file.name,
      contentType: file.type,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid file type', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.tenantId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Convert File to Buffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path);

    return NextResponse.json({
      message: 'Image uploaded successfully',
      url: urlData.publicUrl,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}