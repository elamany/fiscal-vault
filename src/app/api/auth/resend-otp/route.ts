import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { generateOTP, canResendOTP, getCooldownSecondsRemaining } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

// Only require the 'type'. The email comes SECURELY from the HttpOnly cookie.
const resendSchema = z.object({
  type: z.enum(['verification', 'password-reset']),
});

const emailCheck = z.object({
  email: z.email('Invalid email address').transform((val) => val.toLowerCase()),
});

export async function POST(request: NextRequest) {
  try {

    let body = {};
    try {
      body = await request.json();
    } catch (err) {
      // If the body is empty or not valid JSON, default to an empty object
      body = {}; 
    }


    const validation = resendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { type } = validation.data;

    // Read email exclusively from the HttpOnly cookie
    const cookieStore = await cookies();
    const emailFromCookie = cookieStore.get('verification_email')?.value;
    


    if (!emailFromCookie) {
      return NextResponse.json(
        { 
          error: 'No pending verification session found. Please register again.',
          action: 'register'
        },
        { status: 404 }
      );
    }

    // Validate the cookie value is actually an email (Defense in Depth)
    const emailValidation = emailCheck.safeParse({ email: emailFromCookie });
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: 'Invalid verification session' },
        { status: 400 }
      );
    }

    const safeEmail = emailValidation.data.email;

    // Rate limit: Max 50 resend attempts per email per hour
    const rateLimit = await checkRateLimit(`resend-otp:${safeEmail}`, 50, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many resend attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }

    if (type === 'verification') {
      // Find the user
      const user = await prisma.user.findUnique({
        where: { email: safeEmail },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'No account found with this email' },
          { status: 404 }
        );
      }

      // Check if already verified
      if (user.isEmailVerified) {
        return NextResponse.json(
          { 
            error: 'This email is already verified. Please proceed to login.',
            action: 'login'
          },
          { status: 400 }
        );
      }

      // Find the verification record
      const verification = await prisma.emailVerification.findUnique({
        where: { userId: user.id },
      });

      if (!verification) {
        return NextResponse.json(
          { error: 'No verification request found. Please register again.' },
          { status: 404 }
        );
      }

      // Check cooldown (2 minutes)
      if (!canResendOTP(verification.lastSentAt)) {
        const secondsRemaining = getCooldownSecondsRemaining(verification.lastSentAt);
        return NextResponse.json(
          { 
            error: `Please wait ${secondsRemaining} second before requesting a new OTP`, 
            cooldownSeconds: secondsRemaining 
          },
          { status: 429 }
        );
      }

      // Generate new OTP and update record
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: {
          otp,
          expiresAt,
          lastSentAt: new Date(),
          attempts: 0, // Reset failed attempts
        },
      });

      // 5. Send email
      await sendOTPEmail(safeEmail, otp, 'verification');

      return NextResponse.json({
        message: 'New verification code sent successfully',
      });
    } 
    
    // Note: Password reset logic would go here, but it should use a different cookie 
    // or be strictly rate-limited by IP to prevent email bombing.
    return NextResponse.json(
      { error: 'Password reset resend not implemented yet' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}