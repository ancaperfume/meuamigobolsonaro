import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePhoto } from "@/lib/photo.functions";
import { createPixCharge, getOrderStatus } from "@/lib/payment.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Loader2, Upload, Lock, Check, ShieldCheck, Heart, Sparkles, X, Copy, Smartphone, Monitor, CheckCircle2, AlertCircle, Info, HelpCircle, ChevronRight } from "lucide-react";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

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
    sub: "Envie uma selfie sua e em segundos você aparece lado a lado ao Capitão.",
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
type PaidBumps = { oracoes: boolean; guia: boolean };

const SOCIAL_PROOFS = [
  { name: "José", city: "Campinas/SP", action: "baixou sua foto com o Mito" },
  { name: "Maria", city: "Goiânia/GO", action: "liberou sua foto com a Michelle" },
  { name: "Thiago", city: "Joinville/SC", action: "gerou uma foto com o Nikolas" },
  { name: "Carlos", city: "Brasília/DF", action: "baixou a foto com o Capitão" },
  { name: "Ana Paula", city: "Belo Horizonte/MG", action: "liberou a foto com o Mito" },
  { name: "Marcos", city: "Curitiba/PR", action: "gerou uma foto com o Senador Flávio" },
  { name: "Renato", city: "Ribeirão Preto/SP", action: "baixou sua foto com o Mito" },
  { name: "Letícia", city: "Porto Alegre/RS", action: "liberou a foto com a Michelle" },
];

