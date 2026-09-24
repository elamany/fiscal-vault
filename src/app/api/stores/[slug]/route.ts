// src/app/api/stores/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
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
        },
        products: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stock: true,
            images: {
              select: { id: true, url: true, order: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 12,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    const owner = tenant.users[0];

    const formattedStore = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Store Owner',
      products: tenant.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        stock: p.stock,
        images: p.images,
      })),
    };

    return NextResponse.json({ store: formattedStore }, { status: 200 });
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch store' },
      { status: 500 }
    );
  }
}