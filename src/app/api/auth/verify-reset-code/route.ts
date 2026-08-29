// src/app/api/auth/verify-reset-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { signGenericToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';

const verifyResetCodeSchema = z.object({
  email: z.email('Invalid email address').transform((val) => val.toLowerCase()),
  code: z.string().length(6, 'Code must be exactly 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = verifyResetCodeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, code } = validation.data;

    /*//10 attemps per 15 min
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(`verify-reset-code:ip:${ip}`, 10, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reset password attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '900' } }
      );
    }*/

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Security: Don't reveal if email exists
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Find the password reset record
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { userId: user.id },
    });

    if (!passwordReset) {
      return NextResponse.json(
        { error: 'No reset request found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if expired
    if (passwordReset.expiresAt < new Date()) {
      // Clean up expired record
      await prisma.passwordReset.delete({ where: { userId: user.id } });
      return NextResponse.json(
        { error: 'Code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

     if (passwordReset.attempts==6) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP' },
        { status: 429 }
      );
    }

    // Verify the code matches
    if (passwordReset.otp !== code) {
      // Increment attempts counter for security tracking
      await prisma.passwordReset.update({
        where: { userId: user.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json(
        { error: 'Invalid code. Please try again.' },
        { status: 400 }
      );
    }

    // Generate the short-lived JWT token
    const resetToken = await signGenericToken(
      { 
        userId: user.id, 
        email: user.email,
        purpose: 'PASSWORD_RESET' 
      },
      '5m' // 5 minutes expiry
    );

    // DELETE the reset record so it can't be reused (one-time-use)
    await prisma.passwordReset.delete({ where: { userId: user.id } });

    return NextResponse.json(
      {
        message: 'Code verified successfully',
        token: resetToken,
        redirectTo: '/auth/reset-password',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify reset code error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}