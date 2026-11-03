import { OrderStatus, PaymentStatus } from "./database.types";

export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
}

export interface CalculatedOrderItem {
  menuItemId: string;
  itemNameSnapshot: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
  taxRatePercentage: number;
}

export interface CalculatedOrderPricing {
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  items: CalculatedOrderItem[];
}

export interface CreateOrderPayload {
  tableToken: string;
  idempotencyKey: string;
  items: OrderItemInput[];
  specialInstructions?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
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
  PREPARING: ["READY"],
  READY: ["COMPLETED"],
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
