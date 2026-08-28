// src/app/api/auth/verification-status/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { getCooldownSecondsRemaining, isOTPExpired } from '@/lib/otp';
import { z } from 'zod';

const emailCheck = z.object({
  email: z.email('Invalid email address').transform((val) => val.toLowerCase()),
  });
export async function GET() {
  try {
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('verification_email')?.value;

    // No cookie found
    if (!emailFromCookie) {
      return NextResponse.json(
        { 
          status: 'no_session',
          message: 'No verification session found. Please register to receive a verification code.'
        },
        { status: 404 }
      );
    }
     const validation = emailCheck.safeParse({ email: emailFromCookie });
    if (!validation.success) {
      return NextResponse.json(
        { 
          status: 'invalid_cookie',
          message: 'Invalid verification session. Please register again.' 
        },
        { status: 400 }
      );
    }

    const safeEmail = validation.data.email;
    // Look up the actual verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { email: safeEmail },
    });

    // Cookie exists but no verification record (expired or cleared)
    if (!verification) {
      return NextResponse.json(
        { 
          status: 'expired',
          message: 'Your verification session has expired. Please register again.',
          email: safeEmail // Return the email from cookie for display
        },
        { status: 410 }
      );
    }

    // Check if OTP has expired
    if (isOTPExpired(verification.expiresAt)) {
      return NextResponse.json(
        { 
          status: 'otp_expired',
          message: 'Your verification code has expired. Please request a new one.',
          email: verification.email,
          canResend: true
        },
        { status: 410 }
      );
    }

    // Everything is valid
    const cooldownSeconds = getCooldownSecondsRemaining(verification.lastSentAt);

    return NextResponse.json({
      status: 'active',
      email: verification.email, 
      cooldownSeconds: Math.max(0, cooldownSeconds),
      expiresAt: verification.expiresAt,
      canResend: cooldownSeconds === 0,
    });
  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}