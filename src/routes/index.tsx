import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePhoto, getGenerationsLog } from "@/lib/photo.functions";
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

const RETENTION_TIPS = [
  "⭐ Dica: Sua foto final será entregue em alta resolução HD e sem marcas d'água após liberação.",
  "🔒 Segurança: Nossos servidores processam sua imagem de forma 100% segura e confidencial.",
  "🇧🇷 Mais de 15.000 brasileiros já tiraram sua foto oficial com seus líderes favoritos hoje.",
  "⚡ Sabia que? Nossa IA analisa mais de 120 pontos faciais para garantir o máximo realismo na montagem."
];

const getGenerationLogs = (charShort: string) => [
  "🔍 Analisando as feições e iluminação do seu rosto...",
  "🎨 Ajustando as cores e o contraste com inteligência artificial...",
  `🇧🇷 Posicionando você lado a lado com o ${charShort}...`,
  "⚡ Renderizando imagem em alta definição e removendo ruídos...",
  "✨ Dando os últimos retoques de realismo... Quase pronto!"
];

function Index() {
  const [character, setCharacter] = useState<CharKey>("jair");
  const [step, setStep] = useState<Step>("idle");
  const [proof, setProof] = useState<typeof SOCIAL_PROOFS[0] | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [showCrossSellModal, setShowCrossSellModal] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [promoPrice, setPromoPrice] = useState(6.22);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("teste") === "true" || params.get("dev") === "true") {
        setIsDevMode(true);
        toast.info("Modo de Testes Ativado ⚡");
      }
    }
  }, []);

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

  useEffect(() => {
    if (step !== "generating") {
      setProgress(0);
      setLogIndex(0);
      setTipIndex(0);
      return;
    }

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      // Exponential curve: starts fast, slows down, asymptotes towards 99%
      const nextProgress = Math.min(99, Math.round(99 * (1 - Math.exp(-elapsedMs / 7000))));
      setProgress(nextProgress);
    }, 100);

    // Rotate log messages every 3.5 seconds (stopping at last step)
    const logInterval = setInterval(() => {
      setLogIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 3500);

    // Rotate retention tips every 5.0 seconds
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % RETENTION_TIPS.length);
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      clearInterval(tipInterval);
    };
  }, [step]);

  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [activeUpsell, setActiveUpsell] = useState<"darkhorse" | "grupo" | null>(null);
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
    let t = promoPrice;
    if (bumps.oracoes) t += 3.99;
    if (bumps.guia) t += 14.9;
    return t;
  }, [bumps, promoPrice]);

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
    setActiveUpsell(null);
    setBumps({ oracoes: false, guia: false });
    setPaidBumps({ oracoes: false, guia: false });
    setProgress(0);
    setLogIndex(0);
    setTipIndex(0);
    setHasDownloaded(false);
    setPromoPrice(6.22);
  };

  const handlePaid = useCallback(() => {
    setShowPayment(false);
    setPaidBumps(bumps);
    setStep("paid");
    setTimeout(() => setActiveUpsell("darkhorse"), 600);
    toast.success("Pagamento aprovado! Seus itens foram liberados.");
    // Meta Pixel — Purchase event
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "Purchase", { value: total, currency: "BRL" });
    }
  }, [bumps, total]);

  const shareText = useMemo(() => {
    return `Olha que incrível a foto realista que eu criei lado a lado com o meu amigo ${CHARACTERS[character].name}! 🇧🇷 Faça a sua também em segundos no site: ${typeof window !== "undefined" ? window.location.origin : "https://meuamigobolsonaro.com.br"}`;
  }, [character]);

  const handleShareNative = useCallback(async () => {
    if (typeof window !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Meu Amigo Bolsonaro",
          text: shareText,
          url: window.location.origin,
        });
      } catch (e) {
        // ignore cancellation
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast.success("Legenda e link copiados! Agora é só colar nas suas redes sociais.");
      } catch {
        toast.error("Não foi possível copiar automaticamente.");
      }
    }
  }, [shareText]);

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
            <h1 className="font-display text-3xl xs:text-4xl sm:text-5xl md:text-6xl leading-[1.02] mb-5">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card text-foreground overflow-hidden">
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scanner-sweep {
                      0% { transform: translateY(0); }
                      50% { transform: translateY(calc(100% - 6px)); }
                      100% { transform: translateY(0); }
                    }
                    .scanner-container {
                      position: relative;
                      width: 100%;
                      height: 100%;
                      overflow: hidden;
                    }
                    .scanner-line {
                      position: absolute;
                      top: 0;
                      left: 0;
                      width: 100%;
                      height: 6px;
                      background: linear-gradient(90deg, 
                        rgba(254, 223, 0, 0) 0%, 
                        rgba(254, 223, 0, 1) 20%, 
                        rgba(4, 106, 56, 1) 50%, 
                        rgba(254, 223, 0, 1) 80%, 
                        rgba(254, 223, 0, 0) 100%
                      );
                      box-shadow: 0 0 15px rgba(254, 223, 0, 0.8), 0 0 25px rgba(4, 106, 56, 0.8);
                      animation: scanner-sweep 3.5s ease-in-out infinite;
                      z-index: 20;
                    }
                    .pulse-soft {
                      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    }
                    @keyframes pulse {
                      0%, 100% { opacity: 1; }
                      50% { opacity: 0.6; }
                    }
                  `}} />

                  {/* BLURRED BACKGROUND PREVIEW WITH SCANNER */}
                  <div className="absolute inset-0 scanner-container">
                    {originalPreview ? (
                      <img 
                        src={originalPreview} 
                        alt="Sua foto de entrada" 
                        className="w-full h-full object-cover blur-[5px] brightness-[0.4]" 
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950/80" />
                    )}
                    <div className="scanner-line" />
                  </div>

                  {/* HIGH-TECH FLOATING GRID/UI ELEMENTS */}
                  <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-2xl z-10 flex flex-col justify-between p-4">
                    <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono tracking-wider bg-black/40 backdrop-blur px-2.5 py-1 rounded-full border border-emerald-500/20 self-start">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-2" />
                      PROCESSANDO FACE
                    </div>
                  </div>

                  {/* CENTRAL SCANNER HUD */}
                  <div className="relative z-30 flex flex-col items-center gap-3 bg-black/55 backdrop-blur-md border border-white/10 rounded-2xl p-5 text-center shadow-lg">
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                      <Loader2 className="w-8 h-8 animate-spin text-yellow-400 opacity-80 absolute" />
                    </div>
                    <div className="font-mono text-[9px] text-emerald-400 uppercase tracking-widest font-bold animate-pulse">Alinhando Traços IA</div>
                    <div className="font-display text-3xl text-white font-extrabold leading-none">
                      {progress}%
                    </div>
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
                <div className="space-y-3">
                  <UploadButton onClick={() => fileRef.current?.click()} />
                  {isDevMode && (
                    <button
                      onClick={() => {
                        setOriginalPreview(c.example);
                        setGeneratedUrl(c.example);
                        setStep("preview");
                        setShowPayment(true);
                        toast.info("Geração simulada com sucesso! Checkout aberto.");
                      }}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-dashed border-amber-500/30 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition text-xs cursor-pointer animate-pulse"
                    >
                      ⚡ Testar/Simular Checkout Rápido
                    </button>
                  )}
                </div>
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
                <div className="space-y-5">
                  <a
                    href={generatedUrl!}
                    download={`bolsonaro-meu-amigo-${character}.png`}
                    onClick={() => {
                      setHasDownloaded(true);
                      toast.success("Download iniciado! 🇧🇷");
                    }}
                    className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg animate-pulse"
                  >
                    <Check className="w-5 h-5" /> Baixar foto em alta resolução
                  </a>

                  {!hasDownloaded && (
                    <div className="bg-amber-500/10 border-2 border-dashed border-amber-500/25 text-amber-800 dark:text-amber-300 rounded-xl p-4 text-center text-xs font-semibold leading-relaxed">
                      📥 Clique no botão verde acima para baixar e salvar sua foto HD no celular. Após salvar, você poderá compartilhar com sua família e resgatar seus presentes!
                    </div>
                  )}

                  {hasDownloaded && (
                    <div className="space-y-5 animate-in fade-in duration-500">
                      {/* COMPARTILHAMENTO NAS REDES SOCIAIS */}
                      <div className="bg-card border-2 border-dashed border-[oklch(0.52_0.16_145)]/40 rounded-2xl p-4.5 space-y-3">
                        <div className="text-sm font-bold text-center text-foreground flex items-center justify-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-[oklch(0.52_0.16_145)]" />
                          <span>🇧🇷 COMPARTILHE COM SEUS AMIGOS!</span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground text-center leading-relaxed">
                          Mostre para toda a sua família e amigos a sua foto oficial com {c.short}!
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          {/* WHATSAPP */}
                          <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] shadow-md shadow-[#25D366]/20 transition"
                          >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.288 1.489 4.954 1.49 5.375 0 9.75-4.332 9.753-9.674.002-2.587-1.002-5.02-2.828-6.848S14.286 1.252 11.7 1.25c-5.38 0-9.757 4.335-9.76 9.676-.001 1.77.478 3.498 1.388 5.067L2.247 21.8l5.8-.954zM16.9 14.94c-.266-.134-1.58-.78-1.828-.87-.247-.09-.427-.134-.607.134-.18.267-.697.87-.852 1.048-.157.177-.313.2-.58.066-.268-.133-1.13-.417-2.153-1.332-.796-.71-1.333-1.59-1.49-1.857-.156-.266-.017-.41.118-.544.12-.12.268-.313.402-.47.135-.156.18-.266.27-.445.09-.177.046-.332-.023-.466-.068-.134-.607-1.464-.83-2.005-.22-.527-.436-.456-.6-.464-.15-.008-.324-.01-.497-.01-.174 0-.457.065-.697.325-.24.26-.917.896-.917 2.186 0 1.29.938 2.533 1.07 2.71.13.178 1.843 2.813 4.464 3.94.623.268 1.11.428 1.49.548.627.2 1.2.172 1.65.105.5-.075 1.58-.646 1.802-1.27.22-.625.22-1.16.155-1.27-.066-.11-.247-.176-.513-.31z"/></svg>
                            <span>WhatsApp</span>
                          </a>

                          {/* FACEBOOK */}
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'https://meuamigobolsonaro.com.br')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1877F2] hover:bg-[#156bec] text-white font-bold py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] shadow-md shadow-[#1877F2]/20 transition"
                          >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                            <span>Facebook</span>
                          </a>

                          {/* INSTAGRAM */}
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(shareText);
                                toast.success("Legenda copiada com sucesso!");
                              } catch (e) {
                                // ignore
                              }
                              window.open("https://www.instagram.com", "_blank");
                            }}
                            className="bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:brightness-110 text-white font-bold py-2.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] shadow-md shadow-[#ee2a7b]/20 transition cursor-pointer"
                          >
                            <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                            <span>Instagram</span>
                          </button>
                        </div>

                        <button
                          onClick={handleShareNative}
                          className="w-full py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 border border-border transition cursor-pointer"
                        >
                          <span>🔗 Copiar Link & Legenda</span>
                        </button>
                      </div>

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

                      {/* PÓS-COMPRA: OUTROS MEMBROS CROSS-SELL */}
                      <div className="bg-muted/65 border border-border rounded-2xl p-5 space-y-4 text-center">
                        <div className="text-[10px] uppercase tracking-widest text-[oklch(0.52_0.16_145)] font-extrabold">
                          🎉 Oferta de Cliente Especial!
                        </div>
                        <h3 className="font-display text-base font-bold text-foreground leading-tight">
                          Gostou? Complete seu álbum com outros ídolos!
                        </h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Você já tem sua foto com {c.short}. Tire uma foto com os outros membros por um preço super especial!
                        </p>

                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          {Object.keys(CHARACTERS).map((key) => {
                            const charKey = key as CharKey;
                            if (charKey === character) return null;
                            const ch = CHARACTERS[charKey];
                            return (
                              <button
                                key={charKey}
                                onClick={() => {
                                  setCharacter(charKey);
                                  reset();
                                  toast.success(`Personagem alterado para ${ch.short}! Envie sua selfie para começar!`);
                                }}
                                className="bg-card hover:bg-[oklch(0.88_0.19_95)]/20 border border-border hover:border-[oklch(0.52_0.16_145)]/40 rounded-xl p-3 text-center transition flex flex-col items-center gap-1.5 group cursor-pointer"
                              >
                                <img
                                  src={ch.example}
                                  alt={ch.name}
                                  className="w-10 h-10 rounded-full object-cover border border-border group-hover:border-[oklch(0.52_0.16_145)]/50 transition"
                                />
                                <div className="text-[11px] font-bold text-foreground leading-tight">
                                  Foto com {ch.short}
                                </div>
                                <span className="text-[9px] text-[oklch(0.52_0.16_145)] font-bold">
                                  Criar Foto →
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={reset} className="w-full text-sm text-muted-foreground hover:text-foreground py-2 cursor-pointer">
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
            <button 
              type="button"
              onClick={() => setShowAdminLogin(true)}
              className="text-[9px] opacity-20 hover:opacity-100 transition font-mono ml-2 underline cursor-pointer"
            >
              [Admin Login]
            </button>
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
                onClick={() => {
                  setHasDownloaded(true);
                  toast.success("Download iniciado! 🇧🇷");
                }}
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
          isDevMode={isDevMode}
          generatedUrl={generatedUrl}
        />
      )}
      {activeUpsell === "darkhorse" && (
        <UpsellModal 
          type="darkhorse"
          characterKey={character} 
          isDevMode={isDevMode} 
          onClose={() => setActiveUpsell("grupo")} 
        />
      )}
      {activeUpsell === "grupo" && (
        <UpsellModal 
          type="grupo"
          characterKey={character} 
          isDevMode={isDevMode} 
          onClose={() => {
            setActiveUpsell(null);
            setShowCrossSellModal(true);
          }} 
        />
      )}
      {isDevMode && (step === "preview" || step === "paid") && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4 space-y-2 text-xs">
          <div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <span>🛠️ PAINEL DO DESENVOLVEDOR</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {step === "preview" && (
              <button
                onClick={() => {
                  setStep("paid");
                  toast.success("Foto liberada via Painel Dev! 🎉");
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition"
              >
                🔓 Liberar Foto Grátis
              </button>
            )}
            <button
              onClick={() => {
                if (generatedUrl) {
                  navigator.clipboard.writeText(generatedUrl);
                  toast.success("URL copiada!");
                }
              }}
              className="bg-muted hover:bg-muted/80 text-foreground font-semibold px-3 py-1.5 rounded-lg transition border border-border"
            >
              📋 Copiar URL
            </button>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition border border-slate-700"
            >
              ⚙️ Dashboard Admin (Logs)
            </button>
          </div>
          {generatedUrl && (
            <div className="text-[10px] text-muted-foreground break-all select-all font-mono">
              <strong>URL:</strong> {generatedUrl}
            </div>
          )}
        </div>
      )}
      {showCrossSellModal && (
        <CrossSellModal
          onClose={() => setShowCrossSellModal(false)}
          onSelectCharacter={(charKey) => {
            setCharacter(charKey);
            reset();
            setPromoPrice(4.99);
            toast.success(`Personagem alterado para ${CHARACTERS[charKey].short}! Desconto de Pós-Venda Ativo: R$ 4,99! 🇧🇷`);
          }}
        />
      )}
      {showAdminLogin && (
        <AdminLoginModal
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setShowAdminLogin(false);
            setIsAdminLoggedIn(true);
            setShowAdminPanel(true);
          }}
        />
      )}
      {showAdminPanel && isAdminLoggedIn && (
        <DevDashboardModal
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </div>
  );
}

function CharacterSwitcher({ value, onChange }: { value: CharKey; onChange: (k: CharKey) => void }) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center gap-0.5 sm:gap-1 p-1 rounded-full bg-card border border-border shadow-sm max-w-full overflow-x-auto no-scrollbar">
        {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
          const active = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`px-2.5 sm:px-4 md:px-5 py-1.5 md:py-2 rounded-full text-xs sm:text-sm font-semibold transition flex-shrink-0 ${
                active
                  ? "bg-[oklch(0.18_0.04_145)] text-[oklch(0.985_0.012_95)] shadow-sm"
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
  isDevMode,
}: {
  character: string;
  characterKey: CharKey;
  bumps: { oracoes: boolean; guia: boolean };
  setBumps: (b: { oracoes: boolean; guia: boolean }) => void;
  total: number;
  onClose: () => void;
  onPaid: () => void;
  isDevMode: boolean;
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
      <div className="bg-background rounded-2xl max-w-lg w-full my-8 shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[oklch(0.52_0.16_145)] text-white px-6 py-4 flex items-center justify-between sticky top-0 z-50 flex-shrink-0">
          <div className="font-display text-xl font-bold">
            {phase === "cart" ? "Finalizar pedido" : "Pague com Pix"}
          </div>
          <button onClick={onClose} className="opacity-80 hover:opacity-100 p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"><X className="w-6 h-6" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {phase === "cart" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <div className="font-semibold">Foto com {character}</div>
                  <div className="text-xs text-muted-foreground">Versão HD sem marca d'água</div>
                </div>
                <div className="font-semibold text-right">
                  <span className="text-xs text-muted-foreground line-through mr-2">R$ 19,90</span>
                  <span className="text-[oklch(0.52_0.16_145)]">
                    R$ {(total - (bumps.oracoes ? 3.99 : 0) - (bumps.guia ? 14.9 : 0)).toFixed(2).replace(".", ",")}
                  </span>
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
                🔒 Processado com segurança por AGENCIA DE MODELOS
              </div>
            </div>
          )}

          {phase === "pix" && pix && (
            <div className="space-y-5">
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
                                <span><strong>Super Dica:</strong> Ao abrir o app de alguns bancos (como Nubank e Itaú), ele detecta o código sozinho e pergunta: <em>"Quer fazer um Pix para AGENCIA DE MODELOS?"</em>. Basta aceitar!</span>
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

              {/* SIMULAR CONFIRMAÇÃO DE PAGAMENTO E ENTREGA */}
              {isDevMode && (
                <button
                  type="button"
                  onClick={onPaid}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md shadow-amber-500/20 cursor-pointer animate-pulse-slow transition active:scale-98"
                >
                  ⚡ Simular Confirmação e Entregar Imagem
                </button>
              )}

              <div className="text-[10px] text-center text-muted-foreground font-medium">
                🔒 Liberação automática imediata. Não feche esta janela após pagar.
              </div>
            </div>
          )}
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

