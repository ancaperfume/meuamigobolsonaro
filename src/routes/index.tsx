import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePhoto } from "@/lib/photo.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Upload, Lock, Check, ShieldCheck, Heart, Sparkles, X } from "lucide-react";

import exampleJair from "@/assets/example-jair.jpg";
import exampleFlavio from "@/assets/example-flavio.jpg";
import exampleMichelle from "@/assets/example-michelle.jpg";
import exampleNikolas from "@/assets/example-nikolas.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bolsonaro Meu Amigo — Tire uma foto com seu ídolo" },
      { name: "description", content: "Envie uma foto sua e receba em segundos uma imagem com Jair, Flávio, Michelle Bolsonaro ou Nikolas Ferreira." },
      { property: "og:title", content: "Bolsonaro Meu Amigo" },
      { property: "og:description", content: "Sua foto ao lado do seu ídolo, em segundos." },
    ],
  }),
  component: Index,
});

type CharKey = "jair" | "flavio" | "michelle" | "nikolas";

const CHARACTERS: Record<CharKey, {
  name: string;
  short: string;
  tagline: string;
  headline: string;
  sub: string;
  example: string;
  accent: string;
}> = {
  jair: {
    name: "Jair Bolsonaro",
    short: "Jair",
    tagline: "O Mito",
    headline: "Tire uma foto com o Mito.",
    sub: "Envie uma selfie sua e em segundos você aparece lado a lado com o Capitão.",
    example: exampleJair,
    accent: "verde-amarelo",
  },
  flavio: {
    name: "Flávio Bolsonaro",
    short: "Flávio",
    tagline: "O Senador",
    headline: "Uma foto com o Senador Flávio.",
    sub: "Sua imagem ao lado do senador, com aquele clima de almoço em família.",
    example: exampleFlavio,
    accent: "azul",
  },
  michelle: {
    name: "Michelle Bolsonaro",
    short: "Michelle",
    tagline: "Primeira-Dama",
    headline: "Uma foto com a Michelle.",
    sub: "Sua família ao lado da primeira-dama, com fé e elegância.",
    example: exampleMichelle,
    accent: "rosa",
  },
  nikolas: {
    name: "Nikolas Ferreira",
    short: "Nikolas",
    tagline: "O Deputado",
    headline: "Uma foto com o Nikolas.",
    sub: "Aquela selfie no churrasco com o deputado mais votado do Brasil.",
    example: exampleNikolas,
    accent: "verde",
  },
};

type Step = "idle" | "generating" | "preview" | "paid";

