// src/app/api/auth/verify-email-change/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({
  newEmail: z.email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const MAX_ATTEMPTS = 6;

export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { newEmail, otp, firstName, lastName } = schema.parse(body);

    const verification = await prisma.emailVerification.findFirst({
      where: { email: newEmail, userId: authUser.id },
    });

    if (!verification) {
      return NextResponse.json({ error: 'Verification request not found. Please request a new code.' }, { status: 400 });
    }

    //  Check if max attempts reached
    if (verification.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Maximum verification attempts reached. Please request a new code.' }, 
        { status: 400 }
      );
    }

    //  Check if expired
    if (verification.expiresAt < new Date()) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    //  Validate OTP
    if (verification.otp !== otp) {
      // Increment attempts on failure
      const updated = await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      
      //const remainingAttempts = MAX_ATTEMPTS - updated.attempts;
      
      return NextResponse.json(
        { error: `Invalid OTP.` }, // ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.
        { status: 400 }
      );
    }

    //  OTP is valid! Update user and delete verification record
    await prisma.$transaction([
      prisma.user.update({
        where: { id: authUser.id },
        data: { 
          email: newEmail, 
          firstName, 
          lastName, 
          isEmailVerified: true 
        },
      }),
      prisma.emailVerification.delete({
        where: { id: verification.id },
      }),
    ]);

    return NextResponse.json({ message: 'Email and profile updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Verify email change error:', error);
    return NextResponse.json({ error: 'Failed to verify email change' }, { status: 500 });
  }
}