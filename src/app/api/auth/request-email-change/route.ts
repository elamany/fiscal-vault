// src/app/api/auth/request-email-change/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({ 
  newEmail: z.string().email('Invalid email address') 
});

const COOLDOWN_MINUTES = 2;

export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { newEmail } = schema.parse(body);

    if (newEmail === authUser.email) {
      return NextResponse.json({ error: 'New email must be different' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'This email is already in use' }, { status: 400 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const lastSentAt = new Date();

    const existingVerification = await prisma.emailVerification.findFirst({
      where: { email: newEmail, userId: authUser.id },
    });

    if (existingVerification) {
      const timeSinceLastSent = Date.now() - existingVerification.lastSentAt.getTime();
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
      
      if (timeSinceLastSent < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSent) / 1000);
        return NextResponse.json(
          { error: 'Cooldown active', remainingSeconds },
          { status: 429 }
        );
      }

      await prisma.emailVerification.update({
        where: { id: existingVerification.id },
        data: {
          otp,
          expiresAt,
          lastSentAt,
          attempts: 0,
        },
      });
    } else {
      await prisma.emailVerification.create({
        data: {
          email: newEmail,
          otp,
          expiresAt,
          lastSentAt,
          attempts: 0,
          userId: authUser.id,
        },
      });
    }

    try {
      await sendOTPEmail(newEmail, otp, 'verification');
    } catch (emailError) {
      console.error('Failed to send OTP email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'OTP sent to new email' }, { status: 200 });
  } catch (error) {
    console.error('Request email change error:', error);
    return NextResponse.json({ error: 'Failed to request email change' }, { status: 500 });
  }
}