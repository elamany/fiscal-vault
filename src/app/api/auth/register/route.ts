import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { generateOTP } from '@/lib/otp';
import { getCooldownSecondsRemaining } from '@/lib/otp';
import { sendOTPEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.email('Invalid email address').transform((val) => val.toLowerCase()),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'), 
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['CUSTOMER', 'BUSINESS_OWNER']),
  tenantName: z.string().min(2).optional(),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only').transform((val) => val.toLowerCase()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, role,firstName, lastName, tenantName, tenantSlug } = validation.data;

    // Rate limit 50 reg per hour
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = await checkRateLimit(`register:ip:${ip}`, 50, 60 * 60 * 1000);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() || '3600' } }
      );
    }

    // Check if email is already registered
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return NextResponse.json(
          { error: 'Email already registered. Please log in or reset your password.' },
          { status: 409 }
        );
      } else {
        const verification = await prisma.emailVerification.findUnique({
          where: { userId: existingUser.id },
        });

        const cooldownSeconds = verification 
          ? getCooldownSecondsRemaining(verification.lastSentAt) 
          : 0;

        const response = NextResponse.json(
          { 
            message: 'This email is already pending verification.',
            redirectTo: '/verify-email',
            cooldownSeconds: Math.max(0, cooldownSeconds),
          },
          { status: 200 }
        );

        // SET SECURE COOKIE 
        response.cookies.set('verification_email', email, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          //maxAge: 10 * 60, 
          path: '/',
        });

        return response;
      }
    }
    
    let tenantId: string | null = null;
    if (role === 'BUSINESS_OWNER') {
      if (!tenantName || !tenantSlug) {
        return NextResponse.json(
          { error: 'Business owners must provide tenantName and tenantSlug' },
          { status: 400 }
        );
      }

      const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
      if (existingTenant) {
        return NextResponse.json(
          { error: 'Store name already taken, please choose another' },
          { status: 409 }
        );
      }

      const tenant = await prisma.tenant.create({
        data: { name: tenantName, slug: tenantSlug },
      });
      tenantId = tenant.id;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: firstName.trim(),  
        lastName: lastName.trim(),
        role,
        tenantId,
        isEmailVerified: false,
      },
    });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        email,
        otp,
        expiresAt,
        lastSentAt: new Date(),
        userId: user.id,
      },
    });

    await sendOTPEmail(email, otp, 'verification');

    const response = NextResponse.json(
      {
        message: 'Registration successful. Please check your email for the verification code.',
        //redirectTo: '/verify-email',
        //userId: user.id,
        //cooldown:120
      },
      { status: 201 }
    );

    //SET SECURE COOKIE
    response.cookies.set('verification_email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      //maxAge: 10 * 60, 
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}