// src/app/auth/verify-email/page.tsx
import { cookies } from 'next/headers';
import VerifyEmailClient from './verify-email-client';

export default async function VerifyEmailPage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('verification_email')?.value || '';

  return <VerifyEmailClient initialEmail={email} />;
}