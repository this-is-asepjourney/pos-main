import { NextResponse } from "next/server";
import { query, isPostgresConfigured } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("[PAP Webhook] Received webhook event:", payload);

    const { event_type, payload: eventData } = payload;

    // Handle inventory update from PAP / Stock UMKM
    if (event_type === "inventory.updated" && eventData && isPostgresConfigured()) {
      const { sku, quantity, available } = eventData;
      const targetQty = available !== undefined ? available : quantity;

      if (sku && targetQty !== undefined) {
        await query(
          "UPDATE products SET stock = $1, updated_at = NOW() WHERE sku = $2",
          [targetQty, sku]
        );
      }
    }

    return NextResponse.json({
      received: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[PAP Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

