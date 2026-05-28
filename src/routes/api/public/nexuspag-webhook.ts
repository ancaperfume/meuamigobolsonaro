import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/nexuspag-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.NEXUSPAG_WEBHOOK_SECRET;
        if (!secret) {
          console.error("NEXUSPAG_WEBHOOK_SECRET missing");
          return new Response("Server misconfigured", { status: 500 });
        }

        const rawBody = await request.text();
        const signature = request.headers.get("x-nexuspag-signature");
        const timestamp = request.headers.get("x-nexuspag-timestamp");

        if (!signature || !timestamp) {
          return new Response("Missing signature headers", { status: 401 });
        }

        const expected = createHmac("sha256", secret)
          .update(`${timestamp}.${rawBody}`)
          .digest("hex");

        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          console.warn("Invalid NexusPag signature");
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        console.log("NexusPag webhook received:", JSON.stringify(payload));

        // 1. Safely extract external_id and payment status from the webhook payload (defensively checking nested keys)
        const nestedData = payload.transaction ?? payload.data ?? payload.pix ?? payload;
        const externalId: string | undefined = 
          nestedData.external_id ?? 
          nestedData.externalId ?? 
          payload.external_id ?? 
          payload.externalId;
          
        const status: string | undefined = nestedData.status ?? payload.status;

        if (externalId && status) {
          const isPaid =
            status === "paid" ||
            status === "confirmed" ||
            status === "completed" ||
            status === "approved" ||
            status === "finished";

          if (isPaid) {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            if (supabaseAdmin) {
              try {
                const { error: updateError } = await supabaseAdmin
                  .from("orders")
                  .update({
                    status: "paid",
                    paid_at: new Date().toISOString(),
                    nexuspag_id: nestedData.id ?? payload.id ?? null,
                  })
                  .eq("external_id", externalId);

                if (updateError) {
                  console.error(`Supabase update error for webhook order ${externalId}:`, updateError);
                } else {
                  console.log(`Database synced: Order ${externalId} marked as paid via webhook confirmation.`);
                }
              } catch (dbErr) {
                console.error(`Failed to handle DB sync in webhook for order ${externalId}:`, dbErr);
              }
            }
          } else {
            console.log(`Webhook order ${externalId} status is pending/other: ${status}`);
          }
        } else {
          console.warn("Could not extract external_id or status from webhook payload", JSON.stringify(payload));
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
