import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const mergeSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).max(50),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validation = mergeSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid cart items' },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    if (items.length === 0) {
      return NextResponse.json({ message: 'No items to merge' }, { status: 200 });
    }

    // Verify all products exist and are active
    const products = await prisma.product.findMany({
      where: {
        id: { in: items.map(i => i.productId) },
        status: 'ACTIVE',
      },
      select: { id: true, stock: true },
    });

    const validProductIds = new Set(products.map(p => p.id));
    const validItems = items.filter(i => validProductIds.has(i.productId));

    if (validItems.length === 0) {
      return NextResponse.json({ message: 'No valid items to merge' }, { status: 200 });
    }

    // Get or create the user's cart
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
        include: { items: true },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const guestItem of validItems) {
        const existingItem = cart!.items.find(i => i.productId === guestItem.productId);
        
        if (existingItem) {
          // REPLACE the quantity with the guest quantity (instead of adding them)
          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: guestItem.quantity }, 
          });
        } else {
          // New item: create it
          await tx.cartItem.create({
            data: {
              cartId: cart!.id,
              productId: guestItem.productId,
              quantity: guestItem.quantity,
            },
          });
        }
      }

      // Return the updated cart
      return await tx.cart.findUnique({
        where: { id: cart!.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { order: 'asc' } },
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json({ cart: result }, { status: 200 });
  } catch (error) {
    console.error('Cart merge error:', error);
    return NextResponse.json(
      { error: 'Failed to merge cart' },
      { status: 500 }
    );
  }
}