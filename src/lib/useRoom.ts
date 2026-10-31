import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export type Role = "psi" | "paciente";

export type RoomMessage = { type: string; payload: any; from: Role };

export type RoomStatus = "connecting" | "online" | "reconnecting";

/**
 * Sala em tempo real compartilhada entre psicóloga e paciente.
 *
 * O canal é servido pelo próprio app (src/routes/api/sala.$code.ts): a página
 * recebe as mensagens por um stream SSE (EventSource) e envia por POST. Não
 * depende do Supabase Realtime.
 *
 * Garantias:
 * - Reconecta sozinha se a conexão cair (o EventSource tenta de novo e, se
 *   desistir, abrimos outro) e ao voltar para a aba / voltar a internet.
 * - Mensagens saem na ordem em que foram enviadas (fila com envio em lote).
 * - Pedidos de sincronização ("*:request") enviados antes da conexão ficar
 *   pronta não se perdem: ficam guardados e saem assim que conectar.
 * - Quem já estava na sala reenvia o estado atual de cada jogo ("*:state")
 *   quando alguém novo entra — assim o paciente que abre o link depois vê o
 *   que a psicóloga já fez (e vice‑versa, se a psicóloga recarregar a página).
 * - Quem acabou de entrar não sobrescreve o jogo dos outros com o estado
 *   inicial vazio nos primeiros instantes.
 * - Cada aba tem sua própria identidade de presença, então "Conectados" só
 *   aparece quando há de fato duas telas na sala.
 */
const JOIN_GRACE_MS = 1500;
const RECONNECT_MS = 2000;

const isStateType = (t: string) => t.endsWith(":state");
const isRequestType = (t: string) => t.endsWith(":request");

function newTabId() {
  return Math.random().toString(36).slice(2, 12).padEnd(8, "0");
}

