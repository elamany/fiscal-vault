import { cookies } from 'next/headers';
import VerifyResetCodeClient from './verify-reset-code-client';

export default async function VerifyResetCodePage() {
  const cookieStore = await cookies();
  const email = cookieStore.get('reset_email')?.value || '';

  return <VerifyResetCodeClient initialEmail={email} />;
}