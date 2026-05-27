import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createInput = z.object({
  amount: z.number().min(1).max(1000),
  character: z.enum(["jair", "flavio", "michelle", "nikolas"]),
  bumps: z.object({
    oracoes: z.boolean(),
    guia: z.boolean(),
  }),
  generatedUrl: z.string().optional(),
});

export const createPixCharge = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createInput.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.NEXUSPAG_API_KEY;
    if (!apiKey) throw new Error("Chave NEXUSPAG_API_KEY ausente nas variáveis de ambiente da Lovable.");

    const externalId = `bma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const origin =
      process.env.PUBLIC_APP_URL ??
      "https://project--14abfb64-7c25-4b6e-b573-5a86b49933f1.lovable.app";

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
        return { status: isPaid ? "paid" : "pending", paidAt: isPaid ? new Date().toISOString() : null };
      }
    } catch (e) {
      console.error("NexusPag status check error", e);
    }

    return { status: "pending", paidAt: null };
  });
