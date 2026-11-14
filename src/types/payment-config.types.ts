export type PayPolicy = "PAY_FIRST" | "PAY_LATER";

export interface RestaurantPaymentConfig {
  restaurantId: string;
  acceptCounter: boolean;
  acceptRazorpay: boolean;
  acceptUpi: boolean;
  payPolicy: PayPolicy;
  razorpayKeyId: string | null;
  razorpayKeySecret?: string | null;
  upiId: string | null;
  upiName: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicPaymentConfig {
  acceptCounter: boolean;
  acceptRazorpay: boolean;
  acceptUpi: boolean;
  payPolicy: PayPolicy;
  razorpayKeyId: string | null;
  upiId: string | null;
  upiName: string | null;
}

