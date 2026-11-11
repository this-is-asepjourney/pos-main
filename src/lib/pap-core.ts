export interface PapProduct {
  product_id: string;
  sku: string;
  name: string;
  category: string;
  unit_price: number;
  currency: string;
  is_active: boolean;
}

export interface PapInventory {
  product_id: string;
  sku: string;
  warehouse: string;
  quantity: number;
  reserved: number;
  available: number;
}

export const getPapConfig = () => {
  const apiUrl =
    process.env.PAP_API_URL ||
    process.env.NEXT_PUBLIC_PAP_API_URL ||
    "http://192.168.25.101:8000/api/v1";
  const apiKey =
    process.env.PAP_API_KEY ||
    "pap_key_pos_cashier_default_secret_key_2026";

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey };
};

export const getPapHeaders = () => {
  const { apiKey } = getPapConfig();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Key": apiKey,
  };
};

/**
 * Check if PAP Core is reachable.
 */
export const checkPapHealth = async (): Promise<{ reachable: boolean; mode?: string }> => {
  try {
    const { apiUrl } = getPapConfig();
    const res = await fetch(`${apiUrl.replace(/\/api\/v1$/, "")}/health`, {
      headers: getPapHeaders(),
      cache: "no-store",
    });
    return { reachable: res.ok };
  } catch {
    return { reachable: false, mode: "offline_fallback" };
  }
};

/**
 * Fetch product catalog from PAP Core (Stock UMKM integration).
 */
export const getPapProducts = async (): Promise<PapProduct[]> => {
  try {
    const { apiUrl } = getPapConfig();
    const res = await fetch(`${apiUrl}/integrations/stock-umkm/products`, {
      headers: getPapHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[PAP Core] Products lookup returned HTTP ${res.status}`);
      return [];
    }

    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("[PAP Core] Error fetching products from PAP:", err);
    return [];
  }
};

/**
 * Send transaction checkout event to PAP Core for cross-system stock sync.
 */
export const notifyPapCheckout = async (payload: {
  invoiceCode: string;
  items: Array<{ productId: string; name: string; qty: number; subtotal: number }>;
  totalPrice: number;
}): Promise<boolean> => {
  try {
    const { apiUrl } = getPapConfig();
    const res = await fetch(`${apiUrl}/integrations/stock-umkm/events`, {
      method: "POST",
      headers: getPapHeaders(),
      body: JSON.stringify({
        event_id: `evt-pos-${payload.invoiceCode}`,
        event_type: "inventory.updated",
        source: "pos-cashier",
        timestamp: new Date().toISOString(),
        payload: {
          invoice_code: payload.invoiceCode,
          total_price: payload.totalPrice,
          items: payload.items,
        },
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn("[PAP Core] Could not publish checkout event to PAP:", err);
    return false;
  }
};

