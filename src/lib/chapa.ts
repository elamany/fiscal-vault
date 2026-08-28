import { Chapa } from 'chapa-nodejs';


if (!process.env.CHAPA_SECRET_KEY) {
  throw new Error('CHAPA_SECRET_KEY is not set in environment variables');
}
if (!process.env.CHAPA_SECRET_KEY) {
  throw new Error('CHAPA_SECRET_KEY is not set in environment variables');
}

export interface ChapaInitializeOptions {
  amount: string;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  txRef: string;
  callbackUrl: string;
  returnUrl?: string;
  customization?: {
    title?: string;
    description?: string;
  };
}

/**
 * Initialize a Chapa transaction using direct fetch.
 * This bypasses SDK masking and gives us the exact error from Chapa.
 */
export async function initializeChapaPayment(options: ChapaInitializeOptions) {
  const url = 'https://api.chapa.co/v1/transaction/initialize';
  
  const payload = {
    amount: options.amount,
    currency: options.currency || 'ETB',
    email: options.email,
    first_name: options.firstName,
    last_name: options.lastName,
    tx_ref: options.txRef,
    callback_url: options.callbackUrl,
    return_url: options.returnUrl || options.callbackUrl,
    customization: options.customization || {
      title: 'FiscalVault Payment',
      description: 'Secure payment for your invoice',
    },
  };

  console.log('Sending direct request to Chapa:', payload);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('--- CHAPA API ERROR ---');
    console.error('Status:', response.status);
    console.error('Response Data:', JSON.stringify(data, null, 2));
    console.error('-----------------------');
    throw new Error(`Chapa API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  console.log('Chapa Success Response:', data);
  return data;
}

/**
 * Verify a Chapa transaction after the user returns from payment.
 */
export async function verifyChapaPayment(txRef: string) {
  const url = `https://api.chapa.co/v1/transaction/verify/${txRef}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Chapa Verify Error:', data);
    throw new Error(`Chapa Verify Error: ${response.status}`);
  }

  return data;
}