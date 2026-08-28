import { NextResponse } from 'next/server';
import { getRefreshToken, setAuthCookies } from '@/lib/cookies';
import { verifyRefreshToken, generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const refreshToken = await getRefreshToken();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify the token signature and expiry
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    // Check the token exists in our database (hasn't been revoked)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Refresh token has been revoked' },
        { status: 401 }
      );
    }

    // Verify the user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User no longer exists' },
        { status: 401 }
      );
    }

    // Delete the old refresh token (rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    const newPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const newAccessToken = await generateAccessToken(newPayload);
    const newRefreshToken = await generateRefreshToken(newPayload);

    // Save the new refresh token
    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Set new cookies
    await setAuthCookies(newAccessToken, newRefreshToken);

    return NextResponse.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}