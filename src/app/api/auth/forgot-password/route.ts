// src/app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { generateOTP } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Rate limit: Max 10 forgot password attempts per IP per hour
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(`forgot-password:${ip}`, 10, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }

    // Find user (always return success to prevent email enumeration)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Delete any existing password reset records
      await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

      // Generate OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Save to database
      await prisma.passwordReset.create({
        data: {
          email,
          otp,
          expiresAt,
          lastSentAt: new Date(),
          userId: user.id,
        },
      });

      // Send email
      await sendOTPEmail(email, otp, 'password-reset');
    }

    // Always return success (prevents email enumeration)
    return NextResponse.json({
      message: 'If an account exists with this email, a password reset code has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}