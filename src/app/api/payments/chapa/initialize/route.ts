import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { initializeChapaPayment } from '@/lib/chapa';
import { checkRateLimit } from '@/lib/rate-limit';

// ✅ THIS IS THE CORRECT SCHEMA FOR CHAPA INITIALIZATION
const initializeSchema = z.object({
  invoiceId: z.cuid2(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    /*const rateLimit = await checkRateLimit(`chapa-init:${user.id}`, 5, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many payment attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }*/

    const body = await request.json();
    
    // This validation will now correctly look for 'invoiceId', not 'items'
    const validation = initializeSchema.safeParse(body);

    if (!validation.success) {
        const errors = validation.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));

        return NextResponse.json(
            { error: 'Invalid input', details: { fieldErrors: errors } },
            { status: 400 }
        );
        }

    const { invoiceId } = validation.data;

    // Fetch invoice with strict ownership check
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, customerId: user.id },
      include: { 
        tenant: true, 
        customer: { select: { email: true } } 
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'DRAFT' && invoice.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: `Cannot pay invoice with status: ${invoice.status}` }, { status: 400 });
    }

    const txRef = `FV-${invoice.id}-${Date.now()}`;

    // Use user.email directly. Derive safe names from email.
    const [firstNamePart, ...lastNameParts] = user.email.split('@')[0].split(/\.|_/);
    const firstName = firstNamePart || 'Customer';
    const lastName = lastNameParts.join(' ') || 'Customer';

    // Initialize Chapa payment
    const amountToPay=Number(invoice.totalAmount).toFixed(2);
    const chapaResponse = await initializeChapaPayment({
      amount: amountToPay,
      currency: 'ETB',
      email: user.email,
      firstName,
      lastName,
      txRef,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chapa`,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?txRef=${txRef}`,
      customization: {
        title: "FiscalVault Payment".replace(/[^a-zA-Z0-9 \-_.]/g, '') 
          .substring(0, 16), 
        /*invoice.tenant.name
          .replace(/[^a-zA-Z0-9 \-_.]/g, '') 
          .substring(0, 16) || 'FiscalVault',*/ 
        description: `Pay ${amountToPay.substring(0, 20)} ETB`.replace(/[^a-zA-Z0-9 \-_.]/g, ''),
      },
    });

    // Safely check if chapaResponse.data exists before accessing it
    if (!chapaResponse.data || !chapaResponse.data.checkout_url) {
      console.error('Chapa initialization failed:', chapaResponse);
      return NextResponse.json(
        { error: 'Failed to initialize payment with Chapa. Please try again.' },
        { status: 502 }
      );
    }

    // Save Chapa reference to invoice
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        chapaTxRef: txRef,
        chapaCheckoutUrl: chapaResponse.data.checkout_url,
        status: 'PENDING_PAYMENT',
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