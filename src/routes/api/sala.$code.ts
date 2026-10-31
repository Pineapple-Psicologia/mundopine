import { createFileRoute } from "@tanstack/react-router";

/**
 * Canal em tempo real da sala, servido pelo próprio app (sem Supabase Realtime).
 *
 * - GET  /api/sala/CODE?client=ID&role=psi|paciente  → stream SSE com eventos:
 *     "presence" { keys: string[], joined?: string }  (quem está na sala)
 *     "msg"      { type, payload, from }              (mensagens dos outros)
 * - POST /api/sala/CODE  { client, from, messages: [{ type, payload }] }
 *     → repassa as mensagens, na ordem, para todos os outros da sala.
 *
 * O estado fica em memória do processo: funciona com um único container
 * (como no Easypanel). Salas vazias somem sozinhas.
 */

type Client = {
  key: string; // `${role}:${clientId}`
  send: (event: string, data: unknown) => boolean;
  close: () => void;
};

type Rooms = Map<string, Map<string, Client>>;

const g = globalThis as unknown as { __pineRooms?: Rooms };
const rooms: Rooms = (g.__pineRooms ??= new Map());

const CODE_RE = /^[A-Za-z0-9]{3,16}$/;
const CLIENT_RE = /^[A-Za-z0-9]{4,32}$/;
const MAX_CLIENTS_PER_ROOM = 12;
const MAX_ROOMS = 2000;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const HEARTBEAT_MS = 15_000;

const encoder = new TextEncoder();

function presenceKeys(room: Map<string, Client>) {
  return [...room.values()].map((c) => c.key);
}

function broadcastPresence(code: string, joined?: string) {
  const room = rooms.get(code);
  if (!room) return;
  const data = { keys: presenceKeys(room), joined };
  room.forEach((c, id) => {
    if (!c.send("presence", data)) removeClient(code, id, c);
  });
}

function removeClient(code: string, clientId: string, client: Client) {
  const room = rooms.get(code);
  if (!room || room.get(clientId) !== client) return;
  room.delete(clientId);
  client.close();
  if (room.size === 0) rooms.delete(code);
  else broadcastPresence(code);
}

function badRequest(msg: string, status = 400) {
  return new Response(msg, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/sala/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code.toUpperCase();
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client") ?? "";
        const role = url.searchParams.get("role") === "psi" ? "psi" : "paciente";
        if (!CODE_RE.test(code) || !CLIENT_RE.test(clientId)) return badRequest("invalid");

        let room = rooms.get(code);
        if (!room) {
          if (rooms.size >= MAX_ROOMS) return badRequest("busy", 503);
          room = new Map();
          rooms.set(code, room);
        }
        if (!room.has(clientId) && room.size >= MAX_CLIENTS_PER_ROOM) {
          return badRequest("room full", 429);
        }

        let heartbeat: ReturnType<typeof setInterval> | null = null;
        let client: Client | null = null;

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            let closed = false;
            const write = (chunk: string) => {
              if (closed) return false;
              try {
                controller.enqueue(encoder.encode(chunk));
                return true;
              } catch {
                closed = true;
                return false;
              }
            };
            client = {
              key: `${role}:${clientId}`,
              send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
              close: () => {
                if (heartbeat) clearInterval(heartbeat);
                if (closed) return;
                closed = true;
                try {
                  controller.close();
                } catch {
                  /* já fechado */
                }
              },
            };

            // Mesma aba reconectando: substitui a conexão antiga.
            const previous = room!.get(clientId);
            room!.set(clientId, client);
            previous?.close();

            write(`retry: 2000\n\n`);
            broadcastPresence(code, client.key);

            const c = client;
            heartbeat = setInterval(() => {
              if (!write(`: ping\n\n`)) removeClient(code, clientId, c);
            }, HEARTBEAT_MS);

            request.signal?.addEventListener("abort", () => removeClient(code, clientId, c));
          },
          cancel() {
            if (client) removeClient(code, clientId, client);
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },

      POST: async ({ request, params }) => {
        const code = params.code.toUpperCase();
        if (!CODE_RE.test(code)) return badRequest("invalid");

        const length = Number(request.headers.get("content-length") ?? 0);
        if (length > MAX_BODY_BYTES) return badRequest("too large", 413);

        let body: any;
        try {
          const text = await request.text();
          if (text.length > MAX_BODY_BYTES) return badRequest("too large", 413);
          body = JSON.parse(text);
        } catch {
          return badRequest("invalid json");
        }

        const clientId = String(body?.client ?? "");
        const from = body?.from === "psi" ? "psi" : "paciente";
        const messages = Array.isArray(body?.messages) ? body.messages : [];
        if (!CLIENT_RE.test(clientId)) return badRequest("invalid");

        const room = rooms.get(code);
        if (room) {
          for (const m of messages) {
            if (!m || typeof m.type !== "string") continue;
            const data = { type: m.type, payload: m.payload, from };
            room.forEach((c, id) => {
              if (id === clientId) return;
              if (!c.send("msg", data)) removeClient(code, id, c);
            });
          }
        }

        return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      },
    },
  },
});
