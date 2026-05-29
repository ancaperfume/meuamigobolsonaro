import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { 
  MessageSquare, 
  ShieldCheck, 
  Sparkles, 
  Gift, 
  Flame, 
  CheckCircle2, 
  Users,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// ============================================================================
// 👉 CONFIGURAÇÃO DO WHATSAPP E DO PIXEL
// ============================================================================

// Insira aqui o seu link completo do WhatsApp. 
// Você pode usar o link direto com número para poder personalizar a mensagem:
// Exemplo com texto pré-definido: "https://wa.me/5511999999999?text=Olá!%20Quero%20liberar%20meu%20acesso%20VIP"
const WHATSAPP_DESTINATION = "https://wa.me/message/WBDHPEF33R4RA1";

// Mensagem de log caso queira monitorar no console
const TRACKING_LABEL = "WhatsApp VIP Campaign";

// ============================================================================

export const Route = createFileRoute("/zap")({
  head: () => ({
    meta: [
      { title: "Liberação VIP Imediata — Meu Amigo Bolsonaro" },
      {
        name: "description",
        content: "Acesso exclusivo para liberação imediata de fotos HD e bônus patriotas no WhatsApp.",
      },
      { name: "robots", content: "noindex, nofollow" }, // Evita que o Google indexe a página de anúncio
      { property: "og:title", content: "Liberação VIP Imediata" },
      { property: "og:description", content: "Garanta suas fotos HD e bônus agora." },
    ],
  }),
  component: ZapBridgePage,
});

// Ticker de atividade social simulado (aumenta drasticamente a conversão)
const LIVE_ACTIVITIES = [
  { name: "Carlos M.", city: "São Paulo/SP", action: "acaba de liberar as fotos no Zap 🟢" },
  { name: "Tenente Silva", city: "Rio de Janeiro/RJ", action: "resgatou o Guia e o livro de Orações" },
  { name: "Mariana F.", city: "Curitiba/PR", action: "conseguiu a foto com o Capitão em menos de 1 min" },
  { name: "Pastor Jorge", city: "Belo Horizonte/MG", action: "ativou o acesso VIP pelo WhatsApp" },
  { name: "Eduardo S.", city: "Joinville/SC", action: "acaba de liberar o pacote Líderes Mundiais" },
  { name: "Dona Irene", city: "Goiânia/GO", action: "recebeu as fotos HD direto no celular" },
];

function ZapBridgePage() {
  const [timeLeft, setTimeLeft] = useState(299); // 5 minutos de escassez
  const [activeActivity, setActiveActivity] = useState<(typeof LIVE_ACTIVITIES)[0] | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Regressiva do Cronômetro
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Carrossel de prova social em tempo real
  useEffect(() => {
    const triggerNextActivity = () => {
      const randomItem = LIVE_ACTIVITIES[Math.floor(Math.random() * LIVE_ACTIVITIES.length)];
      setActiveActivity(randomItem);
      // Remove após 4 segundos exibido
      setTimeout(() => setActiveActivity(null), 4000);
    };

    const interval = setInterval(triggerNextActivity, 12000);
    const initialTimeout = setTimeout(triggerNextActivity, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
    };
  }, []);

  // Função principal de redirecionamento e disparo do Pixel
  const handleRedirect = useCallback(() => {
    setIsRedirecting(true);
    toast.success("Disparando acesso VIP... Redirecionando para o WhatsApp!");

    // 1. Dispara os eventos de Pixel no navegador (Meta Pixel e TikTok)
    if (typeof window !== "undefined") {
      // Dispara evento padrão "Lead" no Meta Pixel (Altamente otimizado para campanhas de anúncio)
      if (window.fbq) {
        window.fbq("track", "Lead", {
          content_name: TRACKING_LABEL,
          content_category: "WhatsApp Funnel",
          value: 9.90, // Valor estimado de lead
          currency: "BRL"
        });
        // Dispara também "Contact" como redundância de otimização
        window.fbq("track", "Contact", {
          content_name: TRACKING_LABEL
        });
      }

      // Dispara eventos no TikTok Pixel se configurado
      if (window.ttq) {
        window.ttq.track("Contact", {
          contents: [{ content_name: TRACKING_LABEL }]
        });
        window.ttq.track("AddToCart", {
          contents: [{ content_name: TRACKING_LABEL }]
        });
      }
    }

    // 2. Aguarda um pequeno delay (350ms) para garantir o envio dos pixels antes de mudar de página
    setTimeout(() => {
      window.location.href = WHATSAPP_DESTINATION;
    }, 350);
  }, []);

  return (
    <div className="min-h-screen bg-[#07070a] text-zinc-100 font-sans relative overflow-x-hidden flex flex-col justify-between">
      <Toaster richColors position="top-center" />

      {/* GRADIENT BACKGROUND EFFECTS */}
      <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[50%] rounded-full bg-emerald-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[50%] rounded-full bg-yellow-950/10 blur-[120px] pointer-events-none" />

      {/* TOP URGENCY RIBBON */}
      <div className="w-full bg-gradient-to-r from-emerald-900 via-zinc-900 to-emerald-900 text-yellow-400 text-[10px] sm:text-xs tracking-[0.15em] uppercase py-2.5 text-center font-bold border-b border-emerald-900/30 px-4 flex items-center justify-center gap-2">
        <Flame className="w-4 h-4 animate-pulse text-amber-500 flex-shrink-0" />
        <span>Atenção: Servidores de IA com alta demanda. Garanta seu lugar na fila!</span>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 max-w-xl mx-auto w-full z-10">
        
        {/* BRANDING */}
        <div className="flex items-center gap-2 mb-8 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-400">
            Meu Amigo Bolsonaro · VIP
          </span>
        </div>

        {/* PERSUASIVE BOX / CARD */}
        <div className="w-full bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(4,120,87,0.1)] space-y-6 text-center animate-in zoom-in-95 duration-500">
          
          {/* URGENCY BADGE */}
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-4 py-1.5 rounded-full text-xs font-bold text-yellow-400">
            <Flame className="w-3.5 h-3.5" />
            <span>OFERTA EXPIRA EM: {formatTime(timeLeft)}</span>
          </div>

          {/* ULTRA PERSUASIVE HEADLINES */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              🇧🇷 LIBERAÇÃO IMEDIATA E <span className="bg-gradient-to-r from-yellow-400 to-emerald-400 bg-clip-text text-transparent">BÔNUS EXCLUSIVOS</span> NO WHATSAPP!
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto">
              Para evitar qualquer tipo de bloqueio ou lentidão no sistema, nossa equipe de suporte está liberando o acesso direto via WhatsApp. Clique abaixo para receber atendimento vip em segundos!
            </p>
          </div>

          {/* BENEFIT BARS */}
          <div className="space-y-3 text-left pt-2">
            
            {/* Benefit 1 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-800/40 border border-zinc-850 hover:border-emerald-800/30 transition duration-300">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-xl text-emerald-400 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Fila de Prioridade Máxima</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Sua foto HD gerada pela IA será priorizada e enviada direto no seu WhatsApp sem marcas d'água.</p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-800/40 border border-zinc-850 hover:border-emerald-800/30 transition duration-300">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-xl text-yellow-400 mt-0.5">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Pacote Premium Liberado</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Libere instantaneamente as fotos de Donald Trump e Javier Milei na página inicial.</p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-800/40 border border-zinc-850 hover:border-emerald-800/30 transition duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-amber-400 mt-0.5">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Mega Kit de Presentes Digitais</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Ganhe o Guia Exclusivo do Filho de Direita + o livro digital com 250 Orações Secretas.</p>
              </div>
            </div>

          </div>

          {/* MAIN CALL TO ACTION (CTA) BUTTON */}
          <div className="pt-4 space-y-3">
            <button
              onClick={handleRedirect}
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-500 text-white font-extrabold py-4 px-6 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer group relative overflow-hidden"
            >
              {/* Pulsing glow effect inside button */}
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <MessageSquare className="w-6 h-6 fill-current animate-bounce-slow" />
              <div className="text-left">
                <span className="block text-base leading-none font-black uppercase tracking-wider">
                  {isRedirecting ? "CONECTANDO VIP..." : "LIBERAR MEU ACESSO NO WHATSAPP 🇧🇷"}
                </span>
                <span className="block text-[10px] text-emerald-100 font-semibold mt-0.5 opacity-90">
                  Clique para iniciar suporte e disparar os bônus
                </span>
              </div>
              <ChevronRight className="w-5 h-5 ml-auto group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Micro-guarantee copy */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sem Custos Adicionais de Suporte · Conexão Instantânea</span>
            </div>
          </div>

        </div>

        {/* DYNAMIC ACTIVITY TICKER (REAL-TIME SOCIAL PROOF) */}
        <div className="h-12 w-full mt-6 flex items-center justify-center overflow-hidden">
          {activeActivity && (
            <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-full px-5 py-2 flex items-center gap-2.5 shadow-md text-xs font-medium text-zinc-300 animate-in slide-in-from-bottom-3 fade-in duration-300 animate-out slide-out-to-top-3 fade-out duration-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                <strong className="text-white font-bold">{activeActivity.name}</strong> ({activeActivity.city}) {activeActivity.action}
              </span>
            </div>
          )}
        </div>

        {/* SECURITY & TRUST SIGNALS */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-zinc-600 text-xs mt-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Link Seguro e Criptografado</span>
          </div>
          <span className="hidden sm:inline text-zinc-800">|</span>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>+15.827 Atendimentos Realizados Hoje</span>
          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="w-full text-center py-6 text-[10px] text-zinc-700 border-t border-zinc-900/40 mt-12 bg-black/20">
        <p className="max-w-md mx-auto px-4 leading-relaxed">
          Meu Amigo Bolsonaro © 2026. Todos os direitos reservados.
          Esta página é um canal de atendimento direto e seguro. Não temos afiliação direta com o WhatsApp Inc.
        </p>
      </footer>
    </div>
  );
}
