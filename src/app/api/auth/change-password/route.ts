import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { isPasswordValid } from '@/lib/password-validation'; 

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(1, 'New password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    // ✅ Use the shared validator (same rules as frontend)
    if (!isPasswordValid(newPassword)) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters with uppercase, lowercase, and a number' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValidMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValidMatch) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: authUser.id },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: authUser.id },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json(
      { message: 'Password changed successfully. Please log in again on other devices.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}