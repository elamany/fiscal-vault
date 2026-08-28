import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { generateAccessToken, generateRefreshToken, type JWTPayload } from '@/lib/jwt';
import { setAuthCookies } from '@/lib/cookies';
import { checkRateLimit } from '@/lib/rate-limit';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;


    // Get client IP (works behind proxies)
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // 1. Rate limit by IP: 10 attempts per 15 minutes
    const ipRateLimit = await checkRateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
    
    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts from your network. Please try again later.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': ipRateLimit.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': ipRateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
          } 
        }
      );
    }

    // 2. Rate limit by email: 5 attempts per 15 minutes
    const emailRateLimit = await checkRateLimit(`login:email:${email}`, 5, 15 * 60 * 1000);
    
    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts for this account. Please try again later or reset your password.' },
        { 
          status: 429, 
          headers: { 
            'Retry-After': emailRateLimit.retryAfter?.toString() || '900',
            'X-RateLimit-Limit': emailRateLimit.limit.toString(),
            'X-RateLimit-Remaining': '0',
          } 
        }
      );
    }


    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate tokens
    const payload: JWTPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    // Save refresh token for future revocation
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set secure cookies
    await setAuthCookies(accessToken, refreshToken);

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}