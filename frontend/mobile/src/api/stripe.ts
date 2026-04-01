import { apiClient } from './auth';

export interface StripeCheckoutSession {
  checkout_url: string;
  session_id: string;
}

export async function createStripeCheckoutSession(
  advertisementId: number,
  packageId: 'basic' | 'standard' | 'premium'
): Promise<StripeCheckoutSession> {
  const res = await apiClient.post('/business/stripe/checkout-session', {
    advertisement_id: advertisementId,
    package_id: packageId,
  });
  return res.data as StripeCheckoutSession;
}
