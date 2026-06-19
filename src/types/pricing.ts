export type DiscountConditionType = 
  | 'MIN_SUBTOTAL'
  | 'MIN_QTY'
  | 'CATEGORY'
  | 'PRODUCT'
  | 'TIME'
  | 'DAY'
  | 'MEMBER'
  | 'NONE';

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'SET_PRICE';

export interface DiscountRule {
  id: string;
  tenantId: string;
  name: string;
  active: boolean;
  priority: number;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  conditionType: DiscountConditionType;
  conditionValue?: any;
  discountType: DiscountType;
  value: number;
  allowStack: boolean;
}

export interface DiscountVoucher {
  id: string;
  tenantId: string;
  code: string;
  active: boolean;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  usageLimit?: number | null;
  usedCount: number;
  minTransactionAmount: number;
  discountType: DiscountType;
  value: number;
}

export interface PricingCartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  categoryId?: string;
}

export interface ManualDiscount {
  type: DiscountType;
  value: number;
  name?: string;
}

export interface PricingPayload {
  tenantId: string;
  cart: PricingCartItem[];
  voucherCode?: string;
  manualDiscount?: ManualDiscount;
  taxRate?: number; // percentage (e.g. 11 for 11% PPN)
  taxInclusive?: boolean;
}

export interface AppliedDiscount {
  id?: string;
  type: 'RULE' | 'VOUCHER' | 'MANUAL';
  name: string;
  amount: number;
  discountType: DiscountType;
  discountValue: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  appliedDiscounts: AppliedDiscount[];
  errors?: string[]; // to inform frontend about e.g. invalid voucher
}
