import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.string().min(3),
  character: z.enum(["jair", "flavio", "michelle", "nikolas"]),
});

const characterPrompts: Record<string, string> = {
  jair: "Jair Bolsonaro (the well-known Brazilian politician — older man with white hair, smiling warmly, wearing a yellow Brazil soccer jersey)",
  flavio: "Flávio Bolsonaro (Brazilian senator — dark hair, dark-rimmed glasses, blue suit, friendly smile)",
  michelle: "Michelle Bolsonaro (elegant blonde Brazilian first lady, warm smile, modest floral dress)",
  nikolas: "Nikolas Ferreira (young Brazilian politician — short dark hair, glasses, polo shirt, friendly smile)",
};

export const generatePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const character = characterPrompts[data.character];
    const prompt = `Take the person in this uploaded photo and place them naturally standing next to ${character}. Keep the person's face, hairstyle, skin tone, and clothing exactly as in the input photo — do not alter them. The result should look like a real casual smartphone selfie where the two are friends posing together, warm natural lighting, slight phone-camera grain, both smiling at the camera. Keep the background simple and cozy (a Brazilian home or outdoor setting). Output a single realistic photo.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      console.error("AI gateway error", resp.status, txt);
      if (resp.status === 429) throw new Error("Muitas requisições. Tente novamente em alguns instantes.");
      if (resp.status === 402) throw new Error("Créditos de IA esgotados.");
      throw new Error("Falha ao gerar a foto.");
    }

    const json = await resp.json();
    const message = json.choices?.[0]?.message;
    const images: string[] = message?.images?.map((i: any) => i.image_url?.url).filter(Boolean) ?? [];
    if (images.length === 0) {
      // Try delta content parts
      const parts = message?.content;
      if (Array.isArray(parts)) {
        for (const p of parts) {
          if (p?.image_url?.url) images.push(p.image_url.url);
        }
      }
    }
    if (images.length === 0) throw new Error("A IA não retornou imagem.");
    return { imageUrl: images[0] };
  });
