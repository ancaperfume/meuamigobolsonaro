import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const createInput = z.object({
  amount: z.number().min(1).max(1000),
  character: z.enum(["jair", "flavio", "michelle", "nikolas", "trump", "milei"]),
  bumps: z.object({
    oracoes: z.boolean(),
    guia: z.boolean(),
  }),
  generatedUrl: z.string().optional(),
});

function getClientIP(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data }) => {
    const request = getRequest();
    const ip = getClientIP(request);

    // 1. Server-Side Price Verification (Prevent price tampering)
    let expectedAmount = ["trump", "milei"].includes(data.character) ? 9.90 : 6.22;
    if (data.bumps.oracoes) expectedAmount += 3.99;
    if (data.bumps.guia) expectedAmount += 14.90;

    if (Math.abs(data.amount - expectedAmount) > 0.05) {
      console.error(`Price tampering detected! Expected: ${expectedAmount}, received: ${data.amount}`);
      throw new Error(`Desvio de preço detectado! O valor enviado não condiz com os itens selecionados.`);
    }

    const apiKey = process.env.NEXUSPAG_API_KEY;
    if (!apiKey) {
      console.warn("Chave NEXUSPAG_API_KEY ausente. Gerando resposta simulada para testes locais.");
      const externalId = `mock-pix-${Date.now()}`;
      
      // Save pending order to Supabase even in mock mode if configured
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      if (supabaseAdmin) {
        await supabaseAdmin.from("orders").insert({
          external_id: externalId,
          amount: Number(data.amount.toFixed(2)),
          character: data.character,
          bumps: data.bumps,
          generated_url: data.generatedUrl || null,
          status: "pending",
          ip_address: ip,
        });
      }

      return {
        externalId,
        qrCode: "00020101021226870014br.gov.bcb.pix2565mockpix.com.br/v2/mockqr",
        qrCodeImage: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='white'/><rect x='10' y='10' width='30' height='30' fill='black'/><rect x='110' y='10' width='30' height='30' fill='black'/><rect x='10' y='110' width='30' height='30' fill='black'/><rect x='50' y='50' width='50' height='50' fill='black'/></svg>",
        raw: { mock: true },
      };
    }

    const externalId = `bma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const origin =
      process.env.PUBLIC_APP_URL ??
      (request.headers.get("origin") || request.headers.get("referer") ? 
        new URL(request.headers.get("referer") || request.headers.get("origin")!).origin : 
        "https://meuamigobolsonaro.com.br");

    const resp = await fetch("https://nexuspag.com/api/pix/create", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(data.amount.toFixed(2)),
        description: `Foto com ${data.character}`,
        external_id: externalId,
        webhook_url: `${origin}/api/public/nexuspag-webhook`,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("NexusPag error", resp.status, txt);
      throw new Error(`Falha no Gateway NexusPag (Status ${resp.status}): ${txt}`);
    }

    const json: any = await resp.json();

    // The API returns fields nested under 'transaction' or other wrappers like 'data' / 'pix' — be highly defensive.
    const nestedData = json.transaction ?? json.data ?? json.pix ?? json;
    
    const qrCode: string =
      nestedData.pix_copia_cola ??
      nestedData.qr_code ?? 
      nestedData.qrcode ?? 
      nestedData.brcode ?? 
      nestedData.pix_code ?? 
      nestedData.copy_paste ?? 
      nestedData.pixCopiaCola ?? 
      nestedData.emv ?? 
      json.qr_code ?? 
      json.qrcode ?? 
      "";
      
    const qrCodeImage: string =
      nestedData.qr_code_base64 ??
      nestedData.qr_code_image ?? 
      nestedData.qrcode_image ?? 
      nestedData.image ?? 
      nestedData.pixQrCode ?? 
      nestedData.base64 ?? 
      json.qr_code_image ?? 
      json.qrcode_image ?? 
      "";

    if (!qrCode && !qrCodeImage) {
      console.error("NexusPag response missing QR fields", json);
      throw new Error(`Pix gerado mas QR Code não retornado. Retorno do gateway: ${JSON.stringify(json)}`);
    }

    // Save pending order record in Supabase database
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (supabaseAdmin) {
      const { error: insertError } = await supabaseAdmin.from("orders").insert({
        external_id: externalId,
        amount: Number(data.amount.toFixed(2)),
        character: data.character,
        bumps: data.bumps,
        generated_url: data.generatedUrl || null,
        status: "pending",
        ip_address: ip,
        nexuspag_id: nestedData.id || json.id || null,
      });
      if (insertError) {
        console.error("Failed to save order record to Supabase", insertError);
      }
    }

    return {
      externalId,
      qrCode,
      qrCodeImage,
      raw: json,
    };
  });

const statusInput = z.object({ externalId: z.string().min(5).max(64) });

export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => statusInput.parse(data))
  .handler(async ({ data }) => {
    const isLocalOrTest = process.env.NODE_ENV === "development" || !process.env.NEXUSPAG_API_KEY;

    // Hardened mock-pix bypass validation
    if (data.externalId.startsWith("mock-pix")) {
      if (isLocalOrTest) {
        return { status: "paid", paidAt: new Date().toISOString() };
      } else {
        console.warn(`Mock payment attempt blocked in production for ID: ${data.externalId}`);
        return { status: "pending", paidAt: null };
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Check local database status first (highly efficient caching)
    if (supabaseAdmin) {
      try {
        const { data: orderData, error: dbError } = await supabaseAdmin
          .from("orders")
          .select("status, paid_at")
          .eq("external_id", data.externalId)
          .maybeSingle();

        if (!dbError && orderData && orderData.status === "paid") {
          return { status: "paid", paidAt: orderData.paid_at || new Date().toISOString() };
        }
      } catch (dbErr) {
        console.error("Failed to query order status in DB", dbErr);
      }
    }

    const apiKey = process.env.NEXUSPAG_API_KEY;
    if (!apiKey) {
      return { status: "pending", paidAt: null };
    }

    try {
      const resp = await fetch(
        `https://nexuspag.com/api/pix/status?external_id=${encodeURIComponent(data.externalId)}`,
        {
          headers: { "x-api-key": apiKey },
        },
      );
      if (resp.ok) {
        const json: any = await resp.json();
        const s: string =
          json.status ?? json.data?.status ?? json.transaction?.status ?? "pending";
        const isPaid =
          s === "paid" ||
          s === "confirmed" ||
          s === "completed" ||
          s === "approved" ||
          s === "finished";

        const paidAtStr = new Date().toISOString();

        if (isPaid && supabaseAdmin) {
          // Sync payment confirmation to database
          try {
            await supabaseAdmin
              .from("orders")
              .update({ status: "paid", paid_at: paidAtStr })
              .eq("external_id", data.externalId);
          } catch (updateErr) {
            console.error("Failed to sync paid status to Supabase", updateErr);
          }
        }

        return { status: isPaid ? "paid" : "pending", paidAt: isPaid ? paidAtStr : null };
      }
    } catch (e) {
      console.error("NexusPag status check error", e);
    }

    return { status: "pending", paidAt: null };
  });