function UpsellModal({
  type,
  characterKey,
  isDevMode,
  onClose,
}: {
  type: "darkhorse" | "grupo";
  characterKey: CharKey;
  isDevMode: boolean;
  onClose: (bought: boolean) => void;
}) {
  const callCreate = useServerFn(createPixCharge);
  const callStatus = useServerFn(getOrderStatus);
  const [phase, setPhase] = useState<"offer" | "pix">("offer");
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<{ externalId: string; qrCode: string; qrCodeImage: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [copied, setCopied] = useState(false);
  const [pixTab, setPixTab] = useState<"mobile" | "computer">("mobile");

  const content = useMemo(() => {
    if (type === "darkhorse") {
      return {
        titleOffer: <>Acesso na ÍNTEGRA ao filme<br/><span className="text-[oklch(0.88_0.19_95)]">DARK HORSE</span> completo</>,
        titlePix: "Pague com Pix (Dark Horse)",
        desc: "O documentário que a grande mídia não quis que você visse. Filme completo, sem cortes, em alta definição. Acesso vitalício imediato.",
        features: [
          "Filme completo em alta definição (HD)",
          "Conteúdo exclusivo: entrevistas censuradas",
          "Acesso vitalício, assista quando e onde quiser",
        ],
        btnLabel: "SIM, QUERO O DARK HORSE!",
        btnLoadingLabel: "Gerando Pix do Dark Horse...",
        simulatedLabel: "⚡ Simular Pagamento Aprovado (R$ 27)",
        toastSuccess: "Pagamento do Dark Horse aprovado! Seu acesso foi liberado.",
        downloadFile: "/downloads/dark-horse.pdf",
        downloadName: "dark-horse.pdf",
      };
    } else {
      return {
        titleOffer: <>Grupo Exclusivo<br/><span className="text-[oklch(0.88_0.19_95)]">FAMÍLIA BOLSONARO</span> VIP</>,
        titlePix: "Pague com Pix (Grupo VIP)",
        desc: "Participe da comunidade VIP secreta de WhatsApp e Telegram com os bastidores dos maiores líderes conservadores e patriotas do Brasil.",
        features: [
          "Notícias e bastidores exclusivos direto da fonte",
          "Grupo VIP com outros patriotas influentes",
          "Lives secretas e debates sem censura toda semana",
        ],
        btnLabel: "QUERO ENTRAR NO GRUPO VIP!",
        btnLoadingLabel: "Gerando Pix do Grupo VIP...",
        simulatedLabel: "⚡ Simular Entrada no Grupo VIP (R$ 27)",
        toastSuccess: "Inscrição aprovada! Bem-vindo à Família VIP.",
        downloadFile: "https://t.me/GrupoExclusivoFamiliaBolsonaro",
        downloadName: "grupo_VIP.html",
      };
    }
  }, [type]);

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

  // Poll order status
  useEffect(() => {
    if (phase !== "pix" || !pix) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await callStatus({ data: { externalId: pix.externalId } });
        if (active && res.status === "paid") {
          toast.success(content.toastSuccess);
          if (type === "darkhorse") {
            const link = document.createElement("a");
            link.href = content.downloadFile;
            link.download = content.downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
            window.open(content.downloadFile, "_blank");
          }
          onClose(true);
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
  }, [phase, pix, callStatus, onClose, content, type]);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const res = await callCreate({
        data: {
          amount: 27.00,
          character: characterKey,
          bumps: { oracoes: false, guia: false },
        },
      });
      setPix(res);
      setPhase("pix");
      if (typeof window !== "undefined" && window.fbq) {
        window.fbq("track", "InitiateCheckout", { value: 27.00, currency: "BRL" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? `Falha ao gerar o Pix: ${content.btnLoadingLabel}`);
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

  const simulateSuccess = () => {
    toast.success(`${content.toastSuccess} (Simulado)`);
    if (type === "darkhorse") {
      const link = document.createElement("a");
      link.href = content.downloadFile;
      link.download = content.downloadName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(content.downloadFile, "_blank");
    }
    onClose(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-2xl max-w-lg w-full my-8 shadow-2xl border-2 border-[oklch(0.88_0.19_95)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-br from-[oklch(0.28_0.13_265)] to-[oklch(0.18_0.04_145)] text-white px-6 py-8 text-center relative flex-shrink-0 sticky top-0 z-50">
          <button onClick={() => onClose(false)} className="absolute top-4 right-4 opacity-70 hover:opacity-100 cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition"><X className="w-6 h-6" /></button>
          <div className="text-xs uppercase tracking-[0.3em] text-[oklch(0.88_0.19_95)] mb-2">Oferta única · só agora</div>
          <div className="font-display text-2xl md:text-3xl leading-tight">
            {phase === "offer" ? content.titleOffer : content.titlePix}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {phase === "offer" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {content.desc}
              </p>

              <ul className="space-y-2.5 text-sm">
                {content.features.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-[oklch(0.52_0.16_145)] flex-shrink-0 mt-0.5" />
                    <span className="text-foreground font-medium">{i}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-muted rounded-xl p-4 text-center border border-border">
                <div className="text-xs text-muted-foreground line-through font-semibold">De R$ 97,00</div>
                <div className="font-display text-4xl text-[oklch(0.52_0.16_145)] font-bold">R$ 27,00</div>
                <div className="text-xs text-muted-foreground font-medium">à vista, hoje apenas</div>
              </div>

              <button
                onClick={handleBuy}
                disabled={loading}
                className="w-full bg-[oklch(0.88_0.19_95)] hover:bg-[oklch(0.82_0.19_95)] text-[oklch(0.18_0.04_145)] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[oklch(0.88_0.19_95)]/20 active:scale-98"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {loading ? content.btnLoadingLabel : content.btnLabel}
              </button>
              
              <button onClick={() => onClose(false)} className="w-full text-xs text-muted-foreground hover:text-foreground py-2 font-medium cursor-pointer">
                Não, obrigado. Recusar oferta e ir para minha foto.
              </button>
            </div>
          )}

          {phase === "pix" && pix && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-sm text-muted-foreground font-semibold">Valor da Oferta</div>
                <div className="font-display text-3xl text-[oklch(0.52_0.16_145)] font-bold">R$ 27,00</div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl p-3 text-center text-xs font-semibold flex items-center justify-center gap-2">
                <span className="animate-pulse text-sm">⚠️</span>
                <span>Expira em: <span className="font-bold font-mono text-sm">{formatTime(timeLeft)}</span></span>
              </div>

              {/* ABA DE SELEÇÃO */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border border-border">
                <button
                  type="button"
                  onClick={() => setPixTab("mobile")}
                  className={`py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
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
                  className={`py-2 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    pixTab === "computer"
                      ? "bg-background text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Monitor className="w-4 h-4 text-primary" />
                  Pagar no Computador
                </button>
              </div>

              {/* CONTEÚDO CELULAR */}
              {pixTab === "mobile" && (
                <div className="space-y-4">
                  {pix.qrCode && (
                    <div className="space-y-3">
                      <button
                        onClick={() => copy(pix.qrCode)}
                        className={`w-full py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg active:scale-98 cursor-pointer ${
                          copied
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-4 ring-emerald-600/30"
                            : "bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white border-2 border-yellow-400 shadow-[oklch(0.52_0.16_145)]/20 animate-pulse-slow"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-display text-base font-bold">
                          {copied ? <Check className="w-5 h-5 animate-bounce" /> : <Copy className="w-4.5 h-4.5" />}
                          {copied ? "CÓDIGO COPIADO COM SUCESSO!" : "1. CLIQUE AQUI PARA COPIAR O PIX"}
                        </div>
                      </button>

                      {copied && (
                        <div className="bg-emerald-500/10 border-2 border-emerald-500 text-emerald-800 dark:text-emerald-300 rounded-xl p-3.5 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                            <span>✅ PIX COPIADO!</span>
                          </div>
                          <p className="text-[11px] font-semibold leading-relaxed">
                            Agora abra o aplicativo do seu banco, escolha Pix Copia e Cola, cole o código e confirme!
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO COMPUTADOR */}
              {pixTab === "computer" && (
                <div className="space-y-4 text-center">
                  <p className="text-[11px] text-muted-foreground font-medium max-w-sm mx-auto">
                    Aponte a câmera do celular para ler o QR Code abaixo no Pix do seu app:
                  </p>

                  {pix.qrCodeImage && (
                    <div className="flex justify-center">
                      <img
                        src={pix.qrCodeImage.startsWith("data:") ? pix.qrCodeImage : `data:image/png;base64,${pix.qrCodeImage}`}
                        alt="QR Code Pix"
                        className="w-44 h-44 rounded-lg border-2 border-border bg-white p-1"
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2 border-t border-border pt-4">
                <Loader2 className="w-4.5 h-4.5 animate-spin text-[oklch(0.52_0.16_145)]" />
                <span className="font-semibold animate-pulse">Aguardando confirmação do pagamento…</span>
              </div>

              {/* SIMULAÇÃO DE PAGAMENTO DO UPSELL */}
              {isDevMode && (
                <button
                  type="button"
                  onClick={simulateSuccess}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md shadow-amber-500/20 cursor-pointer animate-pulse transition active:scale-98"
                >
                  {content.simulatedLabel}
                </button>
              )}

              <div className="text-[10px] text-center text-muted-foreground font-medium">
                🔒 Liberação e download automático imediato. Não feche essa tela.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CrossSellModal({
  onClose,
  onSelectCharacter,
}: {
  onClose: () => void;
  onSelectCharacter: (charKey: CharKey) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-3xl max-w-lg w-full my-8 shadow-[0_20px_50px_rgba(4,106,56,0.3)] border-2 border-emerald-500/50 overflow-hidden flex flex-col max-h-[90vh] animate-in scale-in duration-300">
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-green-700 text-white px-6 py-8 text-center relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 opacity-70 hover:opacity-100 cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="inline-flex items-center gap-1 bg-yellow-400 text-emerald-950 text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider mb-3 animate-bounce">
            <Sparkles className="w-3.5 h-3.5 fill-current" /> OFERTA EXCLUSIVA DE AGRADECIMENTO
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-black leading-tight">
            Coleção Família Bolsonaro! 🇧🇷
          </h2>
          <p className="text-xs opacity-90 mt-2 font-medium">
            Você já garantiu sua foto espetacular! Que tal fazer história e completar seu álbum de patriota com os outros membros por apenas <strong>R$ 4,99</strong> cada? (75% de Desconto!)
          </p>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 gap-3">
            {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
              const ch = CHARACTERS[key];
              return (
                <div
                  key={key}
                  className="bg-card hover:bg-emerald-500/5 border border-border hover:border-emerald-500/30 rounded-2xl p-4 transition-all duration-300 flex items-center gap-4 group relative overflow-hidden"
                >
                  <img
                    src={ch.example}
                    alt={ch.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500/20 group-hover:border-emerald-500/50 transition-all flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-base text-foreground leading-tight">{ch.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{ch.tagline} · {ch.sub.substring(0, 45)}...</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] line-through text-muted-foreground">R$ 19,90</span>
                      <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                        R$ 4,99
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelectCharacter(key);
                      onClose();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md group-hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>Criar Foto</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed">
              ⭐ Essa oferta de R$ 4,99 é exclusiva e ficará disponível apenas enquanto esta página estiver aberta. Complete sua coleção e guarde essa recordação para sempre!
            </p>
          </div>
        </div>

        <div className="p-4 bg-muted border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-semibold flex-shrink-0">
          <span>🔒 Transação protegida e imediata</span>
          <button onClick={onClose} className="hover:text-foreground transition underline cursor-pointer">
            Recusar e ver minha foto atual
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminLoginModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "patriaamada") {
      toast.success("Login realizado com sucesso! Bem-vindo, Administrador! 🇧🇷");
      onSuccess();
    } else {
      toast.error("Credenciais inválidas. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl max-w-sm w-full shadow-2xl border border-border overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[oklch(0.52_0.16_145)] flex items-center justify-center text-white font-bold">
              🛠️
            </div>
            <div className="font-display font-extrabold text-lg text-foreground">Painel de Acesso Dev</div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-muted border border-border focus:border-[oklch(0.52_0.16_145)] focus:ring-1 focus:ring-[oklch(0.52_0.16_145)] rounded-xl py-3 px-4 text-sm outline-none transition"
              placeholder="Digite o usuário"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-muted border border-border focus:border-[oklch(0.52_0.16_145)] focus:ring-1 focus:ring-[oklch(0.52_0.16_145)] rounded-xl py-3 px-4 text-sm outline-none transition"
              placeholder="Digite a senha"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[oklch(0.52_0.16_145)] hover:bg-[oklch(0.45_0.16_145)] text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-[oklch(0.52_0.16_145)]/20 mt-2"
          >
            Entrar no Painel Dev
          </button>
        </form>
      </div>
    </div>
  );
}

function DevDashboardModal({ onClose }: { onClose: () => void }) {
  const callGetLogs = useServerFn(getGenerationsLog);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    const fetchLogs = async () => {
      try {
        const res = await callGetLogs();
        if (active && res.logs) {
          setLogs(res.logs);
        }
      } catch (err) {
        toast.error("Erro ao carregar logs.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLogs();
    return () => { active = false; };
  }, [callGetLogs]);

  const stats = useMemo(() => {
    const total = logs.length;
    const chars: Record<string, number> = {};
    logs.forEach((l) => {
      chars[l.character] = (chars[l.character] || 0) + 1;
    });
    return { total, chars };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return logs;
    return logs.filter((l) => {
      const charName = CHARACTERS[l.character as CharKey]?.name?.toLowerCase() || l.character.toLowerCase();
      const ip = l.ip.toLowerCase();
      const dateStr = new Date(l.timestamp).toLocaleString("pt-BR").toLowerCase();
      return charName.includes(s) || ip.includes(s) || dateStr.includes(s) || (l.status && l.status.toLowerCase().includes(s));
    });
  }, [logs, search]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const handleDownload = (url: string, char: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `gerada-${char}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download iniciado!");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-slate-950 text-slate-100 rounded-3xl max-w-5xl w-full h-[90vh] shadow-2xl border border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-slate-50">Dashboard do Desenvolvedor</h2>
              <p className="text-[10px] text-slate-400">Logs de Imagens Geradas (Local + Supabase)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm text-slate-400 font-medium">Carregando logs de geração...</p>
            </div>
          ) : (
            <>
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Geradas</div>
                  <div className="font-display text-2xl font-black text-slate-100 mt-1">{stats.total}</div>
                </div>
                {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
                  const ch = CHARACTERS[key];
                  const count = stats.chars[key] || 0;
                  return (
                    <div key={key} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4.5 flex items-center gap-3">
                      <img src={ch.example} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ch.short}</div>
                        <div className="font-display text-lg font-black text-slate-200 mt-0.5">{count}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Filtrar logs por IP, personagem, status ou data/hora..."
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl py-2.5 px-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
                  <span>Mostrando {filteredLogs.length} de {logs.length} registros</span>
                </div>
              </div>

              {/* Image & Log Grid */}
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
                  <p className="text-slate-400 text-sm font-medium">Nenhum registro encontrado para a busca.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                  {filteredLogs.map((l, index) => {
                    const ch = CHARACTERS[l.character as CharKey] || { name: l.character, short: l.character, example: "" };
                    return (
                      <div key={index} className="bg-slate-900 border border-slate-800/80 hover:border-slate-700/80 rounded-2xl overflow-hidden flex flex-col group transition duration-300">
                        {/* Thumbnail / Image Container */}
                        <div className="aspect-square bg-slate-950 relative overflow-hidden flex-shrink-0">
                          <img
                            src={l.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                            loading="lazy"
                          />
                          {l.status && (
                            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              l.status === "paid"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}>
                              {l.status === "paid" ? "Pago" : "Pendente"}
                            </span>
                          )}
                        </div>

                        {/* Metadata & Actions */}
                        <div className="p-3.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {ch.example && <img src={ch.example} alt="" className="w-4 h-4 rounded-full object-cover border border-slate-700" />}
                              <span className="font-bold text-xs text-slate-200">{ch.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span>🖥️</span> <span>{l.ip}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 font-medium">
                              📅 {formatDate(l.timestamp)}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-800/60">
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-2 rounded-lg text-[10px] text-center transition whitespace-nowrap"
                            >
                              Ver Original
                            </a>
                            <button
                              onClick={() => handleDownload(l.url, l.character)}
                              className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold py-1.5 px-2 rounded-lg text-[10px] text-center transition cursor-pointer whitespace-nowrap"
                            >
                              Baixar Foto
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex items-center justify-between text-[11px] text-slate-400 flex-shrink-0">
          <span>Total de {filteredLogs.length} registros exibidos</span>
          <span className="font-mono text-[9px] opacity-40">admin@patriaamada</span>
        </div>
      </div>
    </div>
  );
}
