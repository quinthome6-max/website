"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useTransition,
} from "react";
import {
  addToCart as pixelAddToCart,
  pixelId,
} from "@/lib/analytics/pixel";
import type { Cart } from "@/lib/shopify/cart";
import {
  getCartAction,
  addToCartAction,
  addDiffuserWithGiftAction,
  updateLineAction,
  removeLineAction,
} from "@/app/actions/cart";

interface CartContextValue {
  cart: Cart | null;
  count: number;
  open: boolean;
  pending: boolean;
  /** True once PayU + the Shopify Admin API are configured: checkout then runs
   *  on our own /checkout instead of the Shopify-hosted one. */
  headlessCheckout: boolean;
  setOpen: (v: boolean) => void;
  /** Replace the cart after a server action that returns a fresh one. */
  setCart: (c: Cart | null) => void;
  add: (
    merchandiseId: string,
    quantity?: number,
    attributes?: { key: string; value: string }[],
    /** openDrawer: false adds without sliding the drawer open (the bag page). */
    options?: { openDrawer?: boolean }
  ) => void;
  /** Adds a diffuser and its complimentary ₹0 oil as one mutation. */
  addWithGift: (
    diffuserVariantId: string,
    giftVariantId: string | null,
    attributes?: { key: string; value: string }[]
  ) => void;
  update: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  headlessCheckout = false,
}: {
  children: React.ReactNode;
  headlessCheckout?: boolean;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Load any existing cart once on mount.
  useEffect(() => {
    getCartAction().then((c) => c && setCart(c)).catch(() => {});
  }, []);

  /**
   * Report an add from the cart Shopify returned rather than from the click:
   * the price, the quantity and the free oil are then whatever was really
   * added, not what the page hoped would be.
   */
  const reportAdd = (next: Cart | null, merchandiseIds: string[]) => {
    const lines = (next?.lines ?? []).filter((l) =>
      merchandiseIds.includes(l.merchandiseId)
    );
    if (!lines.length) return;
    pixelAddToCart({
      contents: lines.map((l) => ({
        id: pixelId(l.merchandiseId),
        quantity: l.quantity,
        item_price: l.price,
      })),
      value: lines.reduce((t, l) => t + l.price * l.quantity, 0),
      name: lines[0].productTitle,
    });
  };

  const add = useCallback(
    (
      merchandiseId: string,
      quantity = 1,
      attributes?: { key: string; value: string }[],
      options?: { openDrawer?: boolean }
    ) => {
    if (options?.openDrawer !== false) setOpen(true);
    startTransition(async () => {
      try {
        const next = await addToCartAction(merchandiseId, quantity, attributes);
        setCart(next);
        reportAdd(next, [merchandiseId]);
      } catch (e) {
        console.error("add to cart failed", e);
      }
    });
    },
    []
  );

  const addWithGift = useCallback(
    (
      diffuserVariantId: string,
      giftVariantId: string | null,
      attributes?: { key: string; value: string }[]
    ) => {
      setOpen(true);
      startTransition(async () => {
        try {
          const next = await addDiffuserWithGiftAction(
            diffuserVariantId,
            giftVariantId,
            attributes
          );
          setCart(next);
          reportAdd(
            next,
            [diffuserVariantId, giftVariantId].filter((v): v is string => !!v)
          );
        } catch (e) {
          console.error("add diffuser with gift failed", e);
        }
      });
    },
    []
  );

  const update = useCallback((lineId: string, quantity: number) => {
    startTransition(async () => {
      try {
        const c = await updateLineAction(lineId, quantity);
        setCart(c);
      } catch (e) {
        console.error("update line failed", e);
      }
    });
  }, []);

  const remove = useCallback((lineId: string) => {
    startTransition(async () => {
      try {
        const c = await removeLineAction(lineId);
        setCart(c);
      } catch (e) {
        console.error("remove line failed", e);
      }
    });
  }, []);

  const count = cart?.totalQuantity ?? 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        count,
        open,
        pending,
        headlessCheckout,
        setOpen,
        add,
        setCart,
        addWithGift,
        update,
        remove,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within <CartProvider>");
  return ctx;
}
