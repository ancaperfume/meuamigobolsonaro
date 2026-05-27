import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUserPhotos } from "@/lib/photo.functions";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Download,
  Lock,
  Check,
  Sparkles,
  Heart,
  Share2,
  ArrowLeft,
  Camera,
  Users,
  ChevronRight,
} from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import exampleJair from "@/assets/example-jair.jpg";
import exampleFlavio from "@/assets/example-flavio.jpg";
import exampleMichelle from "@/assets/example-michelle.jpg";
import exampleNikolas from "@/assets/example-nikolas.jpg";

type CharKey = "jair" | "flavio" | "michelle" | "nikolas";

const CHARACTERS: Record<CharKey, { name: string; short: string; example: string; color: string }> =
  {
    jair: { name: "Jair Bolsonaro", short: "Jair", example: exampleJair, color: "text-yellow-400" },
    flavio: {
      name: "Flávio Bolsonaro",
      short: "Flávio",
      example: exampleFlavio,
      color: "text-blue-400",
    },
    michelle: {
      name: "Michelle Bolsonaro",
      short: "Michelle",
      example: exampleMichelle,
      color: "text-pink-400",
    },
    nikolas: {
      name: "Nikolas Ferreira",
      short: "Nikolas",
      example: exampleNikolas,
      color: "text-green-400",
    },
  };

export const Route = createFileRoute("/my-photos")({
  head: () => ({
    meta: [
      { title: "Minhas Fotos — Meu Amigo Bolsonaro" },
      {
        name: "description",
        content: "Veja todas as suas fotos geradas com seus ídolos políticos brasileiros.",
      },
    ],
  }),
  component: MyPhotosPage,
});

function getChar(key: string): { name: string; short: string; example: string; color: string } {
  return (
    CHARACTERS[key as CharKey] || { name: key, short: key, example: "", color: "text-zinc-400" }
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function MyPhotosPage() {
  const callGetPhotos = useServerFn(getUserPhotos);

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-photos"],
    queryFn: () => callGetPhotos(),
  });

  const photos = data?.photos ?? [];
  const paidCount = useMemo(() => photos.filter((p: any) => p.status === "paid").length, [photos]);
  const totalCount = photos.length;

  const sharePhoto = (url: string, charName: string) => {
    const text = `Olha minha foto realista com ${charName}! 🇧🇷 Faça a sua também em segundos: ${window.location.origin}`;
    if (navigator.share) {
      navigator.share({ title: "Meu Amigo Bolsonaro", text, url }).catch(() => {});
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.success("Link e legenda copiados!"))
        .catch(() => toast.error("Erro ao copiar."));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Toaster richColors position="top-center" />

      <style>{`
        body { background: #0a0a0f; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease-out forwards; }
        .card-glow { background: rgba(24,24,32,0.8); border: 1px solid rgba(63,63,70,0.3); border-radius: 16px; }
        .card-glow:hover { border-color: rgba(139,92,246,0.4); }
      `}</style>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">Minhas Fotos</span>
            <Camera className="w-3.5 h-3.5 text-violet-400" />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-sm text-zinc-500">Buscando suas fotos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <p className="text-zinc-500 text-sm">Erro ao carregar fotos. Tente novamente.</p>
          </div>
        ) : photos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8 fade-up">
            {/* HEADER */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-2">
                <Camera className="w-6 h-6 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold text-white">Suas Fotos</h1>
              <p className="text-sm text-zinc-500">
                {paidCount} foto{paidCount !== 1 ? "s" : ""} liberada{paidCount !== 1 ? "s" : ""}
                {totalCount > 0 && ` · ${totalCount} no total`}
              </p>
            </div>

            {/* HERO CTA */}
            <Link
              to="/"
              className="block card-glow p-5 hover:border-violet-500/40 transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-emerald-600 flex items-center justify-center text-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white group-hover:text-violet-400 transition">
                    Criar nova foto agora
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Escolha outro personagem e monte seu álbum completo!
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition" />
              </div>
            </Link>

            {/* GALLERY */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo: any, i: number) => {
                const ch = getChar(photo.character);
                const isPaid = photo.status === "paid";
                return (
                  <div
                    key={i}
                    className="card-glow overflow-hidden flex flex-col group fade-up"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="aspect-square bg-zinc-900 relative overflow-hidden">
                      <img
                        src={photo.url}
                        alt={`Foto com ${ch.name}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        loading="lazy"
                      />
                      {isPaid && (
                        <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                          Liberada
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5">
                        {ch.example && (
                          <img
                            src={ch.example}
                            alt=""
                            className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-700"
                          />
                        )}
                        <span className="text-[10px] font-bold text-zinc-300 truncate">
                          {ch.name}
                        </span>
                      </div>
                      <div className="text-[8px] text-zinc-600">{formatDate(photo.timestamp)}</div>
                      <div className="grid grid-cols-2 gap-1 mt-auto pt-2 border-t border-zinc-800/40">
                        <button
                          onClick={() => sharePhoto(photo.url, ch.name)}
                          className="flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded-lg text-[9px] font-bold transition cursor-pointer"
                        >
                          <Share2 className="w-3 h-3" /> Compartilhar
                        </button>
                        <a
                          href={photo.url}
                          download={`meuamigobolsonaro-${photo.character}.png`}
                          className="flex items-center justify-center gap-1 bg-violet-600/10 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-500/20 py-1.5 rounded-lg text-[9px] font-bold transition text-center"
                        >
                          <Download className="w-3 h-3" /> Baixar
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTTOM CTA */}
            <div className="card-glow p-6 text-center space-y-4">
              <h3 className="text-base font-bold text-white">Complete seu álbum de fotos 📸</h3>
              <p className="text-sm text-zinc-500 max-w-md mx-auto">
                Você já tem {paidCount} foto{paidCount !== 1 ? "s" : ""}. Que tal fazer com todos os
                personagens?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
                  const ch = CHARACTERS[key];
                  return (
                    <Link
                      key={key}
                      to="/"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-bold transition"
                    >
                      <img src={ch.example} alt="" className="w-4 h-4 rounded-full" />
                      {ch.short}
                    </Link>
                  );
                })}
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-violet-600/20 text-sm"
              >
                <Sparkles className="w-4 h-4" /> Criar nova foto agora
              </Link>
            </div>

            {/* SOCIAL PROOF */}
            <div className="text-center text-[11px] text-zinc-600 space-y-1 pb-8">
              <div className="flex items-center justify-center gap-1.5">
                <Heart className="w-3 h-3 text-violet-400" />
                <span>Feito por brasileiros, para brasileiros</span>
              </div>
              <p>Imagens geradas por IA com fins de entretenimento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-6 fade-up">
      <div className="w-20 h-20 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
        <Camera className="w-10 h-10 text-zinc-700" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-white">Nenhuma foto ainda</h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          Você ainda não gerou nenhuma foto. Crie agora sua selfie ao lado do seu ídolo!
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-violet-600/20"
      >
        <Sparkles className="w-4 h-4" /> Criar minha primeira foto
      </Link>
      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
        <Users className="w-3.5 h-3.5" />
        <span>Mais de 15.000 brasileiros já criaram a sua</span>
      </div>
    </div>
  );
}
