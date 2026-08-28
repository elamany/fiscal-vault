// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends an OTP email for verification or password reset.
 */
export async function sendOTPEmail(email: string, otp: string, type: 'verification' | 'password-reset'): Promise<void> {
  const subject = type === 'verification' 
    ? 'Verify your email address' 
    : 'Reset your password';
  
  /*const message = type === 'verification'
    ? `Your verification code is: ${otp}. This code expires in 10 minutes.`
    : `Your password reset code is: ${otp}. This code expires in 10 minutes.`;*/

  try {
    await resend.emails.send({
      from: 'FiscalVault <noreply@yourdomain.com>', // Update this after verifying your domain in Resend
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${subject}</h2>
          <p>Your one-time password (OTP) is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">FiscalVault - Secure Multi-Tenant Invoicing Platform</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}