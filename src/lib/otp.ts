import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit OTP.
 */
export function generateOTP(): string {
  // Generate a random number between 0 and 999999
  const buffer = crypto.randomBytes(4);
  const number = buffer.readUInt32BE(0) % 1000000;
  
  // Pad with leading zeros to ensure it's always 6 digits
  return number.toString().padStart(6, '0');
}

/**
 * Checks if an OTP has expired.
 */
export function isOTPExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Checks if the cooldown period has passed (2 minutes).
 */
export function canResendOTP(lastSentAt: Date): boolean {
  const cooldownMs = 2 * 60 * 1000; // 2 minutes in milliseconds
  const timeSinceLastSend = Date.now() - lastSentAt.getTime();
  return timeSinceLastSend >= cooldownMs;
}

/**
 * Calculates seconds remaining until cooldown expires.
 */
export function getCooldownSecondsRemaining(lastSentAt: Date): number {
  const cooldownMs = 2 * 60 * 1000;
  const timeSinceLastSend = Date.now() - lastSentAt.getTime();
  const remainingMs = cooldownMs - timeSinceLastSend;
  return Math.ceil(remainingMs / 1000);
}