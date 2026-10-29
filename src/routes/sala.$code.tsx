import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useRoom, type Role } from "@/lib/useRoom";
import Whiteboard from "@/components/games/Whiteboard";
import Termometro from "@/components/games/Termometro";
import Detetive from "@/components/games/Detetive";
import DetetiveTabuleiro from "@/components/games/DetetiveTabuleiro";
import DetetiveAventura from "@/components/games/DetetiveAventura";

import TrianguloCognitivo from "@/components/games/TrianguloCognitivo";
import EntreLentes from "@/components/games/EntreLentes";

import Ancoragem54321 from "@/components/games/Ancoragem54321";
import FolhasNoRio from "@/components/games/FolhasNoRio";
import BussolaValores from "@/components/games/BussolaValores";
import MinhaCasa from "@/components/games/MinhaCasa";
import MissaoAutocontrole from "@/components/games/MissaoAutocontrole";
import HistoriaEspiral from "@/components/games/HistoriaEspiral";

import { Copy, Check, ArrowLeft, Wifi, WifiOff, Download } from "lucide-react";
import { toast } from "sonner";
import { getGame } from "@/lib/games";
import { downloadElementAsPdf } from "@/lib/downloadPdf";
import { useAuth } from "@/hooks/use-auth";

const GAMES = ["whiteboard", "termometro", "detetive", "detetive-tabuleiro", "detetive-aventura", "triangulo", "entre-lentes", "ancoragem", "folhas-no-rio", "bussola", "minha-casa", "missao-autocontrole", "historia-espiral"] as const;

const searchSchema = z.object({
  role: z.enum(["psi", "paciente"]).catch("paciente").default("paciente"),
  game: z.enum(GAMES).catch("whiteboard").default("whiteboard"),
});

export const Route = createFileRoute("/sala/$code")({
  validateSearch: searchSchema,

  head: ({ params }) => ({
    meta: [
      { title: `Sala ${params.code} — Mundo Pine` },
      { name: "description", content: "Sala privada para uma atividade terapêutica colaborativa do Mundo Pine." },
      { property: "og:title", content: `Sala terapêutica ${params.code} — Mundo Pine` },
      { property: "og:description", content: "Acesse diretamente a atividade terapêutica compartilhada pela psicóloga." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalaPage,
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-destructive mb-4">{error.message}</p>
        <Link to="/" className="underline">Voltar</Link>
      </div>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Sala não encontrada</div>,
});

function SalaPage() {
  const { code } = Route.useParams();
  const { role, game } = Route.useSearch();
  const router = useRouter();
  const room = useRoom(code, role as Role);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const captureRef = useRef<HTMLElement>(null);
  const { user } = useAuth();

  const handleDownloadPdf = async () => {
    if (!captureRef.current) return;
    setDownloading(true);
    try {
      const name = `${meta?.title ?? game}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadElementAsPdf(captureRef.current, name);
      toast.success("PDF baixado");
    } catch (e: any) {
      toast.error("Erro ao gerar PDF", { description: e?.message });
    } finally {
      setDownloading(false);
    }
  };

  const meta = getGame(game);

  const buildPatientUrl = () => {
    const origin = window.location.origin;
    // Domínio público publicado. Sempre usamos ele quando o psi está em
    // qualquer ambiente Lovable (editor, preview, lovableproject.com,
    // localhost) — assim o paciente nunca cai na tela de login do Lovable.
    const PUBLIC_ORIGIN = "https://app-pineapplepsicologia-com-br.lovable.app";
    const isInternal =
      origin.includes("lovableproject.com") ||
      origin.includes("lovable.app") ||
      origin.includes("lovable.dev") ||
      origin.includes("localhost");
    const publicOrigin = isInternal ? PUBLIC_ORIGIN : origin;
    return `${publicOrigin}/sala/${code}?role=paciente&game=${game}`;
  };


  const copyCode = async () => {
    const url = buildPatientUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link do paciente copiado", {
      description: "Cole no WhatsApp — abre direto no mesmo jogo.",
    });
    setTimeout(() => setCopied(false), 1500);
  };


  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 sm:py-3 border-b bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 sm:h-9 sm:w-9" onClick={() => router.navigate({ to: "/" })}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="hidden sm:block text-[10px] uppercase tracking-wider text-muted-foreground font-bold truncate">
              {role === "psi" ? "Psicóloga" : "Paciente"} · {meta?.emoji} {meta?.title ?? "Sala"}
            </div>
            <button onClick={copyCode} className="flex items-center gap-1.5 font-display text-base sm:text-2xl font-bold tracking-widest hover:text-primary truncate">
              <span className="sm:hidden">{meta?.emoji}</span>
              {code}
              {copied ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-50" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {role === "psi" && user && (
            <Button size="sm" variant="outline" className="h-8 px-2 sm:h-9 sm:px-3" onClick={handleDownloadPdf} disabled={downloading}>
              <Download className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">{downloading ? "Gerando..." : "Baixar PDF"}</span>
            </Button>
          )}
          <div className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${room.peers > 1 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {room.peers > 1 ? <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
            <span className="hidden sm:inline">{room.status !== "online" ? (room.status === "reconnecting" ? "Reconectando..." : "Conectando...") : room.peers > 1 ? "Conectados" : role === "psi" ? "Aguardando paciente..." : "Aguardando psicóloga..."}</span>
          </div>
        </div>
      </header>


      <div className="flex-1 flex min-h-0">
        <main ref={captureRef} className="flex-1 overflow-auto p-0 sm:p-3 md:p-4 landscape:max-[820px]:p-0">

          {game === "termometro" ? (
            <Termometro room={room} />
          ) : game === "detetive" ? (
            <Detetive room={room} />
          ) : game === "detetive-tabuleiro" ? (
            <DetetiveTabuleiro room={room} />
          ) : game === "detetive-aventura" ? (
            <DetetiveAventura room={room} />
          ) : game === "triangulo" ? (
            <TrianguloCognitivo room={room} />
          ) : game === "entre-lentes" ? (
            <EntreLentes room={room} />
          ) : game === "ancoragem" ? (
            <Ancoragem54321 room={room} />
          ) : game === "folhas-no-rio" ? (
            <FolhasNoRio room={room} />
          ) : game === "bussola" ? (
            <BussolaValores room={room} />
          ) : game === "minha-casa" ? (
            <MinhaCasa room={room} />
          ) : game === "missao-autocontrole" ? (
            <MissaoAutocontrole room={room} />
          ) : game === "historia-espiral" ? (
            <HistoriaEspiral room={room} />
          ) : (
            <Whiteboard room={room} role={role} />
          )}
        </main>
      </div>

    </div>
  );
}
