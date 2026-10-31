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
// Se o próprio Supabase não conseguir reentrar no canal neste tempo,
// descartamos o canal e abrimos um novo do zero.
const STUCK_TIMEOUT_MS = 15_000;

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
    let stuckTimer: ReturnType<typeof setTimeout> | null = null;
    let rebroadcastTimer: ReturnType<typeof setTimeout> | null = null;

    const myKey = `${role}:${tabIdRef.current}`;
    const topic = `room:${code}`;

    const rebroadcastStates = () => {
      if (rebroadcastTimer) clearTimeout(rebroadcastTimer);
      // Pequena espera para a tela de quem entrou terminar de montar.
      rebroadcastTimer = setTimeout(() => {
        stateCacheRef.current.forEach((payload, type) => rawSend(type, payload));
      }, 400);
    };

    const clearStuckTimer = () => {
      if (stuckTimer) clearTimeout(stuckTimer);
      stuckTimer = null;
    };

    // Enquanto não estiver conectado, vigia: se demorar demais, recomeça.
    const armStuckTimer = () => {
      if (stuckTimer || disposed) return;
      stuckTimer = setTimeout(() => {
        stuckTimer = null;
        if (!disposed && !subscribedRef.current) connect();
      }, STUCK_TIMEOUT_MS);
    };

    // O cliente do Supabase devolve o canal existente quando se pede outro
    // com o mesmo nome. Por isso o canal antigo precisa sair da lista dele na
    // hora — sem esperar resposta do servidor — senão o "novo" canal seria o
    // antigo, que nunca mais avisa que conectou (sala presa em Reconectando).
    const dropChannel = (ch: RealtimeChannel) => {
      try {
        void ch.unsubscribe();
      } catch {
        /* canal já fechado */
      }
      try {
        ch.teardown();
      } catch {
        /* idem */
      }
      (supabase.realtime as any)._remove?.(ch);
    };

    const dropAll = () => {
      const current = channelRef.current;
      channelRef.current = null;
      subscribedRef.current = false;
      if (current) dropChannel(current);
      supabase
        .getChannels()
        .filter((c) => c.topic === `realtime:${topic}`)
        .forEach(dropChannel);
    };

    function connect() {
      if (disposed) return;
      dropAll();
      armStuckTimer();

      const ch = supabase.channel(topic, {
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

      // Em CHANNEL_ERROR / TIMED_OUT o próprio Supabase tenta entrar de novo
      // sozinho e chama este callback com SUBSCRIBED quando conseguir.
      ch.subscribe(async (s, err) => {
        if (disposed || channelRef.current !== ch) return;
        if (s === "SUBSCRIBED") {
          clearStuckTimer();
          subscribedRef.current = true;
          graceUntilRef.current = Date.now() + JOIN_GRACE_MS;
          setReady(true);
          setStatus("online");
          try {
            await ch.track({ role, tab: tabIdRef.current, at: Date.now() });
          } catch (e) {
            console.warn("[Sala] falha ao registrar presença", e);
          }
          // Envia pedidos de sincronização que estavam esperando a conexão.
          pendingRequestsRef.current.forEach((payload, type) => rawSend(type, payload));
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
          if (err) console.warn(`[Sala] conexão ${s}`, err);
          subscribedRef.current = false;
          setReady(false);
          setStatus("reconnecting");
          armStuckTimer();
        } else if (s === "CLOSED") {
          // Canal fechado sem a gente pedir: abre outro.
          subscribedRef.current = false;
          setReady(false);
          setPeers(0);
          setStatus("reconnecting");
          setTimeout(() => {
            if (!disposed && channelRef.current === ch) connect();
          }, 1000);
        }
      });
    }

    const wakeUp = () => {
      if (disposed) return;
      if (document.visibilityState === "visible" && !subscribedRef.current) {
        clearStuckTimer();
        connect();
      }
    };

    setStatus("connecting");
    connect();
    window.addEventListener("online", wakeUp);
    document.addEventListener("visibilitychange", wakeUp);

    return () => {
      disposed = true;
      clearStuckTimer();
      if (rebroadcastTimer) clearTimeout(rebroadcastTimer);
      window.removeEventListener("online", wakeUp);
      document.removeEventListener("visibilitychange", wakeUp);
      dropAll();
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