export function useRoom(code: string | null, role: Role) {
  const [ready, setReady] = useState(false);
  const [peers, setPeers] = useState(0);
  const [status, setStatus] = useState<RoomStatus>("connecting");

  const codeRef = useRef(code);
  codeRef.current = code;
  const connectedRef = useRef(false);
  const handlersRef = useRef<Set<(m: RoomMessage) => void>>(new Set());
  const tabIdRef = useRef<string>(newTabId());

  // Fila de envio: um POST por vez, levando tudo o que acumulou.
  const outboxRef = useRef<{ type: string; payload: any }[]>([]);
  const sendingRef = useRef(false);

  // Último estado conhecido de cada jogo (enviado ou recebido).
  const stateCacheRef = useRef<Map<string, any>>(new Map());
  // Pedidos de sincronização para (re)enviar ao conectar.
  const pendingRequestsRef = useRef<Map<string, any>>(new Map());
  const graceUntilRef = useRef(0);

  const deliver = useCallback((m: RoomMessage) => {
    handlersRef.current.forEach((h) => {
      try {
        h(m);
      } catch (err) {
        console.error("[Sala] erro ao processar mensagem", m.type, err);
      }
    });
  }, []);

  const flush = useCallback(async () => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      while (outboxRef.current.length > 0) {
        const roomCode = codeRef.current;
        if (!roomCode) {
          outboxRef.current = [];
          break;
        }
        const batch = outboxRef.current;
        outboxRef.current = [];
        try {
          const res = await fetch(`/api/sala/${encodeURIComponent(roomCode)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client: tabIdRef.current, from: role, messages: batch }),
          });
          if (!res.ok) console.warn("[Sala] envio recusado", res.status);
        } catch (err) {
          // Sem rede: devolve o lote para a fila e tenta de novo em instantes.
          console.warn("[Sala] falha ao enviar", err);
          outboxRef.current = [...batch, ...outboxRef.current];
          await new Promise((r) => setTimeout(r, 1000));
          if (!connectedRef.current) break;
        }
      }
    } finally {
      sendingRef.current = false;
    }
  }, [role]);

  const rawSend = useCallback(
    (type: string, payload: any) => {
      if (!connectedRef.current) return false;
      outboxRef.current.push({ type, payload });
      void flush();
      return true;
    },
    [flush],
  );

  useEffect(() => {
    if (!code) return;

    let disposed = false;
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let rebroadcastTimer: ReturnType<typeof setTimeout> | null = null;

    const myKey = `${role}:${tabIdRef.current}`;

    const rebroadcastStates = () => {
      if (rebroadcastTimer) clearTimeout(rebroadcastTimer);
      // Pequena espera para a tela de quem entrou terminar de montar.
      rebroadcastTimer = setTimeout(() => {
        stateCacheRef.current.forEach((payload, type) => rawSend(type, payload));
      }, 400);
    };

    const markOffline = () => {
      connectedRef.current = false;
      setReady(false);
      setStatus("reconnecting");
    };

    function connect() {
      if (disposed) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      es?.close();

      const url = `/api/sala/${encodeURIComponent(code!)}?client=${tabIdRef.current}&role=${role}`;
      const source = new EventSource(url);
      es = source;
      let initialSyncDone = false;

      source.onopen = () => {
        if (disposed || es !== source) return;
        connectedRef.current = true;
        graceUntilRef.current = Date.now() + JOIN_GRACE_MS;
        setReady(true);
        setStatus("online");
        // Envia pedidos de sincronização que estavam esperando a conexão.
        pendingRequestsRef.current.forEach((payload, type) => rawSend(type, payload));
        void flush();
      };

      source.addEventListener("presence", (ev) => {
        if (disposed || es !== source) return;
        let data: { keys?: string[]; joined?: string };
        try {
          data = JSON.parse((ev as MessageEvent).data);
        } catch {
          return;
        }
        setPeers(Array.isArray(data.keys) ? data.keys.length : 0);
        // Só quem já estava na sala reenvia o estado para quem chegou agora.
        if (initialSyncDone && data.joined && data.joined !== myKey) rebroadcastStates();
        initialSyncDone = true;
      });

      source.addEventListener("msg", (ev) => {
        if (disposed || es !== source) return;
        let m: RoomMessage;
        try {
          m = JSON.parse((ev as MessageEvent).data);
        } catch {
          return;
        }
        if (!m || typeof m.type !== "string") return;
        if (isStateType(m.type)) stateCacheRef.current.set(m.type, m.payload);
        deliver(m);
      });

      source.onerror = () => {
        if (disposed || es !== source) return;
        markOffline();
        // O navegador tenta reconectar sozinho; se desistiu, abrimos outro.
        if (source.readyState === EventSource.CLOSED && !retryTimer) {
          retryTimer = setTimeout(() => {
            retryTimer = null;
            connect();
          }, RECONNECT_MS);
        }
      };
    }

    const wakeUp = () => {
      if (disposed) return;
      if (document.visibilityState === "visible" && !connectedRef.current) connect();
    };

    setStatus("connecting");
    connect();
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", wakeUp);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (rebroadcastTimer) clearTimeout(rebroadcastTimer);
      window.removeEventListener("online", wakeUp);
      document.removeEventListener("visibilitychange", wakeUp);
      es?.close();
      es = null;
      connectedRef.current = false;
      setReady(false);
      setPeers(0);
    };
  }, [code, role, deliver, rawSend, flush]);

  const send = useCallback(
    (type: string, payload: any) => {
      if (isRequestType(type)) {
        pendingRequestsRef.current.set(type, payload);
      }
      if (isStateType(type)) {
        stateCacheRef.current.set(type, payload);
        // Recém-chegado: não sobrescreve o jogo de quem já estava na sala.
        if (Date.now() < graceUntilRef.current) return;
      }
      rawSend(type, payload);
    },
    [rawSend],
  );

  const on = useCallback((handler: (m: RoomMessage) => void) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  // Objeto estável: evita que os jogos refaçam a inscrição a cada renderização.
  return useMemo(() => ({ ready, peers, status, send, on }), [ready, peers, status, send, on]);
}
