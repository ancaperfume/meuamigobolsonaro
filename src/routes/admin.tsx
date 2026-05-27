import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generatePhoto, getGenerationsLog } from "@/lib/photo.functions";
import { createPixCharge, getOrderStatus } from "@/lib/payment.functions";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Loader2, X, Check, ShieldCheck, Sparkles, Lock,
  Upload, Copy, RefreshCw, LogOut, Eye, Download,
  Users, Camera, CreditCard, TrendingUp, BarChart3,
  Zap, ChevronRight, AlertCircle, CheckCircle2,
} from "lucide-react";

import exampleJair from "@/assets/example-jair.jpg";
import exampleFlavio from "@/assets/example-flavio.jpg";
import exampleMichelle from "@/assets/example-michelle.jpg";
import exampleNikolas from "@/assets/example-nikolas.jpg";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Meu Amigo Bolsonaro" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type CharKey = "jair" | "flavio" | "michelle" | "nikolas";

const CHARACTERS: Record<CharKey, {
  name: string;
  short: string;
  example: string;
  color: string;
}> = {
  jair: { name: "Jair Bolsonaro", short: "Jair", example: exampleJair, color: "text-yellow-400" },
  flavio: { name: "Flávio Bolsonaro", short: "Flávio", example: exampleFlavio, color: "text-blue-400" },
  michelle: { name: "Michelle Bolsonaro", short: "Michelle", example: exampleMichelle, color: "text-pink-400" },
  nikolas: { name: "Nikolas Ferreira", short: "Nikolas", example: exampleNikolas, color: "text-green-400" },
};

const ADMIN_PASSWORD = "patriaamada";

