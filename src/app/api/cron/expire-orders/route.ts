import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * CRON ENDPOINT: Expires abandoned orders and releases reserved stock.
 * 
 * Should be called every 5 minutes by:
 * - Vercel Cron (if deployed on Vercel)
 * - External cron service (cron-job.org, easycron.com)
 * - Or manually via admin panel
 * 
 * SECURITY: In production, protect this with a CRON_SECRET header
 */
export async function GET(request: NextRequest) {
  // Optional: Verify this is a legitimate cron request
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Find all expired PENDING_PAYMENT orders
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING_PAYMENT',
        expiresAt: {
          lte: new Date(), // expiresAt is in the past
        },
      },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
          },
        },
      },
    });

    if (expiredOrders.length === 0) {
      return NextResponse.json({ 
        message: 'No expired orders found',
        expiredCount: 0 
      });
    }

    console.log(` Found ${expiredOrders.length} expired order(s) to process`);

    let totalReleased = 0;

    // Process each expired order
    for (const order of expiredOrders) {
      await prisma.$transaction(async (tx) => {
        // Release stock for each item
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          totalReleased += item.quantity;
        }

        // Mark order as EXPIRED
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'EXPIRED' },
        });

        console.log(` Expired order ${order.id} and released ${order.items.length} item(s)`);
      });
    }

    return NextResponse.json({
      message: 'Expired orders processed successfully',
      expiredCount: expiredOrders.length,
      totalStockReleased: totalReleased,
    });
  } catch (error) {
    console.error(' Expire orders cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process expired orders' },
      { status: 500 }
    );
  }
}