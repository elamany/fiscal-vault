// src/app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { isOTPExpired } from '@/lib/otp';
import { generateAccessToken, generateRefreshToken, type JWTPayload } from '@/lib/jwt';
import { setAuthCookies } from '@/lib/cookies';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { cookies } from 'next/headers';

const verifySchema = z.object({
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = verifySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { otp } = validation.data;

    // READ EMAIL FROM SECURE COOKIE (not from request body)
    const cookieStore = await cookies();
    const email = cookieStore.get('verification_email')?.value;

    if (!email) {
      return NextResponse.json(
        { error: 'No verification session found. Please register again.' },
        { status: 401 }
      );
    }

    // Rate limit
    const rateLimit = await checkRateLimit(`verify-otp:${email}`, 6, 10 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '600' } }
      );
    }

    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { email },
      include: { user: true },
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'No verification request found for this email' },
        { status: 404 }
      );
    }

    if (isOTPExpired(verification.expiresAt)) {
      await prisma.emailVerification.delete({ where: { id: verification.id } });
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 410 }
      );
    }

    if (verification.otp !== otp) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      
      return NextResponse.json(
        { error: 'Invalid OTP', remainingAttempts: 6 - verification.attempts - 1 },
        { status: 401 }
      );
    }

    // OTP is correct! Mark user as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    });

    await prisma.emailVerification.delete({ where: { id: verification.id } });
    await resetRateLimit(`verify-otp:${email}`);

    // CLEAR THE VERIFICATION COOKIE
    const response = NextResponse.json({
      message: 'Email verified successfully',
      user: {
        id: verification.user.id,
        email: verification.user.email,
        role: verification.user.role,
        tenantId: verification.user.tenantId,
      },
    });

    response.cookies.set('verification_email', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, 
      path: '/',
    });

    // Generate tokens and log user in
    const user = verification.user;
    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await setAuthCookies(accessToken, refreshToken);

    return response;
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}