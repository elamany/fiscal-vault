// src/app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { isOTPExpired } from '@/lib/otp';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

const resetPasswordSchema = z.object({
  email: z.email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, otp, newPassword } = validation.data;

    // Rate limit: Max 6 OTP guess attempts per email
    const rateLimit = await checkRateLimit(`reset-password:${email}`, 6, 10 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '600' } }
      );
    }

    // Find reset record
    const reset = await prisma.passwordReset.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' }, // Get the latest one
    });

    if (!reset) {
      return NextResponse.json(
        { error: 'No password reset request found' },
        { status: 404 }
      );
    }

    // Check if OTP has expired
    if (isOTPExpired(reset.expiresAt)) {
      await prisma.passwordReset.delete({ where: { id: reset.id } });
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    // Verify OTP
    if (reset.otp !== otp) {
      await prisma.passwordReset.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } },
      });
      
      return NextResponse.json(
        { error: 'Invalid OTP', remainingAttempts: 6 - reset.attempts - 1 },
        { status: 401 }
      );
    }

    // OTP is correct! Update password
    const passwordHash = await hashPassword(newPassword);
    
    await prisma.user.update({
      where: { id: reset.userId },
      data: { passwordHash },
    });

    // Delete reset record
    await prisma.passwordReset.delete({ where: { id: reset.id } });

    // Revoke all refresh tokens (force re-login)
    await prisma.refreshToken.deleteMany({ where: { userId: reset.userId } });

    // Reset rate limit
    resetRateLimit(`reset-password:${email}`);

    return NextResponse.json({
      message: 'Password reset successful. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}