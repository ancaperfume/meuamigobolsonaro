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

        console.log("NexusPag webhook received", JSON.stringify(payload));

        return new Response("ok", { status: 200 });
      },
    },
  },
});
