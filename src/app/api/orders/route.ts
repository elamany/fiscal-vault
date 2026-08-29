import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { Prisma } from '@/generated/prisma/client';

const cartItemSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive(),
});

const createOrderSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart must have at least one item'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to checkout.' },
        { status: 401 }
      );
    }

    /* 100 orders per hour
    const rateLimit = await checkRateLimit(`create-order:${user.id}`, 100, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many order creations. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }*/

    let body = {};
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or empty request body....' },
        { status: 400 }
      );
    }

    const validation = createOrderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Fetch all products with tenant info AND stock
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { 
        tenant: true,
        // stock is selected by default, but being explicit is good
      },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: 'One or more products are invalid or no longer available' },
        { status: 400 }
      );
    }

    // Validate stock availability for ALL items BEFORE doing anything
    for (const cartItem of items) {
      const product = products.find((p) => p.id === cartItem.productId)!;
      
      if (product.stock < cartItem.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${product.name}". Only ${product.stock} available.` },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItemsData = items.map((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId)!;
      const unitPrice = Number(product.price);
      totalAmount += unitPrice * cartItem.quantity;

      return {
        productId: product.id,
        quantity: cartItem.quantity,
        unitPrice: unitPrice.toFixed(2),
      };
    });

    // ATOMIC TRANSACTION: Decrement stock AND create order together
    // If any part fails, the entire transaction rolls back (stock is not lost)
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock for each product
      for (const cartItem of items) {
        await tx.product.update({
          where: { id: cartItem.productId },
          data: { stock: { decrement: cartItem.quantity } },
        });
      }

      // Create the master order with all items
      return await tx.order.create({
        data: {
          customerId: user.id,
          totalAmount: totalAmount.toFixed(2),
          status: 'PENDING_PAYMENT',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, tenantId: true },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        message: 'Order created successfully and stock reserved',
        order: {
          id: order.id,
          totalAmount: order.totalAmount,
          status: order.status,
          itemCount: order.items.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}