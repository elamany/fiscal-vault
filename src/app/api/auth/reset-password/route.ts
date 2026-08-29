import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { verifyGenericToken } from '@/lib/jwt';
import { checkRateLimit } from '@/lib/rate-limit';

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetTokenPayload = Record<string, unknown> & {
  userId: string;
  email: string;
  purpose: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { token, newPassword } = validation.data;

    /*// Rate limit: 5 password resets per 15 minutes per IP
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(`reset-password:ip:${ip}`, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '900' } }
      );
    }*/

    // Verify the JWT token from the previous step
    const payload = await verifyGenericToken<ResetTokenPayload>(token);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new code.' },
        { status: 400 }
      );
    }

    //Ensure this token was specifically for password reset
    if (payload.purpose !== 'PASSWORD_RESET') {
      return NextResponse.json(
        { error: 'Invalid token purpose.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    const passwordHash = await hashPassword(newPassword);

    //  Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Invalidate ALL existing refresh tokens for this user 
    // (Forces re-login on all devices for security)
    await prisma.refreshToken.updateMany({
      where: { 
        userId: user.id, 
        revokedAt: null 
      },
      data: { revokedAt: new Date() },
    });

    const response = NextResponse.json(
      {
        message: 'Password reset successfully. You can now log in with your new password.',
        redirectTo: '/auth/login',
      },
      { status: 200 }
    );

    // Clear the reset_email cookie
    response.cookies.set('reset_email', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}