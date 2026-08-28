// src/app/api/invoices/route.ts
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

// auto-groups by tenant
const createInvoiceSchema = z.object({
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

    /*const rateLimit = await checkRateLimit(`create-invoice:${user.id}`, 10, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many invoice creations. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }*/

    let body = {};
    try {
      body = await request.json();
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or empty request body.' },
        { status: 400 }
      );
    }

    const validation = createInvoiceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = validation.data;

    // Fetch all products in ONE query (includes tenant info)
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      include: { tenant: true },
    });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: 'One or more products are invalid or no longer available' },
        { status: 400 }
      );
    }

    // Group items by tenantId to handle multi-business carts
    const itemsByTenant = new Map<string, typeof items>();
    
    for (const cartItem of items) {
      const product = products.find((p) => p.id === cartItem.productId);
      if (product) {
        if (!itemsByTenant.has(product.tenantId)) {
          itemsByTenant.set(product.tenantId, []);
        }
        itemsByTenant.get(product.tenantId)!.push(cartItem);
      }
    }

    //  Strictly type the array
    type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
      include: {
        items: {
          include: {
            product: {
              select: { id: true; name: true; price: true };
            };
          };
        };
        tenant: {
          select: { id: true; name: true; slug: true };
        };
      };
    }>;

    const createdInvoices: InvoiceWithDetails[] = [];

    // Create one invoice per tenant in a single atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const [tenantId, tenantItems] of itemsByTenant.entries()) {
        const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) continue;

        let totalAmount = 0;
        const invoiceItemsData = tenantItems.map((cartItem) => {
          const product = products.find((p) => p.id === cartItem.productId)!;
          const unitPrice = Number(product.price);
          totalAmount += unitPrice * cartItem.quantity;

          return {
            productId: product.id,
            quantity: cartItem.quantity,
            unitPrice: unitPrice.toFixed(2),
          };
        });

        // Unique invoice number per tenant
        const invoiceNumber = `INV-${tenant.slug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const invoice = await tx.invoice.create({
          data: {
            tenantId,
            customerId: user.id,
            invoiceNumber,
            status: 'DRAFT',
            totalAmount: totalAmount.toFixed(2),
            items: { create: invoiceItemsData },
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, price: true } } } },
            tenant: { select: { id: true, name: true, slug: true } },
          },
        });

        createdInvoices.push(invoice);
      }
    });

    return NextResponse.json(
      {
        message: `Successfully created ${createdInvoices.length} invoice(s)`,
        invoices: createdInvoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          status: inv.status,
          totalAmount: inv.totalAmount,
          tenant: inv.tenant,
          items: inv.items,
        })),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}