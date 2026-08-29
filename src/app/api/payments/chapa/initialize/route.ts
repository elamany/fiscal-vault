import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { initializeChapaPayment } from '@/lib/chapa';
//import { checkRateLimit } from '@/lib/rate-limit';

const initializeSchema = z.object({
  orderId: z.cuid2(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }


    const body = await request.json();
    const validation = initializeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { orderId } = validation.data;

    // Fetch order with strict ownership check
    const order = await prisma.order.findFirst({
      where: { id: orderId, customerId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: { tenantId: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: `Cannot pay order with status: ${order.status}` }, { status: 400 });
    }

    const txRef = `FV-ORD-${order.id}-${Date.now()}`;

    const [firstNamePart, ...lastNameParts] = user.email.split('@')[0].split(/\.|_/);
    const firstName = firstNamePart || 'Customer';
    const lastName = lastNameParts.join(' ') || 'Customer';

    // Initialize Chapa payment for the entire order
    const chapaResponse = await initializeChapaPayment({
      amount: Number(order.totalAmount).toFixed(2),
      currency: 'ETB',
      email: user.email,
      firstName,
      lastName,
      txRef,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chapa`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?txRef=${txRef}`,
      customization: {
        title: 'FiscalVault Order'.substring(0, 12),
        description: `Order ${order.id.substring(0, 12)}`,
      },
    });

    if (!chapaResponse.data || !chapaResponse.data.checkout_url) {
      console.error('Chapa initialization failed:', chapaResponse);
      return NextResponse.json(
        { error: 'Failed to initialize payment with Chapa. Please try again.' },
        { status: 502 }
      );
    }

    // Save Chapa reference to order
    await prisma.order.update({
      where: { id: order.id },
      data: {
        chapaTxRef: txRef,
        chapaCheckoutUrl: chapaResponse.data.checkout_url,
      },
    });

    return NextResponse.json({
      message: 'Payment initialized successfully',
      checkoutUrl: chapaResponse.data.checkout_url,
      txRef,
    });
  } catch (error) {
    console.error('Chapa initialization error:', error);
    return NextResponse.json({ error: 'Failed to initialize payment. Please try again.' }, { status: 500 });
  }
}