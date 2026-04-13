export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface OtpSendRequest {
  phone: string;
}

export interface OtpVerifyRequest {
  phone: string;
  otp: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface PaymentInitiateRequest {
  recipient_upi_id: string;
  amount: number;
  note?: string;
  idempotency_key: string;
}

export interface PaymentConfirmRequest {
  payment_id: string;
  idempotency_key: string;
}

export const MAX_TRANSACTION_AMOUNT = 10_000;
export const BIOMETRIC_THRESHOLD = 1_000;
