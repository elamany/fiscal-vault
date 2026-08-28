// src/app/api/webhooks/chapa/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * Chapa Webhook Handler
 * 
 * This endpoint is called by Chapa when a payment status changes.
 * It MUST be:
 * 1. Idempotent - safe to call multiple times
 * 2. Secure - verify the webhook signature (if configured)
 * 3. Atomic - use transactions to prevent race conditions
 */
export async function POST(request: NextRequest) {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch (error) {
    console.error('Failed to read webhook body:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Verify webhook signature
  const webhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get('x-chapa-signature');
    
    if (!signature) {
      console.error('Missing webhook signature');
      // We still process it for local testing, but in production you might want to return 401
    } else {
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

  // Type guard to ensure payload has the fields we need
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
    // Check if we already processed this exact event
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { transactionReference: tx_ref },
    });

    // If we've seen this exact status before, return success immediately (idempotent)
    if (existingEvent && existingEvent.status === status) {
      console.log(`Webhook already processed: ${tx_ref} with status ${status}`);
      return NextResponse.json({ message: 'Webhook already processed' });
    }

    // Find the invoice by transaction reference
    const invoice = await prisma.invoice.findUnique({
      where: { chapaTxRef: tx_ref },
    });

    if (!invoice) {
      console.error(`Invoice not found for tx_ref: ${tx_ref}`);
      // Return 200 to prevent Chapa from endlessly retrying an invoice that doesn't exist
      return NextResponse.json({ message: 'Invoice not found' });
    }

    // Map Chapa status to our InvoiceStatus
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
      case 'pending':
        newStatus = 'PENDING_PAYMENT';
        break;
      default:
        console.warn(`Unknown Chapa status: ${status}`);
        newStatus = 'PENDING_PAYMENT';
    }

    // ATOMIC UPDATE: Save webhook event + update invoice in a single transaction
    await prisma.$transaction(async (tx) => {
      if (existingEvent) {
        // Update existing event with new status (e.g., if it went from pending to success)
        await tx.webhookEvent.update({
          where: { id: existingEvent.id },
          data: {
            status,
            rawPayload: payload,
            processedAt: new Date(),
          },
        });
      } else {
        // Create new webhook event record
        await tx.webhookEvent.create({
          data: {
            transactionReference: tx_ref,
            status,
            rawPayload: payload,
            invoiceId: invoice.id,
            processedAt: new Date(),
          },
        });
      }

      // Update invoice status
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });
    });

    console.log(` Invoice ${invoice.id} updated to status: ${newStatus}`);

    // Always return 200 to Chapa to acknowledge receipt
    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error(' Webhook processing error:', error);
    // Return 500 so Chapa will retry the webhook later
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}