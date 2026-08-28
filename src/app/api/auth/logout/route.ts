import { NextResponse } from 'next/server';
import { clearAuthCookies, getRefreshToken } from '@/lib/cookies';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    // Get the refresh token from the cookie
    const refreshToken = await getRefreshToken();

    // If there's a refresh token, revoke it in the database
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear the cookies
    await clearAuthCookies();

    return NextResponse.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}