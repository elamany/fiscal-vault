import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { verifyChapaPayment } from '@/lib/chapa';

const verifySchema = z.object({
  txRef: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = verifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { txRef } = validation.data;

    // Find invoice with ownership check
    const invoice = await prisma.invoice.findFirst({
      where: {
        chapaTxRef: txRef,
        customerId: user.id,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Verify payment status directly with Chapa
    try {
      const verification = await verifyChapaPayment(txRef);

      // Map Chapa status to our status
      let newStatus: 'PAID' | 'FAILED' | 'PENDING_PAYMENT';
      
      if (verification.data.status === 'success') {
        newStatus = 'PAID';
      } else if (verification.data.status === 'failed') {
        newStatus = 'FAILED';
      } else {
        newStatus = 'PENDING_PAYMENT';
      }

      // Update invoice if status changed
      if (invoice.status !== newStatus) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus },
        });
      }

      return NextResponse.json({
        status: newStatus,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        message: newStatus === 'PAID' 
          ? 'Payment confirmed successfully' 
          : `Payment status: ${newStatus}`,
      });
    } catch (chapaError) {
      console.error('Chapa verification error:', chapaError);
      
      // If Chapa verification fails, return current invoice status
      return NextResponse.json({
        status: invoice.status,
        invoiceId: invoice.id,
        message: 'Unable to verify with Chapa. Showing current status.',
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}