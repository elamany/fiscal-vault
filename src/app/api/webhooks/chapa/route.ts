import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch (error) {
    console.error('Failed to read webhook body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get('x-chapa-signature');
    if (signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error('Failed to parse webhook JSON:', error);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
  }

  const chapaPayload = payload as { tx_ref?: string; status?: string };
  const { tx_ref, status } = chapaPayload;

  if (!tx_ref || !status) {
    console.error('Missing required fields in webhook:', chapaPayload);
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  console.log(`Chapa webhook received: tx_ref=${tx_ref}, status=${status}`);

  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { transactionReference: tx_ref },
    });

    if (existingEvent && existingEvent.status === status) {
      console.log(`Webhook already processed: ${tx_ref} with status ${status}`);
      return NextResponse.json({ message: 'Webhook already processed' });
    }

    //  Cast payload to Prisma's accepted JSON type
    const jsonPayload = payload as Prisma.InputJsonValue;

    // Check if this is an Order payment (starts with "FV-ORD-")
    if (tx_ref.startsWith('FV-ORD-')) {
      await handleOrderWebhook(tx_ref, status, jsonPayload, existingEvent);
    } else {
      // Legacy invoice payment (for backward compatibility)
      await handleInvoiceWebhook(tx_ref, status, jsonPayload, existingEvent);
    }

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

// Explicitly define the type of an Order with its items
type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: {
          select: { tenantId: true; name: true; price: true };
        };
      };
    };
  };
}>;

async function handleOrderWebhook(
  txRef: string,
  status: string,
  payload: Prisma.InputJsonValue,
  existingEvent: { id: string; status: string } | null
) {
  const order = await prisma.order.findUnique({
    where: { chapaTxRef: txRef },
    include: {
      items: {
        include: {
          product: {
            select: { tenantId: true, name: true, price: true },
          },
        },
      },
    },
  }) as OrderWithItems | null;

  if (!order) {
    console.error(`Order not found for tx_ref: ${txRef}`);
    return;
  }

  if (order.status === 'EXPIRED') {
    console.log(` Order ${order.id} was already expired. Ignoring webhook.`);
    return;
  }

  let newStatus: 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING_PAYMENT';

  switch (status) {
    case 'success':
      newStatus = 'PAID';
      break;
    case 'failed':
      newStatus = 'FAILED';
      break;
    case 'cancelled':
      newStatus = 'CANCELLED';
      break;
    default:
      newStatus = 'PENDING_PAYMENT';
  }

  await prisma.$transaction(async (tx) => {
    if (existingEvent) {
      await tx.webhookEvent.update({
        where: { id: existingEvent.id },
        data: { status, rawPayload: payload, processedAt: new Date() },
      });
    } else {
      await tx.webhookEvent.create({
        data: {
          transactionReference: txRef,
          status,
          rawPayload: payload,
          processedAt: new Date(),
        },
      });
    }

    await tx.order.update({
      where: { id: order.id },
      data: { 
        status: newStatus,
        paidAt: newStatus === 'PAID' ? new Date() : null,
      },
    });

    if (newStatus === 'PAID') {
      // Stock is already reserved (decremented). Just create invoices.
      await splitOrderIntoSellerInvoices(tx, order);
    } 
    else if (newStatus === 'FAILED' || newStatus === 'CANCELLED') {
      // RELEASE STOCK: Read from OrderItem and increment product stock back
      const orderItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, quantity: true },
      });

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
      
      console.log(`Released reserved stock for cancelled/failed order ${order.id}`);
    }
  });

  console.log(`Order ${order.id} updated to status: ${newStatus}`);
}

async function splitOrderIntoSellerInvoices(
  tx: Prisma.TransactionClient,
  order: OrderWithItems
) {
    const itemsByTenant = new Map<string, typeof order.items>();
    type OrderItemType = OrderWithItems['items'][number];

  for (const orderItem of order.items) {
    const tenantId = orderItem.product.tenantId;
    if (!itemsByTenant.has(tenantId)) {
      itemsByTenant.set(tenantId, []);
    }
    itemsByTenant.get(tenantId)!.push(orderItem);
  }

  for (const [tenantId, tenantItems] of itemsByTenant.entries()) {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) continue;

    let totalAmount = 0;
    const invoiceItemsData = tenantItems.map((orderItem: OrderItemType) => {
      const unitPrice = Number(orderItem.product.price);
      const lineTotal = unitPrice * orderItem.quantity;
      totalAmount += lineTotal;

      return {
        productId: orderItem.productId,
        quantity: orderItem.quantity,
        unitPrice: unitPrice.toFixed(2),
      };
    });

    const invoiceNumber = `INV-${tenant.slug}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await tx.invoice.create({
      data: {
        tenantId: tenant.id,
        customerId: order.customerId,
        orderId: order.id,
        invoiceNumber,
        status: 'PAID',
        totalAmount: totalAmount.toFixed(2),
        items: { create: invoiceItemsData },
      },
    });

    console.log(`Created seller invoice for tenant ${tenant.name}: ${invoiceNumber}`);
  }
}

//  Added back for legacy invoice payments.
async function handleInvoiceWebhook(
  txRef: string,
  status: string,
  payload: Prisma.InputJsonValue,
  existingEvent: { id: string; status: string } | null
) {
  const invoice = await prisma.invoice.findUnique({
    where: { chapaTxRef: txRef },
  });

  if (!invoice) {
    console.error(`Invoice not found for tx_ref: ${txRef}`);
    return;
  }

  let newStatus: 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING_PAYMENT';

  switch (status) {
    case 'success':
      newStatus = 'PAID';
      break;
    case 'failed':
      newStatus = 'FAILED';
      break;
    case 'cancelled':
      newStatus = 'CANCELLED';
      break;
    default:
      newStatus = 'PENDING_PAYMENT';
  }

  await prisma.$transaction(async (tx) => {
    if (existingEvent) {
      await tx.webhookEvent.update({
        where: { id: existingEvent.id },
        data: { status, rawPayload: payload, processedAt: new Date() },
      });
    } else {
      await tx.webhookEvent.create({
        data: {
          transactionReference: txRef,
          status,
          rawPayload: payload,
          invoiceId: invoice.id,
          processedAt: new Date(),
        },
      });
    }

    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: newStatus },
    });
  });

  console.log(`Invoice ${invoice.id} updated to status: ${newStatus}`);
}