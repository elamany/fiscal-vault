import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Only fetch ACTIVE products for the public
    const product = await prisma.product.findFirst({
      where: {
        id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        images: {
          select: { 
            id: true, 
            url: true, 
            order: true 
          },
          orderBy: { order: 'asc' },
        },
        tenant: {
          select: { 
            id: true, 
            name: true, 
            slug: true,
            users: {
              where: { role: 'BUSINESS_OWNER' },
              select: {
                firstName: true,
                lastName: true,
              },
              take: 1,
            }
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const owner = product.tenant.users[0];

    const formattedProduct = {
      id: product.id,
      tenantId: product.tenant.id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      images: product.images,
      tenant: {
        id: product.tenant.id,
        name: product.tenant.name,
        slug: product.tenant.slug,
        ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Store Owner',
      },
    };

    return NextResponse.json({ product: formattedProduct }, { status: 200 });
  } catch (error) {
    console.error('Get public product detail error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}