function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Check localStorage for saved session
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("admin_logged_in") === "true") {
        setIsAuthenticated(true);
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_logged_in", "true");
      setIsAuthenticated(true);
      setLoginError(false);
      toast.success("Bem-vindo ao Painel Admin! 🛡️");
    } else {
      setLoginError(true);
      toast.error("Senha incorreta.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_logged_in");
    setIsAuthenticated(false);
    setPassword("");
    toast.success("Sessão encerrada. 👋");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <Toaster richColors position="top-center" />
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes glow { 0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 40px rgba(139,92,246,0.6); } }
          .glow-box { animation: glow 3s ease-in-out infinite; }
          body { background: #0a0a0f; }
        `}} />
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 mb-4 glow-box">
              <ShieldCheck className="w-8 h-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Painel Admin</h1>
            <p className="text-sm text-zinc-500 mt-1">Meu Amigo Bolsonaro · Acesso Restrito</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(false); }}
                placeholder="Digite a senha de acesso"
                autoFocus
                className={`w-full bg-zinc-900/80 border ${loginError ? 'border-red-500/50' : 'border-zinc-800'} focus:border-violet-500 rounded-xl py-3.5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600`}
              />
              {loginError && (
                <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Senha incorreta. Tente novamente.
                </p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3.5 rounded-xl transition cursor-pointer shadow-lg shadow-violet-600/20"
            >
              Entrar no Painel
            </button>
          </form>
          <p className="text-center text-zinc-600 text-[10px] mt-6">
            🔒 Acesso protegido • Sessão salva localmente
          </p>
        </div>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

// ==========================================================================
// ADMIN DASHBOARD (authenticated)
// ==========================================================================
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const callGetLogs = useServerFn(getGenerationsLog);
  const callGenerate = useServerFn(generatePhoto);
  const [logs, setLogs] = useState<any[]>([]);
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "logs" | "test">("overview");
  const [refreshing, setRefreshing] = useState(false);

  // Test panel states
  const [testCharacter, setTestCharacter] = useState<CharKey>("jair");
  const [testStep, setTestStep] = useState<"idle" | "generating" | "preview" | "paid">("idle");
  const [testPreview, setTestPreview] = useState<string | null>(null);
  const [testGeneratedUrl, setTestGeneratedUrl] = useState<string | null>(null);
  const testFileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await callGetLogs();
      if (res.logs) setLogs(res.logs);
      if (res.stats) setStatsData(res.stats);
    } catch (err) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [callGetLogs]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const charStats = useMemo(() => {
    const total = logs.length;
    const chars: Record<string, number> = {};
    const paidCount = logs.filter(l => l.status === "paid").length;
    logs.forEach((l) => { chars[l.character] = (chars[l.character] || 0) + 1; });
    return { total, chars, paidCount };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return logs;
    return logs.filter((l) => {
      const charName = CHARACTERS[l.character as CharKey]?.name?.toLowerCase() || l.character?.toLowerCase() || "";
      const ip = (l.ip || "").toLowerCase();
      const dateStr = new Date(l.timestamp).toLocaleString("pt-BR").toLowerCase();
      const status = (l.status || "").toLowerCase();
      return charName.includes(s) || ip.includes(s) || dateStr.includes(s) || status.includes(s);
    });
  }, [logs, search]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return isoString; }
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

  // --- TEST PANEL ---
  const handleTestFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Envie uma imagem."); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Máximo 8MB."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setTestPreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setTestStep("generating");
      toast.info("Gerando foto real via IA...");
      try {
        const res = await callGenerate({ data: { imageBase64: base64, mimeType: file.type, character: testCharacter } });
        setTestGeneratedUrl(res.imageUrl);
        setTestStep("preview");
        toast.success("Foto gerada com sucesso! ✅");
        fetchData(); // Refresh logs
      } catch (e: any) {
        toast.error(e?.message ?? "Erro na geração.");
        setTestStep("idle");
      }
    };
    reader.readAsDataURL(file);
  }, [callGenerate, testCharacter, fetchData]);

  const handleTestSimulate = () => {
    const ch = CHARACTERS[testCharacter];
    setTestPreview(ch.example);
    setTestStep("generating");
    toast.info("Simulando geração (15s)...");
    setTimeout(() => {
      setTestGeneratedUrl(ch.example);
      setTestStep("preview");
      toast.success("Simulação concluída! ✅");
    }, 3000); // 3s for admin testing, not 15
  };

  const handleTestInstant = () => {
    const ch = CHARACTERS[testCharacter];
    setTestPreview(ch.example);
    setTestGeneratedUrl(ch.example);
    setTestStep("preview");
    toast.success("Preview instantâneo carregado.");
  };

  const resetTest = () => {
    setTestStep("idle");
    setTestPreview(null);
    setTestGeneratedUrl(null);
  };

  const tabs = [
    { id: "overview" as const, label: "Visão Geral", icon: BarChart3 },
    { id: "logs" as const, label: "Logs & Fotos", icon: Camera },
    { id: "test" as const, label: "Testes", icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Toaster richColors position="top-center" />
      <style dangerouslySetInnerHTML={{__html: `
        body { background: #0a0a0f; }
        .admin-card { background: rgba(24,24,32,0.8); border: 1px solid rgba(63,63,70,0.3); border-radius: 16px; }
        .admin-card:hover { border-color: rgba(63,63,70,0.5); }
        .stat-glow { box-shadow: inset 0 1px 0 rgba(255,255,255,0.03); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.3s ease-out forwards; }
      `}} />

      {/* TOP NAV */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-base">
              🇧🇷
            </div>
            <div>
              <div className="text-sm font-bold text-white leading-none">Admin Panel</div>
              <div className="text-[10px] text-zinc-500 font-medium">Meu Amigo Bolsonaro</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchData(); toast.info("Atualizando..."); }}
              disabled={refreshing}
              className="p-2 rounded-lg hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <a
              href="/"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition"
            >
              ← Site
            </a>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-red-900/30 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sair
            </button>
          </div>
        </div>
      </nav>

      {/* TAB BAR */}
      <div className="border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1 pt-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition cursor-pointer border-b-2 -mb-[1px] ${
                activeTab === tab.id
                  ? 'text-violet-400 border-violet-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-sm text-zinc-500">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* ========== OVERVIEW TAB ========== */}
            {activeTab === "overview" && (
              <div className="space-y-6 fade-up">
                {/* Traffic Stats */}
                <div>
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">📊 Métricas de Tráfego</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="admin-card p-5 stat-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-violet-400" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Visitantes Únicos</span>
                      </div>
                      <div className="text-3xl font-black text-white">{statsData?.totalUniqueUsers ?? 0}</div>
                      <div className="text-[10px] text-zinc-600 mt-1">IPs distintos</div>
                    </div>
                    <div className="admin-card p-5 stat-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Geraram Fotos</span>
                      </div>
                      <div className="text-3xl font-black text-emerald-400">{statsData?.totalGeneratingUsers ?? 0}</div>
                      <div className="text-[10px] text-zinc-600 mt-1">
                        {statsData?.totalUniqueUsers ? `${((statsData.totalGeneratingUsers / statsData.totalUniqueUsers) * 100).toFixed(1)}% dos visitantes` : '—'}
                      </div>
                    </div>
                    <div className="admin-card p-5 stat-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Clientes Pagos</span>
                      </div>
                      <div className="text-3xl font-black text-amber-400">{statsData?.totalPaidUsers ?? 0}</div>
                      <div className="text-[10px] text-zinc-600 mt-1">via Pix</div>
                    </div>
                    <div className="admin-card p-5 stat-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-sky-400" />
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Conversão</span>
                      </div>
                      <div className="text-3xl font-black text-sky-400">{statsData?.conversionRate ?? 0}%</div>
                      <div className="text-[10px] text-zinc-600 mt-1">foto → pagamento</div>
                    </div>
                  </div>
                </div>

                {/* Character Breakdown */}
                <div>
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">🇧🇷 Fotos por Político ({charStats.total} total)</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
                      const ch = CHARACTERS[key];
                      const count = charStats.chars[key] || 0;
                      const pct = charStats.total > 0 ? ((count / charStats.total) * 100).toFixed(0) : "0";
                      return (
                        <div key={key} className="admin-card p-4 flex items-center gap-3">
                          <img src={ch.example} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-zinc-700" />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold ${ch.color}`}>{ch.short}</div>
                            <div className="text-lg font-black text-white">{count}</div>
                          </div>
                          <div className="text-[10px] font-bold text-zinc-600">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">🕐 Atividade Recente</h2>
                  <div className="admin-card overflow-hidden">
                    {logs.slice(0, 8).map((l, i) => {
                      const ch = CHARACTERS[l.character as CharKey];
                      return (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-zinc-800/30' : ''}`}>
                          {l.url ? (
                            <img src={l.url} alt="" className="w-8 h-8 rounded-lg object-cover border border-zinc-700 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                              <Camera className="w-3.5 h-3.5 text-zinc-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-zinc-200 truncate">{ch?.name || l.character}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{l.ip} · {formatDate(l.timestamp)}</div>
                          </div>
                          {l.status && (
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              l.status === "paid" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                            }`}>
                              {l.status === "paid" ? "Pago" : l.status === "generated_preview" ? "Preview" : l.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {logs.length === 0 && (
                      <div className="py-8 text-center text-zinc-600 text-sm">Nenhum registro encontrado.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ========== LOGS TAB ========== */}
            {activeTab === "logs" && (
              <div className="space-y-4 fade-up">
                {/* Search */}
                <div className="admin-card p-3 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="🔍 Filtrar por IP, personagem, status ou data..."
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-violet-500 rounded-xl py-2.5 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 px-2">
                    {filteredLogs.length} de {logs.length} registros
                  </div>
                </div>

                {/* Grid */}
                {filteredLogs.length === 0 ? (
                  <div className="admin-card py-16 text-center">
                    <Camera className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">Nenhum registro encontrado.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredLogs.map((l, index) => {
                      const ch = CHARACTERS[l.character as CharKey] || { name: l.character, short: l.character, example: "", color: "text-zinc-400" };
                      return (
                        <div key={index} className="admin-card overflow-hidden flex flex-col group transition duration-300">
                          <div className="aspect-square bg-zinc-900 relative overflow-hidden flex-shrink-0">
                            {l.url ? (
                              <img
                                src={l.url}
                                alt=""
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Camera className="w-8 h-8 text-zinc-700" />
                              </div>
                            )}
                            {l.status && (
                              <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                l.status === "paid"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/50"
                              }`}>
                                {l.status === "paid" ? "Pago" : l.status === "generated_preview" ? "Preview" : l.status}
                              </span>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                {ch.example && <img src={ch.example} alt="" className="w-3.5 h-3.5 rounded-full object-cover border border-zinc-700" />}
                                <span className="font-bold text-[10px] text-zinc-300 truncate">{ch.name}</span>
                              </div>
                              <div className="text-[9px] text-zinc-600 font-mono truncate">{l.ip}</div>
                              <div className="text-[9px] text-zinc-600">{formatDate(l.timestamp)}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-zinc-800/40">
                              {l.url && (
                                <>
                                  <a
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1 rounded-lg text-[9px] font-bold transition"
                                  >
                                    <Eye className="w-3 h-3" /> Ver
                                  </a>
                                  <button
                                    onClick={() => handleDownload(l.url, l.character)}
                                    className="flex items-center justify-center gap-1 bg-violet-600/10 hover:bg-violet-600 text-violet-400 hover:text-white border border-violet-500/20 py-1 rounded-lg text-[9px] font-bold transition cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" /> Baixar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ========== TEST TAB ========== */}
            {activeTab === "test" && (
              <div className="space-y-6 fade-up">
                <div>
                  <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">⚡ Área de Testes</h2>
                  <p className="text-xs text-zinc-600 mb-4">Teste toda a pipeline de geração e checkout sem afetar clientes reais.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Test Photo Generation */}
                  <div className="admin-card p-5 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Camera className="w-4 h-4 text-violet-400" />
                      Geração de Foto
                    </h3>

                    {/* Character selector */}
                    <div className="flex gap-2">
                      {(Object.keys(CHARACTERS) as CharKey[]).map((key) => {
                        const ch = CHARACTERS[key];
                        return (
                          <button
                            key={key}
                            onClick={() => { setTestCharacter(key); resetTest(); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                              testCharacter === key
                                ? 'bg-violet-600 text-white'
                                : 'bg-zinc-800/50 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <img src={ch.example} alt="" className="w-4 h-4 rounded-full object-cover" />
                            {ch.short}
                          </button>
                        );
                      })}
                    </div>

                    {/* Test photo area */}
                    <div className="aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 relative">
                      {testStep === "idle" && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                          <img src={CHARACTERS[testCharacter].example} alt="" className="w-full h-full object-cover opacity-30" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                            <Upload className="w-8 h-8 text-zinc-600" />
                            <p className="text-xs text-zinc-500">Envie uma foto ou use simulação</p>
                          </div>
                        </div>
                      )}
                      {testStep === "generating" && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-zinc-900">
                          <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
                          <p className="text-xs text-zinc-400 font-medium">Processando via IA...</p>
                        </div>
                      )}
                      {(testStep === "preview" || testStep === "paid") && testGeneratedUrl && (
                        <>
                          <img src={testGeneratedUrl} alt="" className="w-full h-full object-cover" />
                          {testStep === "paid" && (
                            <div className="absolute top-3 right-3 bg-emerald-500 text-white px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> LIBERADA
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Test Actions */}
                    <div className="space-y-2">
                      <input
                        ref={testFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleTestFile(f);
                        }}
                      />
                      {testStep === "idle" && (
                        <>
                          <button
                            onClick={() => testFileRef.current?.click()}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-xs"
                          >
                            <Upload className="w-4 h-4" /> Enviar Foto Real (API)
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={handleTestSimulate}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-xl text-[10px] transition cursor-pointer"
                            >
                              ⚡ Simular IA (3s)
                            </button>
                            <button
                              onClick={handleTestInstant}
                              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-xl text-[10px] transition cursor-pointer"
                            >
                              🖼️ Preview Instantâneo
                            </button>
                          </div>
                        </>
                      )}
                      {testStep === "preview" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => { setTestStep("paid"); toast.success("Foto liberada via teste! ✅"); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer text-xs"
                          >
                            <Lock className="w-4 h-4" /> Liberar Foto
                          </button>
                          <button
                            onClick={resetTest}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
                          >
                            Nova Foto
                          </button>
                        </div>
                      )}
                      {testStep === "paid" && (
                        <div className="space-y-2">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                            <p className="text-xs text-emerald-400 font-bold">Foto liberada com sucesso!</p>
                          </div>
                          <button
                            onClick={resetTest}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                          >
                            Resetar Teste
                          </button>
                        </div>
                      )}
                      {testStep === "generating" && (
                        <p className="text-center text-xs text-zinc-500">Aguardando resposta da IA...</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions & System Info */}
                  <div className="space-y-4">
                    <div className="admin-card p-5 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Ações Rápidas
                      </h3>
                      <div className="space-y-2">
                        <a
                          href="/?teste=true"
                          target="_blank"
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-xs"
                        >
                          🌐 Abrir Site em Modo Dev
                        </a>
                        <a
                          href="/"
                          target="_blank"
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-xs"
                        >
                          👁️ Abrir Site (Visão do Cliente)
                        </a>
                        <button
                          onClick={() => { fetchData(); toast.success("Dados atualizados! 🔄"); }}
                          className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition text-xs cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Recarregar Dados
                        </button>
                      </div>
                    </div>

                    <div className="admin-card p-5 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-violet-400" />
                        Info do Sistema
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/40">
                          <span className="text-zinc-500">Total de fotos geradas</span>
                          <span className="text-white font-bold">{charStats.total}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/40">
                          <span className="text-zinc-500">Pedidos pagos (na lista)</span>
                          <span className="text-emerald-400 font-bold">{charStats.paidCount}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/40">
                          <span className="text-zinc-500">Visitantes únicos</span>
                          <span className="text-white font-bold">{statsData?.totalUniqueUsers ?? 0}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-zinc-800/40">
                          <span className="text-zinc-500">Plataforma</span>
                          <span className="text-zinc-300 font-mono text-[10px]">Cloudflare Workers</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-zinc-500">Banco</span>
                          <span className="text-zinc-300 font-mono text-[10px]">Supabase PostgreSQL</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
