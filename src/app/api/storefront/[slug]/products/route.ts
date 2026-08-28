import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPublicStorefront } from '@/lib/tenant';
/**
 * GET /api/storefront/:slug/products
 * PUBLIC endpoint - anyone can view a store's products
 * This is what customers see when browsing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const tenant = await getPublicStorefront(slug);

    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        images: {
          orderBy: { order: 'asc' },
          select: { id: true, url: true, order: true },
        },
      },
    });

    return NextResponse.json({
      store: { name: tenant.name, slug: tenant.slug },
      products,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Storefront error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}