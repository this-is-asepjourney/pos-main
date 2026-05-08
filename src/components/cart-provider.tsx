"use client";

import { createContext, useContext, useState, type ReactNode, useMemo } from "react";
import type { CartItem, PaymentMethod, RenterIdType } from "@/types/pos";
import { cartFirstDaySubtotal, computeRentalSubtotal, inclusiveRentalDays } from "@/lib/rental";

type CartContextValue = {
  cart: CartItem[];
  setCart: (cart: CartItem[]) => void;
  pickupDate: string;
  setPickupDate: (date: string) => void;
  returnDueDate: string;
  setReturnDueDate: (date: string) => void;
  renterIdType: RenterIdType;
  setRenterIdType: (type: RenterIdType) => void;
  renterIdNumber: string;
  setRenterIdNumber: (num: string) => void;
  checkoutCondition: string;
  setCheckoutCondition: (val: string) => void;
  checkoutAccessories: string;
  setCheckoutAccessories: (val: string) => void;
  checkoutPhotoNotes: string;
  setCheckoutPhotoNotes: (val: string) => void;
  
  // Computed
  rentalDays: number;
  dateScheduleError: string;
  firstDaySubtotal: number;
  rentalSubtotal: number;
  grandTotal: number;
  
  // Actions
  addToCart: (product: any) => void;
  increaseQty: (productId: string) => void;
  decreaseQty: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickupDate, setPickupDate] = useState("");
  const [returnDueDate, setReturnDueDate] = useState("");
  const [renterIdType, setRenterIdType] = useState<RenterIdType>("");
  const [renterIdNumber, setRenterIdNumber] = useState("");
  const [checkoutCondition, setCheckoutCondition] = useState("");
  const [checkoutAccessories, setCheckoutAccessories] = useState("");
  const [checkoutPhotoNotes, setCheckoutPhotoNotes] = useState("");

  const dateScheduleError = useMemo(() => {
    if ((pickupDate && !returnDueDate) || (!pickupDate && returnDueDate)) {
      return "Lengkapi tanggal ambil dan tanggal kembali, atau kosongkan keduanya.";
    }
    if (pickupDate && returnDueDate) {
      try {
        inclusiveRentalDays(pickupDate, returnDueDate);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "Tanggal tidak valid.";
      }
    }
    return "";
  }, [pickupDate, returnDueDate]);

  const rentalDays = useMemo(() => {
    if (!pickupDate || !returnDueDate || dateScheduleError) return 0;
    try {
        return inclusiveRentalDays(pickupDate, returnDueDate);
    } catch {
        return 0;
    }
  }, [pickupDate, returnDueDate, dateScheduleError]);

  const firstDaySubtotal = useMemo(() => cartFirstDaySubtotal(cart), [cart]);
  const rentalSubtotal = useMemo(
    () => computeRentalSubtotal(cart, rentalDays),
    [cart, rentalDays],
  );
  const grandTotal = rentalSubtotal;

  const addToCart = (product: any) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return currentCart;
        return currentCart.map((item) =>
          item.productId === product.id
            ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          name: product.name,
          specification: product.specification,
          notes: product.notes,
          price: product.price,
          qty: 1,
          stock: product.stock,
          subtotal: product.price,
          categoryName: product.categoryName,
          imageUrl: product.imageUrl,
        },
      ];
    });
  };

  const increaseQty = (productId: string) => {
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId && item.qty < item.stock
          ? { ...item, qty: item.qty + 1, subtotal: (item.qty + 1) * item.price }
          : item,
      ),
    );
  };

  const decreaseQty = (productId: string) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.productId === productId
            ? { ...item, qty: item.qty - 1, subtotal: (item.qty - 1) * item.price }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPickupDate("");
    setReturnDueDate("");
    setRenterIdType("");
    setRenterIdNumber("");
    setCheckoutCondition("");
    setCheckoutAccessories("");
    setCheckoutPhotoNotes("");
  };

  const value = {
    cart, setCart,
    pickupDate, setPickupDate,
    returnDueDate, setReturnDueDate,
    renterIdType, setRenterIdType,
    renterIdNumber, setRenterIdNumber,
    checkoutCondition, setCheckoutCondition,
    checkoutAccessories, setCheckoutAccessories,
    checkoutPhotoNotes, setCheckoutPhotoNotes,
    rentalDays,
    dateScheduleError,
    firstDaySubtotal,
    rentalSubtotal,
    grandTotal,
    addToCart,
    increaseQty,
    decreaseQty,
    removeFromCart,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