function Index() {
  const [character, setCharacter] = useState<CharKey>("jair");
  const [step, setStep] = useState<Step>("idle");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [bumps, setBumps] = useState<{ oracoes: boolean; guia: boolean }>({
    oracoes: false,
    guia: false,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const callGenerate = useServerFn(generatePhoto);

  // Preload all character examples to make switching instant
  useEffect(() => {
    Object.values(CHARACTERS).forEach((ch) => {
      const img = new Image();
      img.decoding = "async";
      img.src = ch.example;
    });
  }, []);


  const c = CHARACTERS[character];

  const total = useMemo(() => {
    let t = 6.22;
    if (bumps.oracoes) t += 3.99;
    if (bumps.guia) t += 14.9;
    return t;
  }, [bumps]);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem (JPG ou PNG).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setOriginalPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setStep("generating");
      try {
        const res = await callGenerate({
          data: {
            imageBase64: base64,
            mimeType: file.type,
            character,
          },
        });
        setGeneratedUrl(res.imageUrl);
        setStep("preview");
      } catch (e: any) {
        toast.error(e?.message ?? "Não foi possível gerar a foto.");
        setStep("idle");
      }
    };
    reader.readAsDataURL(file);
  }, [callGenerate, character]);

  const reset = () => {
    setStep("idle");
    setGeneratedUrl(null);
    setOriginalPreview(null);
    setShowPayment(false);
    setShowUpsell(false);
    setBumps({ oracoes: false, guia: false });
  };

  const simulatePayment = () => {
    setShowPayment(false);
    setStep("paid");
    setTimeout(() => setShowUpsell(true), 600);
    toast.success("Pagamento aprovado! Sua foto foi liberada.");
  };

  return (
    <div className="min-h-screen bg-background bg-parchment">
      <Toaster richColors position="top-center" />

      {/* TOP RIBBON */}
      <div className="w-full bg-[oklch(0.52_0.16_145)] text-[oklch(0.985_0.012_95)] text-xs tracking-[0.18em] uppercase py-2 text-center font-medium">
        🇧🇷 Ordem e Progresso · Pagamento 100% seguro · Entrega imediata
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrasilFlag className="w-9 h-6" />
          <div className="leading-tight">
            <div className="font-display text-2xl">bolsonaro meu amigo</div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">sua foto, sua história</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
          +12.847 fotos já entregues hoje
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {/* CHARACTER SWITCHER — discreet but visible */}
        <CharacterSwitcher value={character} onChange={(k) => { setCharacter(k); reset(); }} />

        {/* HERO */}
        <section className="grid md:grid-cols-2 gap-12 items-center mt-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[oklch(0.88_0.19_95)] text-[oklch(0.18_0.04_145)] text-xs font-semibold uppercase tracking-wider mb-5">
              <Sparkles className="w-3.5 h-3.5" /> {c.tagline}
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.02] mb-5">
              {c.headline}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-md">
              {c.sub}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Stat n="100%" label="aprovaram" />
              <Divider />
              <Stat n="< 30s" label="pra ficar pronta" />
              <Divider />
              <Stat n="HD" label="qualidade total" />
            </div>
          </div>

          {/* PHOTO STAGE */}
          <div className="relative">
            <div className="relative aspect-square rounded-2xl overflow-hidden border-4 border-[oklch(0.88_0.19_95)] shadow-[0_20px_60px_-15px_oklch(0.18_0.04_145/0.3)] bg-card">
              {step === "idle" && (
                <>
                  <img
                    src={c.example}
                    alt={`Exemplo de foto com ${c.name}`}
                    className="w-full h-full object-cover"
                    width={1024}
                    height={1024}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                  />
                  <div className="absolute top-3 left-3 bg-background/90 backdrop-blur px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold">
                    Exemplo
                  </div>
                </>
              )}

              {step === "generating" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card">
                  {originalPreview && (
                    <img src={originalPreview} alt="" className="absolute inset-0 w-full h-full object-cover blur-md opacity-30" />
                  )}
                  <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
                    <Loader2 className="w-10 h-10 animate-spin text-[oklch(0.52_0.16_145)]" />
                    <div className="font-display text-2xl">Gerando sua foto…</div>
                    <div className="text-sm text-muted-foreground">{c.short} está chegando pertinho de você 🇧🇷</div>
                  </div>
                </div>
              )}

              {(step === "preview" || step === "paid") && generatedUrl && (
                <>
                  <img
                    src={generatedUrl}
                    alt={`Sua foto com ${c.name}`}
                    className="w-full h-full object-cover"
                    width={1024}
                    height={1024}
                  />
                  {step === "preview" && <div className="watermark-overlay" />}
                  {step === "paid" && (
                    <div className="absolute top-3 right-3 bg-[oklch(0.52_0.16_145)] text-white px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Liberada
                    </div>
                  )}
                </>
              )}
            </div>

            {/* CTA Area */}
            <div className="mt-6">
              {step === "idle" && (
                <UploadButton onClick={() => fileRef.current?.click()} />
              )}
              {step === "preview" && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-[oklch(0.52_0.16_145)]/30"
                  >
                    <Lock className="w-5 h-5" />
                    Liberar minha foto
                  </button>
                  <button onClick={reset} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
                    Tentar outra foto
                  </button>
                </div>
              )}
              {step === "paid" && (
                <div className="space-y-3">
                  <a
                    href={generatedUrl!}
                    download={`bolsonaro-meu-amigo-${character}.png`}
                    className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    <Check className="w-5 h-5" /> Baixar foto em alta resolução
                  </a>
                  <button onClick={reset} className="w-full text-sm text-muted-foreground hover:text-foreground py-2">
                    Fazer outra foto
                  </button>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mt-24 grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Envie sua selfie", d: "Uma foto sua, bem iluminada e olhando pra câmera." },
            { n: "02", t: "Nossa IA monta a cena", d: `Em menos de 30 segundos, ${c.short} aparece do seu lado.` },
            { n: "03", t: "Libere e compartilhe", d: "Liberação imediata e sua foto fica sua, sem marca d'água." },
          ].map((s) => (
            <div key={s.n} className="bg-card border border-border rounded-2xl p-6">
              <div className="font-display text-3xl text-[oklch(0.52_0.16_145)] mb-3">{s.n}</div>
              <div className="font-semibold mb-1">{s.t}</div>
              <div className="text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </section>

        {/* FOOTER */}
        <footer className="mt-24 border-t border-border pt-8 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-3 h-3 text-[oklch(0.52_0.16_145)]" />
            Feito por brasileiros, para brasileiros.
          </div>
          <div>Site não oficial, sem vínculo com nenhuma pessoa pública. Imagens geradas por IA com fins de entretenimento.</div>
        </footer>
      </main>

      {showPayment && (
        <PaymentModal
          character={c.name}
          bumps={bumps}
          setBumps={setBumps}
          total={total}
          onClose={() => setShowPayment(false)}
          onPay={simulatePayment}
        />
      )}
      {showUpsell && <UpsellModal onClose={() => setShowUpsell(false)} />}
    </div>
  );
}

function CharacterSwitcher({ value, onChange }: { value: CharKey; onChange: (k: CharKey) => void }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-1 p-1 rounded-full bg-card border border-border shadow-sm">
        {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`px-4 md:px-5 py-2 rounded-full text-sm font-medium transition ${
                active
                  ? "bg-[oklch(0.18_0.04_145)] text-[oklch(0.985_0.012_95)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {CHARACTERS[key].short}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 transition shadow-xl shadow-[oklch(0.52_0.16_145)]/30 group"
    >
      <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition" />
      Enviar minha foto agora
    </button>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl leading-none">{n}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-border" />;
}

function BrasilFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 42" className={className} aria-hidden>
      <rect width="60" height="42" fill="#046a38" />
      <polygon points="30,4 56,21 30,38 4,21" fill="#fedf00" />
      <circle cx="30" cy="21" r="8" fill="#002776" />
    </svg>
  );
}

function PaymentModal({
  character,
  bumps,
  setBumps,
  total,
  onClose,
  onPay,
}: {
  character: string;
  bumps: { oracoes: boolean; guia: boolean };
  setBumps: (b: { oracoes: boolean; guia: boolean }) => void;
  total: number;
  onClose: () => void;
  onPay: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl max-w-lg w-full my-8 shadow-2xl border border-border overflow-hidden">
        <div className="bg-[oklch(0.52_0.16_145)] text-white px-6 py-4 flex items-center justify-between">
          <div className="font-display text-xl">Finalizar pedido</div>
          <button onClick={onClose} className="opacity-80 hover:opacity-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="font-semibold">Foto com {character}</div>
              <div className="text-xs text-muted-foreground">Versão HD sem marca d'água</div>
            </div>
            <div className="font-semibold">R$ 6,22</div>
          </div>

          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold pt-2">
            🔥 Adicione ao seu pedido
          </div>

          <OrderBump
            checked={bumps.oracoes}
            onToggle={() => setBumps({ ...bumps, oracoes: !bumps.oracoes })}
            title="250+ Orações Secretas"
            desc="Compilado exclusivo de orações poderosas para sua família e seu país."
            price="R$ 3,99"
            badge="MAIS PEDIDO"
          />
          <OrderBump
            checked={bumps.guia}
            onToggle={() => setBumps({ ...bumps, guia: !bumps.guia })}
            title="GUIA FILHO DE DIREITA"
            desc="O manual definitivo para criar seus filhos com os verdadeiros valores."
            price="R$ 14,90"
          />

          <div className="bg-muted rounded-xl p-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Total</div>
            <div className="font-display text-3xl">R$ {total.toFixed(2).replace(".", ",")}</div>
          </div>

          <button
            onClick={onPay}
            className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            Simular pagamento aprovado
          </button>

          <div className="text-[11px] text-center text-muted-foreground">
            🔒 Ambiente de teste · nenhum valor é cobrado
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderBump({
  checked, onToggle, title, desc, price, badge,
}: {
  checked: boolean; onToggle: () => void; title: string; desc: string; price: string; badge?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-xl border-2 border-dashed p-4 transition flex gap-3 ${
        checked
          ? "border-[oklch(0.52_0.16_145)] bg-[oklch(0.52_0.16_145)]/5"
          : "border-border hover:border-[oklch(0.52_0.16_145)]/50"
      }`}
    >
      <div className={`w-6 h-6 mt-0.5 rounded-md border-2 flex-shrink-0 flex items-center justify-center ${
        checked ? "bg-[oklch(0.52_0.16_145)] border-[oklch(0.52_0.16_145)]" : "border-border"
      }`}>
        {checked && <Check className="w-4 h-4 text-white" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-bold text-sm">{title}</div>
          {badge && <span className="text-[10px] bg-[oklch(0.88_0.19_95)] text-[oklch(0.18_0.04_145)] px-2 py-0.5 rounded font-bold">{badge}</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{desc}</div>
        <div className="text-sm font-semibold text-[oklch(0.52_0.16_145)] mt-2">+ {price}</div>
      </div>
    </button>
  );
}

function UpsellModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl max-w-lg w-full my-8 shadow-2xl border-2 border-[oklch(0.88_0.19_95)] overflow-hidden">
        <div className="bg-gradient-to-br from-[oklch(0.28_0.13_265)] to-[oklch(0.18_0.04_145)] text-white px-6 py-8 text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 opacity-70 hover:opacity-100"><X className="w-5 h-5" /></button>
          <div className="text-xs uppercase tracking-[0.3em] text-[oklch(0.88_0.19_95)] mb-2">Oferta única · só agora</div>
          <div className="font-display text-3xl md:text-4xl leading-tight">
            Acesso na ÍNTEGRA ao filme<br/>
            <span className="text-[oklch(0.88_0.19_95)]">DARK HORSE</span> completo
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            O documentário que a grande mídia não quis que você visse. Filme completo, sem cortes, em alta definição. Acesso vitalício.
          </p>

          <ul className="space-y-2 text-sm">
            {[
              "Filme completo, sem censura",
              "Conteúdo extra: entrevistas exclusivas",
              "Acesso vitalício, assista quando quiser",
            ].map((i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[oklch(0.52_0.16_145)] flex-shrink-0 mt-0.5" />
                <span>{i}</span>
              </li>
            ))}
          </ul>

          <div className="bg-muted rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground line-through">De R$ 97,00</div>
            <div className="font-display text-4xl text-[oklch(0.52_0.16_145)]">R$ 27,00</div>
            <div className="text-xs text-muted-foreground">à vista, hoje apenas</div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[oklch(0.88_0.19_95)] hover:bg-[oklch(0.82_0.19_95)] text-[oklch(0.18_0.04_145)] font-bold py-4 rounded-xl flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> SIM, QUERO O DARK HORSE!
          </button>
          <button onClick={onClose} className="w-full text-xs text-muted-foreground hover:text-foreground py-2">
            Não, obrigado. Recusar oferta e ir para minha foto.
          </button>
        </div>
      </div>
    </div>
  );
}
