import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type Role = "psi" | "paciente";

export type RoomMessage = { type: string; payload: any; from: Role };

export type RoomStatus = "connecting" | "online" | "reconnecting";

/**
 * Sala em tempo real (Supabase Realtime) compartilhada entre psicóloga e paciente.
 *
 * Garantias:
 * - Reconecta sozinha se a conexão cair (celular bloqueado, Wi‑Fi oscilando,
 *   aba em segundo plano) e ao voltar para a aba / voltar a internet.
 * - Pedidos de sincronização ("*:request") enviados antes da conexão ficar
 *   pronta não se perdem: ficam na fila e saem assim que conectar.
 * - Quem já estava na sala reenvia o estado atual de cada jogo ("*:state")
 *   quando alguém novo entra — assim o paciente que abre o link depois vê o
 *   que a psicóloga já fez (e vice‑versa, se a psicóloga recarregar a página).
 * - Quem acabou de entrar não sobrescreve o jogo dos outros com o estado
 *   inicial vazio nos primeiros instantes.
 * - Cada aba tem sua própria identidade de presença, então "Conectados" só
 *   aparece quando há de fato duas telas na sala.
 */
const JOIN_GRACE_MS = 1500;
const MAX_BACKOFF_MS = 10_000;

const isStateType = (t: string) => t.endsWith(":state");
const isRequestType = (t: string) => t.endsWith(":request");

function newTabId() {
  return Math.random().toString(36).slice(2, 10);
}

export function useRoom(code: string | null, role: Role) {
  const [ready, setReady] = useState(false);
  const [peers, setPeers] = useState(0);
  const [status, setStatus] = useState<RoomStatus>("connecting");

  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const handlersRef = useRef<Set<(m: RoomMessage) => void>>(new Set());
  const tabIdRef = useRef<string>(newTabId());

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

  const rawSend = useCallback(
    (type: string, payload: any) => {
      const ch = channelRef.current;
      if (!ch || !subscribedRef.current) return false;
      void ch.send({
        type: "broadcast",
        event: "msg",
        payload: { type, payload, from: role } as RoomMessage,
      });
      return true;
    },
    [role],
  );

  useEffect(() => {
    if (!code) return;

    let disposed = false;
    let attempt = 0;
    let generation = 0;
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

    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
      attempt += 1;
      setStatus("reconnecting");
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connect();
      }, delay);
    };

    const teardown = async () => {
      const ch = channelRef.current;
      channelRef.current = null;
      subscribedRef.current = false;
      if (ch) {
        try {
          // Remove o canal antigo por completo antes de abrir outro com o
          // mesmo nome (senão o cliente pode devolver o canal que está fechando).
          await supabase.removeChannel(ch);
        } catch {
          /* canal já fechado */
        }
      }
    };

    async function connect() {
      if (disposed) return;
      const myGen = ++generation;
      await teardown();
      // Outra tentativa de conexão começou enquanto esperávamos: ela vence.
      if (disposed || myGen !== generation) return;

      const ch = supabase.channel(`room:${code}`, {
        config: { broadcast: { self: false }, presence: { key: myKey } },
      });
      channelRef.current = ch;
      let initialSyncDone = false;

      ch.on("broadcast", { event: "msg" }, ({ payload }) => {
        const m = payload as RoomMessage;
        if (!m || typeof m.type !== "string") return;
        if (isStateType(m.type)) stateCacheRef.current.set(m.type, m.payload);
        deliver(m);
      });

      ch.on("presence", { event: "sync" }, () => {
        initialSyncDone = true;
        setPeers(Object.keys(ch.presenceState()).length);
      });

      ch.on("presence", { event: "join" }, ({ key }) => {
        // Só quem já estava na sala reenvia o estado para quem chegou agora.
        if (initialSyncDone && key !== myKey) rebroadcastStates();
      });

      ch.subscribe(async (s, err) => {
        if (disposed || channelRef.current !== ch) return;
        if (s === "SUBSCRIBED") {
          attempt = 0;
          subscribedRef.current = true;
          graceUntilRef.current = Date.now() + JOIN_GRACE_MS;
          await ch.track({ role, tab: tabIdRef.current, at: Date.now() });
          setReady(true);
          setStatus("online");
          // Envia pedidos de sincronização que estavam esperando a conexão.
          pendingRequestsRef.current.forEach((payload, type) => rawSend(type, payload));
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          if (err) console.warn(`[Sala] conexão ${s}`, err);
          subscribedRef.current = false;
          setReady(false);
          setPeers(0);
          scheduleReconnect();
        }
      });
    }

    const wakeUp = () => {
      if (disposed) return;
      if (document.visibilityState === "visible" && !subscribedRef.current) {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        attempt = 0;
        void connect();
      }
    };

    setStatus("connecting");
    void connect();
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", wakeUp);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (rebroadcastTimer) clearTimeout(rebroadcastTimer);
      window.removeEventListener("online", wakeUp);
      document.removeEventListener("visibilitychange", wakeUp);
      void teardown();
      setReady(false);
      setPeers(0);
    };
  }, [code, role, deliver, rawSend]);

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
