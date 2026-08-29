import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateOTP } from '@/lib/otp';
import { getCooldownSecondsRemaining } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.email('Invalid email address').transform((val) => val.toLowerCase()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Rate limit: 10 attempts per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(`forgot-password:ip:${ip}`, 10, 15 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '900' } }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Security: Don't reveal if email exists
    if (!user) {
      return NextResponse.json(
        { 
          message: 'If an account exists with this email, a reset code has been sent.' 
        },
        { status: 200 }
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first before resetting password.' },
        { status: 400 }
      );
    }

    // Check if there's an existing reset request with cooldown
    const existingReset = await prisma.passwordReset.findUnique({
      where: { userId: user.id },
    });

    if (existingReset) {
      const cooldownSeconds = getCooldownSecondsRemaining(existingReset.lastSentAt);
      if (cooldownSeconds > 0) {
        return NextResponse.json(
          { 
            error: 'A reset code was recently sent. Please wait before requesting another.',
            cooldownSeconds 
          },
          { status: 429 }
        );
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.passwordReset.upsert({
      where: { userId: user.id },
      update: {
        otp,
        expiresAt,
        lastSentAt: new Date(),
        attempts: 0, 
      },
      create: {
        email,
        otp,
        expiresAt,
        lastSentAt: new Date(),
        userId: user.id,
        attempts: 0,
      },
    });

    // Send email
    await sendOTPEmail(email, otp, 'password-reset');

    const response = NextResponse.json(
      {
        message: 'Reset code sent to your email.',
        redirectTo: '/auth/verify-reset-code',
      },
      { status: 200 }
    );

    // Set secure cookie
    response.cookies.set('reset_email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}