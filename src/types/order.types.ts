import { OrderStatus, PaymentStatus, OrderType, OrderSource } from "./database.types";

export interface OrderItemInput {
  menuItemId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CalculatedOrderItem {
  menuItemId: string;
  variantId?: string | null;
  itemNameSnapshot: string;
  variantNameSnapshot?: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  taxRatePercentage: number;
}

export interface ChargeBreakdown {
  id?: string;
  name: string;
  chargeType: "PERCENTAGE" | "FIXED";
  rateOrAmount: number;
  calculatedPaise: number;
}

export interface CalculatedOrderPricing {
  subtotalPaise: number;
  taxPaise: number;
  additionalChargesPaise: number;
  chargesBreakdown: ChargeBreakdown[];
  totalPaise: number;
  items: CalculatedOrderItem[];
}

export interface CreateOrderPayload {
  tableToken: string;
  idempotencyKey: string;
  items: OrderItemInput[];
  specialInstructions?: string;
}

export interface CreateStaffOrderPayload {
  orderType: OrderType;
  tableId?: string | null;
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
  items: OrderItemInput[];
  idempotencyKey?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  restaurantId: string;
  tableId?: string | null;
  tableNumber?: string | null;
  orderType: OrderType;
  orderSource: OrderSource;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  customerName?: string | null;
  customerPhone?: string | null;
  subtotalPaise: number;
  taxPaise: number;
  additionalChargesPaise: number;
  totalPaise: number;
  chargesSnapshot?: ChargeBreakdown[];
  guestTrackingToken: string;
  specialInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Valid order status transitions state machine rules.
 */
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

/**
 * Validates whether a state transition is permitted.
 */
export function isValidOrderTransition(
  current: OrderStatus,
  target: OrderStatus
): boolean {
  return VALID_ORDER_TRANSITIONS[current]?.includes(target) ?? false;
}
