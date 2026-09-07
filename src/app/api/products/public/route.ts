import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenant');
    
    // Pagination params
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);
    const skip = (page - 1) * limit;

    //  Base where clause ensures ONLY active products are shown publicly
    const where: Prisma.ProductWhereInput = { 
      status: 'ACTIVE' 
    };

    // If a specific store slug is requested, add it to the filter
    if (tenantSlug) {
      where.tenant = { slug: tenantSlug };
    }

    // Fetch products and total count in parallel for performance
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          images: {
            select: { id: true, url: true, order: true },
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
      }),
      prisma.product.count({ where }),
    ]);

    const formattedProducts = products.map(product => {
      const owner = product.tenant.users[0]; // Get the first business owner
      
      return {
        id: product.id,
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
        }
      };
    });

    return NextResponse.json({ 
      products: formattedProducts, 
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount
      }
    });
  } catch (error) {
    console.error('Get public products error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}