import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireBusinessOwner } from '@/lib/auth';
import { z } from 'zod';

const querySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(10).default(5),
});

export async function GET(request: NextRequest) {
  try {
    const user = await requireBusinessOwner();
    const { searchParams } = new URL(request.url);

    const validation = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!validation.success) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    const { q, limit } = validation.data;

    // Fetch only product names that match the query
    const products = await prisma.product.findMany({
      where: {
        tenantId: user.tenantId,
        name: { contains: q, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const suggestions = products.map((p) => ({
      id: p.id,
      name: p.name,
    }));

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}