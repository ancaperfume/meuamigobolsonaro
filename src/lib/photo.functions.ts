import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageBase64: z.string().min(100),
  mimeType: z.string().min(3),
  character: z.enum(["jair", "flavio", "michelle", "nikolas"]),
});

const characterPrompts: Record<string, string> = {
  jair: "Jair Bolsonaro, the famous senior Brazilian political leader, an older man with combed grey-white hair, characteristic friendly wrinkles around his eyes, a warm natural smile, wearing a yellow Brazil soccer jersey, looking directly at the camera.",
  flavio: "Flávio Bolsonaro, the Brazilian senator in his late 40s, with short combed dark hair, dark-rimmed rectangular glasses, a friendly smile, wearing a professional blue suit with a white dress shirt.",
  michelle: "Michelle Bolsonaro, the elegant former Brazilian first lady in her early 40s. She has styled shoulder-length light brown hair with blonde highlights, refined and soft facial features, a gentle elegant smile, wearing a classic modest pastel-colored dress or elegant business blazer.",
  nikolas: "Nikolas Ferreira, the young Brazilian politician in his late 20s. He has a very youthful face, short styled dark hair, a neatly trimmed thin beard (stubble), wearing rectangular dark-rimmed glasses, a warm and friendly energetic smile, wearing a neat modern dark polo shirt.",
};

export const generatePhoto = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const character = characterPrompts[data.character];
    const prompt = `CRITICAL IDENTITY PRESERVATION RULES:
1. You MUST preserve the EXACT faces, physical features, hairstyles, skin tones, and clothing of ALL the people present in the input photo.
2. Under no circumstances should you redraw, alter, or beautify the people's faces. Keep their identities 100% identical and high-fidelity to the source image.
3. If there is one person in the photo, place that exact person naturally standing next to ${character}.
4. If there are multiple people in the photo, keep ALL of them in the scene, preserving their positions, and place them as a group posing naturally together next to ${character}.
5. The politician (${character}) MUST be fully and clearly visible in the image, standing prominently side-by-side with the user(s). Their face and body should not be cut off, obstructed, or partially hidden. They must be a primary and highly recognizable subject of the photo.

SCENE COMPOSITION & STYLE:
- The result must look like a high-quality, realistic, casual smartphone selfie where everyone is friends posing together.
- Warm, natural lighting, shot in a high-quality realistic setting.
- Soft phone-camera texture and realistic skin details (no artificial plastic/airbrushed skin effect).
- Everyone in the photo should be smiling naturally at the camera.
- The background should be a cozy, realistic setting (such as a modern Brazilian home living room, a veranda, or an outdoor garden).
- Output a single realistic, coherent, and highly convincing photo.`;

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
