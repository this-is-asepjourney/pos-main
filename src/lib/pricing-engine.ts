import {
  PricingPayload,
  PricingResult,
  AppliedDiscount,
  DiscountRule,
  DiscountVoucher,
  DiscountType,
} from "@/types/pricing";

const calculateDiscountAmount = (
  baseAmount: number,
  type: DiscountType,
  value: number
): number => {
  switch (type) {
    case "PERCENTAGE":
      return Math.floor(baseAmount * (value / 100));
    case "FIXED":
      return Math.min(baseAmount, value); // tidak bisa diskon melebihi harga
    case "SET_PRICE":
      return Math.max(0, baseAmount - value);
    default:
      return 0;
  }
};

export const calculateOrder = (
  payload: PricingPayload,
  activeRules: DiscountRule[] = [],
  voucher: DiscountVoucher | null = null
): PricingResult => {
  const { cart, manualDiscount, taxRate = 0, taxInclusive = false } = payload;
  const errors: string[] = [];
  
  // 1. Calculate base subtotal
  let subtotal = 0;
  for (const item of cart) {
    subtotal += item.price * item.qty;
  }

  let remainingAmount = subtotal;
  let totalDiscountAmount = 0;
  const appliedDiscounts: AppliedDiscount[] = [];

  // Helper to apply a discount
  const applyDiscount = (
    id: string | undefined,
    type: 'RULE' | 'VOUCHER' | 'MANUAL',
    name: string,
    discountType: DiscountType,
    value: number,
    baseAmount: number
  ) => {
    if (remainingAmount <= 0) return;
    
    const amount = calculateDiscountAmount(baseAmount, discountType, value);
    if (amount > 0) {
      const actualAmount = Math.min(amount, remainingAmount);
      remainingAmount -= actualAmount;
      totalDiscountAmount += actualAmount;
      
      appliedDiscounts.push({
        id,
        type,
        name,
        amount: actualAmount,
        discountType,
        discountValue: value,
      });
    }
  };

  // 2. Evaluate Automatic Rules
  // Sort rules by priority (highest first)
  const sortedRules = [...activeRules].sort((a, b) => b.priority - a.priority);
  
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, ...

  for (const rule of sortedRules) {
    if (remainingAmount <= 0) break;
    
    let isEligible = false;
    let applicableBaseAmount = remainingAmount;

    try {
      const condVal = typeof rule.conditionValue === 'string' && rule.conditionValue.startsWith('[')
        ? JSON.parse(rule.conditionValue)
        : rule.conditionValue;

      switch (rule.conditionType) {
        case "NONE":
          isEligible = true;
          break;
        case "MIN_SUBTOTAL":
          if (subtotal >= Number(condVal)) isEligible = true;
          break;
        case "MIN_QTY":
          const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
          if (totalQty >= Number(condVal)) isEligible = true;
          break;
        case "CATEGORY":
          // Find if cart has any item in these categories
          // condVal should be an array of category IDs
          const targetCats: string[] = Array.isArray(condVal) ? condVal : [condVal];
          const matchingCatItems = cart.filter(i => i.categoryId && targetCats.includes(i.categoryId));
          if (matchingCatItems.length > 0) {
            isEligible = true;
            // discount only applies to matching items subtotal!
            applicableBaseAmount = matchingCatItems.reduce((sum, i) => sum + (i.price * i.qty), 0);
          }
          break;
        case "PRODUCT":
          const targetProds: string[] = Array.isArray(condVal) ? condVal : [condVal];
          const matchingProds = cart.filter(i => targetProds.includes(i.productId));
          if (matchingProds.length > 0) {
            isEligible = true;
            applicableBaseAmount = matchingProds.reduce((sum, i) => sum + (i.price * i.qty), 0);
          }
          break;
        case "TIME":
          // condVal: { start: 17, end: 20 }
          if (condVal && currentHour >= condVal.start && currentHour <= condVal.end) {
            isEligible = true;
          }
          break;
        case "DAY":
          // condVal: [0, 6] (Weekend)
          if (Array.isArray(condVal) && condVal.includes(currentDay)) {
            isEligible = true;
          }
          break;
      }
    } catch (err) {
      console.error(`Error parsing condition for rule ${rule.name}`, err);
    }

    if (isEligible) {
      // Perhatikan apakah rule allowStack?
      // Jika tidak allow stack, dan sudah ada diskon lain, kita abaikan atau reset?
      // Implementasi standard: jika ini adalah highest priority dan !allowStack, kita ambil ini dan abaikan yang lain.
      // Jika sudah ada discount, dan current rule !allowStack, skip.
      if (!rule.allowStack && appliedDiscounts.length > 0) {
        continue;
      }

      applyDiscount(
        rule.id,
        "RULE",
        rule.name,
        rule.discountType,
        rule.value,
        applicableBaseAmount
      );

      // Jika rule yang baru diaplikasikan tidak allowStack, stop proses diskon lain.
      if (!rule.allowStack) {
        break;
      }
    }
  }

  // 3. Apply Voucher
  if (voucher && remainingAmount > 0) {
    if (subtotal >= voucher.minTransactionAmount) {
      applyDiscount(
        voucher.id,
        "VOUCHER",
        `Voucher: ${voucher.code}`,
        voucher.discountType,
        voucher.value,
        remainingAmount // usually voucher applies to subtotal or remaining
      );
    } else {
      errors.push(`Voucher membutuhkan minimal transaksi Rp${voucher.minTransactionAmount.toLocaleString()}`);
    }
  } else if (payload.voucherCode && !voucher) {
    errors.push(`Voucher ${payload.voucherCode} tidak valid atau kadaluarsa.`);
  }

  // 4. Apply Manual Discount
  if (manualDiscount && remainingAmount > 0) {
    applyDiscount(
      undefined,
      "MANUAL",
      manualDiscount.name || "Manual Discount",
      manualDiscount.type,
      manualDiscount.value,
      remainingAmount
    );
  }

  // 5. Calculate Tax
  let taxAmount = 0;
  let finalTotal = remainingAmount;
  
  if (taxRate > 0) {
    if (taxInclusive) {
      // Rumus tax inclusive: Tax = Harga - (Harga / (1 + taxRate/100))
      // finalTotal tetap = remainingAmount
      taxAmount = Math.round(remainingAmount - (remainingAmount / (1 + taxRate / 100)));
    } else {
      // Rumus tax exclusive: Tax = Harga * (taxRate/100)
      taxAmount = Math.round(remainingAmount * (taxRate / 100));
      finalTotal = remainingAmount + taxAmount;
    }
  }

  return {
    subtotal,
    discountAmount: totalDiscountAmount,
    taxAmount,
    total: finalTotal,
    appliedDiscounts,
    errors: errors.length > 0 ? errors : undefined,
  };
};
