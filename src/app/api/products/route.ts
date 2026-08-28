import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireBusinessOwner } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().max(2000).optional(),
  price: z.number().positive('Price must be positive'),
  imageUrls: z.array(z.url('Must be a valid URL')).max(10).optional(), 
});

/**
 * GET /api/products
 * Business owner: Returns THEIR products only
 * Customer: Not allowed (should use public storefront endpoint)
 */
export async function GET() {
  try {
    const user = await requireBusinessOwner();

    const products = await prisma.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        images: {
          orderBy: { order: 'asc' },
          select: { id: true, url: true, order: true },
        },
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Business owner: Creates a product in THEIR tenant
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireBusinessOwner();

    //upto 150 posts per hour
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(
      `create-product:${ip}-${user.id}`,
      150,
      60 * 60 * 1000
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many product creations. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }

    const body = await request.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, price, imageUrls } = validation.data;

    // Create product with images in a transaction
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          description,
          price: price.toFixed(2),
          tenantId: user.tenantId!,
        },
      });

      // If images provided, create them
      if (imageUrls && imageUrls.length > 0) {
        await tx.productImage.createMany({
          data: imageUrls.map((url, index) => ({
            productId: newProduct.id,
            url,
            order: index, // First image is order 0 (main image)
          })),
        });
      }

      // Return product with images
      return tx.product.findUnique({
        where: { id: newProduct.id },
        include: {
          images: {
            orderBy: { order: 'asc' },
            select: { id: true, url: true, order: true },
          },
        },
      });
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}