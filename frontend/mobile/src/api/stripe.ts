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

// —— Stripe Connect (Express) — same endpoints as web `frontend/src/lib/api/stripe.ts`

export interface StripeConnectStatus {
  stripe_account_id: string | null;
  stripe_account_status: 'none' | 'pending' | 'restricted' | 'active' | 'disabled';
  stripe_payouts_enabled: boolean;
  stripe_charges_enabled: boolean;
  stripe_onboarding_completed_at: string | null;
  stripe_disabled_reason: string | null;
  has_active_dispute: boolean;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  } | null;
  error?: string;
}

export interface StripeConnectResponse {
  url: string;
  stripe_account_id?: string;
}

export interface StripeDashboardResponse {
  url: string;
}

export async function createStripeConnectAccount(): Promise<StripeConnectResponse> {
  const res = await apiClient.post('/business/stripe/connect');
  return res.data as StripeConnectResponse;
}

export async function refreshStripeConnectLink(): Promise<StripeConnectResponse> {
  const res = await apiClient.get('/business/stripe/connect/refresh');
  return res.data as StripeConnectResponse;
}

export async function getStripeConnectStatus(): Promise<StripeConnectStatus> {
  const res = await apiClient.get('/business/stripe/connect/status');
  return res.data as StripeConnectStatus;
}

export async function getStripeDashboardLink(): Promise<StripeDashboardResponse> {
  const res = await apiClient.post('/business/stripe/connect/dashboard');
  return res.data as StripeDashboardResponse;
}

export async function disconnectStripeAccount(): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post('/business/stripe/connect/disconnect');
  return res.data as { success: boolean; message: string };
}

export interface BookingPaymentResponse {
  client_secret: string;
  payment_intent_id: string;
  status: string;
}

export interface RefundRequest {
  amount?: number;
  reason: string;
}

export async function createBookingPayment(bookingId: number): Promise<BookingPaymentResponse> {
  const res = await apiClient.post(`/business/bookings/${bookingId}/pay`);
  return res.data as BookingPaymentResponse;
}

export async function captureBookingPayment(
  bookingId: number
): Promise<{ status: string; message: string }> {
  const res = await apiClient.post(`/business/bookings/${bookingId}/capture`);
  return res.data as { status: string; message: string };
}

export async function refundBookingPayment(
  bookingId: number,
  data: RefundRequest
): Promise<{
  status: string;
  refund_id: string;
  refunded_amount: number;
  total_refunded: number;
}> {
  const res = await apiClient.post(`/business/bookings/${bookingId}/refund`, data);
  return res.data;
}