function Index() {
  const [character, setCharacter] = useState<CharKey>("jair");
  const [step, setStep] = useState<Step>("idle");
  const [proof, setProof] = useState<typeof SOCIAL_PROOFS[0] | null>(null);

  useEffect(() => {
    const showNextProof = () => {
      const randomProof = SOCIAL_PROOFS[Math.floor(Math.random() * SOCIAL_PROOFS.length)];
      setProof(randomProof);
      setTimeout(() => setProof(null), 4000);
    };

    const interval = setInterval(showNextProof, 15000);
    const initialTimeout = setTimeout(showNextProof, 4000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const [paidBumps, setPaidBumps] = useState<PaidBumps>({ oracoes: false, guia: false });
  const [bumps, setBumps] = useState<PaidBumps>({
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
        if (typeof window !== "undefined" && window.fbq) {
          window.fbq("track", "ViewContent", {
            content_name: `Foto com ${character}`,
            content_category: "Visualização de Foto com IA",
          });
        }
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
    setPaidBumps({ oracoes: false, guia: false });
  };

  const handlePaid = useCallback(() => {
    setShowPayment(false);
    setPaidBumps(bumps);
    setStep("paid");
    setTimeout(() => setShowUpsell(true), 600);
    toast.success("Pagamento aprovado! Seus itens foram liberados.");
    // Meta Pixel — Purchase event
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", { value: total, currency: "BRL" });
    }
  }, [bumps, total]);

  return (
    <div className="min-h-screen bg-background bg-parchment">
      <Toaster richColors position="top-center" />

      {/* TOP RIBBON */}
      <div className="w-full bg-[oklch(0.52_0.16_145)] text-[oklch(0.985_0.012_95)] text-xs tracking-[0.18em] uppercase py-2 text-center font-medium">
        🇧🇷 Ordem e Progresso · Pagamento 100% seguro · Entrega imediata 🚀
      </div>

      {/* HEADER */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrasilFlag className="w-9 h-6" />
          <div className="leading-tight">
            <div className="font-display text-2xl">bolsonaro meu amigo 🇧🇷</div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">sua foto, sua história</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
          +12.847 fotos já entregues hoje
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-32 md:pb-20">
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
                  {(paidBumps.oracoes || paidBumps.guia) && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Seus bônus liberados
                      </div>
                      {paidBumps.oracoes && (
                        <a
                          href="/downloads/250-oracoes-secretas.pdf"
                          download
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-[oklch(0.88_0.19_95)]/40 transition text-sm font-medium"
                        >
                          <span>📖 250+ Orações Secretas (PDF)</span>
                          <span className="text-[oklch(0.52_0.16_145)]">Baixar</span>
                        </a>
                      )}
                      {paidBumps.guia && (
                        <a
                          href="/downloads/guia-filho-de-direita.pdf"
                          download
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-[oklch(0.88_0.19_95)]/40 transition text-sm font-medium"
                        >
                          <span>🛡️ Guia Filho de Direita (PDF)</span>
                          <span className="text-[oklch(0.52_0.16_145)]">Baixar</span>
                        </a>
                      )}
                    </div>
                  )}
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

      {/* SOCIAL PROOF FLOAT POPUP */}
      {proof && (
        <div className="fixed bottom-24 md:bottom-6 left-4 z-50 max-w-xs bg-card/95 border border-border backdrop-blur-md p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-left-5 duration-300">
          <div className="w-8 h-8 rounded-full bg-[oklch(0.88_0.19_95)] flex items-center justify-center text-sm font-bold text-[oklch(0.18_0.04_145)] flex-shrink-0">
            🇧🇷
          </div>
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-foreground">{proof.name} ({proof.city})</div>
            <div className="text-muted-foreground mt-0.5">{proof.action} há poucos segundos</div>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM MOBILE CTA */}
      {step !== "generating" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background/95 backdrop-blur-md border-t border-border md:hidden flex items-center justify-between gap-3 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
          {step === "idle" && (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition shadow-lg shadow-[oklch(0.52_0.16_145)]/20"
            >
              <Upload className="w-5 h-5 animate-bounce" />
              Enviar minha foto agora
            </button>
          )}
          {step === "preview" && (
            <div className="w-full flex gap-2">
              <button
                onClick={() => setShowPayment(true)}
                className="flex-1 bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-[oklch(0.52_0.16_145)]/20"
              >
                <Lock className="w-5 h-5" />
                Liberar minha foto
              </button>
              <button
                onClick={reset}
                className="px-4 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold rounded-xl flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          {step === "paid" && (
            <div className="w-full flex gap-2">
              <a
                href={generatedUrl!}
                download={`bolsonaro-meu-amigo-${character}.png`}
                className="flex-1 bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition text-center"
              >
                <Check className="w-5 h-5" /> Baixar foto
              </a>
              <button
                onClick={reset}
                className="px-4 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold rounded-xl flex items-center justify-center"
              >
                Nova
              </button>
            </div>
          )}
        </div>
      )}

      {showPayment && (
        <PaymentModal
          character={c.name}
          characterKey={character}
          bumps={bumps}
          setBumps={setBumps}
          total={total}
          onClose={() => setShowPayment(false)}
          onPaid={handlePaid}
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
    <div className="w-full">
      <button
        onClick={onClick}
        className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-5 rounded-xl flex items-center justify-center gap-3 transition shadow-xl shadow-[oklch(0.52_0.16_145)]/30 group"
      >
        <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition" />
        Enviar minha foto agora
      </button>
      <div className="text-xs text-center text-muted-foreground mt-2.5 font-medium flex items-center justify-center gap-1">
        <Sparkles className="w-3.5 h-3.5 text-[oklch(0.52_0.16_145)] animate-pulse" />
        <span>Ver prévia grátis em 15s (IA Premium Ativa)</span>
      </div>
    </div>
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
  characterKey,
  bumps,
  setBumps,
  total,
  onClose,
  onPaid,
}: {
  character: string;
  characterKey: CharKey;
  bumps: { oracoes: boolean; guia: boolean };
  setBumps: (b: { oracoes: boolean; guia: boolean }) => void;
  total: number;
  onClose: () => void;
  onPaid: () => void;
}) {
  const callCreate = useServerFn(createPixCharge);
  const callStatus = useServerFn(getOrderStatus);
  const [phase, setPhase] = useState<"cart" | "pix">("cart");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{ externalId: string; qrCode: string; qrCodeImage: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [copied, setCopied] = useState(false);
  const [pixTab, setPixTab] = useState<"mobile" | "computer">("mobile");

  useEffect(() => {
    if (phase !== "pix" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Poll order status every 3s while in pix phase
  useEffect(() => {
    if (phase !== "pix" || !pix) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await callStatus({ data: { externalId: pix.externalId } });
        if (active && res.status === "paid") {
          onPaid();
        }
      } catch (e) {
        // silent retry
      }
    };
    const id = setInterval(tick, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [phase, pix, callStatus, onPaid]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await callCreate({
        data: {
          amount: Number(total.toFixed(2)),
          character: characterKey,
          bumps,
        },
      });
      setPix(res);
      setPhase("pix");
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "InitiateCheckout", { value: total, currency: "BRL" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar o Pix.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (txt: string) => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      toast.success("Código Pix copiado!");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl max-w-lg w-full my-8 shadow-2xl border border-border overflow-hidden">
        <div className="bg-[oklch(0.52_0.16_145)] text-white px-6 py-4 flex items-center justify-between">
          <div className="font-display text-xl">
            {phase === "cart" ? "Finalizar pedido" : "Pague com Pix"}
          </div>
          <button onClick={onClose} className="opacity-80 hover:opacity-100"><X className="w-5 h-5" /></button>
        </div>

        {phase === "cart" && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <div className="font-semibold">Foto com {character}</div>
                <div className="text-xs text-muted-foreground">Versão HD sem marca d'água</div>
              </div>
              <div className="font-semibold text-right">
                <span className="text-xs text-muted-foreground line-through mr-2">R$ 19,90</span>
                <span className="text-[oklch(0.52_0.16_145)]">R$ 6,22</span>
              </div>
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
              <div className="text-sm text-muted-foreground">Total com desconto especial</div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground line-through block leading-none mb-1">R$ 19,90</span>
                <span className="font-display text-3xl">R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>

            {/* TRUST BADGES */}
            <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-border text-[9px] text-center text-muted-foreground uppercase tracking-wider font-semibold">
              <div className="flex flex-col items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                <span>Compra Protegida</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Check className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                <span>Entrega Imediata</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                <span>IA Ultra Realista</span>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] disabled:opacity-60 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {loading ? "Gerando Pix…" : "Pagar com Pix"}
            </button>

            <div className="text-[11px] text-center text-muted-foreground">
              🔒 Processado com segurança pela NexusPag
            </div>
          </div>
        )}

        {phase === "pix" && pix && (
          <div className="p-6 space-y-5">
            <div className="text-center">
              <div className="text-sm text-muted-foreground font-semibold">Valor total a pagar</div>
              <div className="font-display text-4xl text-[oklch(0.52_0.16_145)] font-bold">R$ {total.toFixed(2).replace(".", ",")}</div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl p-3 text-center text-xs font-semibold flex items-center justify-center gap-2">
              <span className="animate-pulse text-sm">⚠️</span>
              <span>Seu Pix promocional expira em: <span className="font-bold font-mono text-sm">{formatTime(timeLeft)}</span></span>
            </div>

            {/* ABA DE SELEÇÃO: CELULAR vs COMPUTADOR */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setPixTab("mobile")}
                className={`py-2.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${
                  pixTab === "mobile"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                Pagar no Celular
              </button>
              <button
                type="button"
                onClick={() => setPixTab("computer")}
                className={`py-2.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${
                  pixTab === "computer"
                    ? "bg-background text-foreground shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Monitor className="w-4 h-4 text-primary" />
                Pagar no Computador
              </button>
            </div>

            {/* CONTEÚDO DA ABA CELULAR (PIX COPIA E COLA) */}
            {pixTab === "mobile" && (
              <div className="space-y-4">
                {pix.qrCode && (
                  <div className="space-y-3">
                    <button
                      onClick={() => copy(pix.qrCode)}
                      className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg active:scale-98 ${
                        copied
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-600/30"
                          : "bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white border-2 border-yellow-400 shadow-[oklch(0.52_0.16_145)]/20 animate-pulse-slow"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-display text-lg font-bold">
                        {copied ? <Check className="w-6 h-6 animate-bounce" /> : <Copy className="w-5 h-5" />}
                        {copied ? "CÓDIGO COPIADO COM SUCESSO!" : "1. CLIQUE AQUI PARA COPIAR O PIX"}
                      </div>
                      <span className="text-[11px] opacity-90 font-medium">
                        {copied ? "Agora é só abrir o app do seu banco e colar" : "Toque acima para salvar o código no celular"}
                      </span>
                    </button>

                    {/* BANNER VISUAL GIGANTE DE CONFIRMAÇÃO */}
                    {copied && (
                      <div className="bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-xl p-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 font-bold text-base">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span>✅ PIX COPIADO!</span>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed">
                          Tudo pronto! O código Pix já está guardado no seu celular. Agora abra o aplicativo do seu banco para fazer o pagamento.
                        </p>
                      </div>
                    )}

                    {/* PASSO A PASSO DIDÁTICO */}
                    <div className="bg-muted/60 rounded-xl p-4 border border-border space-y-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 pb-2 border-b border-border">
                        <HelpCircle className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                        <span>Como Pagar no Celular? Passo a Passo</span>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                            copied ? "bg-emerald-600 text-white" : "bg-[oklch(0.52_0.16_145)] text-white"
                          }`}>
                            1
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Copie o código</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {copied 
                                ? "Concluído! O código já está copiado." 
                                : "Clique no botão verde acima para copiar o código Pix automático."}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[oklch(0.52_0.16_145)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            2
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Abra o App do seu Banco</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Saia desta tela e abra o aplicativo onde você costuma ver seu saldo ou fazer transferências (ex: Caixa, Banco do Brasil, Itaú, Bradesco, Nubank).
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[oklch(0.52_0.16_145)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            3
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Selecione "Pix Copia e Cola"</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Vá na área <strong>Pix</strong> do banco, depois procure pela opção <strong>Pix Copia e Cola</strong> (ou Pagar &gt; Pix Copia e Cola).
                            </p>
                            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg p-2.5 mt-2 text-[10px] font-semibold flex gap-2">
                              <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                              <span><strong>Super Dica:</strong> Ao abrir o app de alguns bancos (como Nubank e Itaú), ele detecta o código sozinho e pergunta: <em>"Quer fazer um Pix para a NexusPag?"</em>. Basta aceitar!</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <div className="w-7 h-7 rounded-full bg-[oklch(0.52_0.16_145)] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            4
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-foreground">Cole e confirme o pagamento</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Cole o código na caixinha, confira se o valor está correto e confirme a transação. O sistema detectará o pagamento na hora!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DETALHES DE EXPANSÃO PARA CÓDIGO POR EXTENSO */}
                    <div className="pt-1">
                      <details className="group">
                        <summary className="text-[10px] text-muted-foreground font-semibold cursor-pointer list-none flex items-center gap-1 hover:text-foreground transition select-none">
                          <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                          <span>Mostrar código Pix por extenso (se precisar ver ou copiar manualmente)</span>
                        </summary>
                        <div className="bg-muted rounded-lg p-2.5 text-[10px] break-all font-mono mt-1.5 max-h-20 overflow-y-auto border border-border select-all">
                          {pix.qrCode}
                        </div>
                      </details>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTEÚDO DA ABA COMPUTADOR (QR CODE) */}
            {pixTab === "computer" && (
              <div className="space-y-4 text-center">
                <p className="text-xs text-muted-foreground font-medium max-w-sm mx-auto">
                  Abra o aplicativo de banco no seu celular, escolha a opção **"Ler QR Code"** dentro do Pix e aponte a câmera para a tela abaixo:
                </p>

                {pix.qrCodeImage && (
                  <div className="flex justify-center">
                    <img
                      src={pix.qrCodeImage.startsWith("data:") ? pix.qrCodeImage : `data:image/png;base64,${pix.qrCodeImage}`}
                      alt="QR Code Pix"
                      className="w-52 h-52 rounded-lg border-4 border-[oklch(0.88_0.19_95)] bg-white p-1"
                    />
                  </div>
                )}

                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 rounded-xl p-3 text-[11px] font-semibold flex items-center justify-center gap-2 max-w-xs mx-auto">
                  <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>Use esta opção se estiver no computador e quiser pagar com o seu celular.</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center gap-2.5 text-xs text-muted-foreground py-2 border-t border-border pt-4">
              <Loader2 className="w-4 h-4 animate-spin text-[oklch(0.52_0.16_145)]" />
              <span className="font-semibold animate-pulse">Aguardando confirmação do pagamento…</span>
            </div>

            <div className="text-[10px] text-center text-muted-foreground font-medium">
              🔒 Liberação automática imediata. Não feche esta janela após pagar.
            </div>
          </div>
        )}
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
