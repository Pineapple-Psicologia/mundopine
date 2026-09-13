import { createFileRoute } from "@tanstack/react-router";

type LensId = "neutra" | "vergonha" | "catastrofe" | "curiosa";

const PROMPTS: Record<LensId, string> = {
  neutra:
    "Calm classroom ambient: distant murmurs of children, pencils on paper, soft pages turning, gentle chair creaks, peaceful natural room tone, no music",
  vergonha:
    "Anxious internal point-of-view: muffled distant voices through ringing ears, slow thumping heartbeat, soft tinnitus high tone, claustrophobic muted classroom, no music",
  catastrofe:
    "Tense cinematic underscore: deep rumbling drone, distant low thunder, dissonant sustained strings, dread building, no melody, no voices",
  curiosa:
    "Light cozy classroom ambient: clear children softly chatting and giggling about a phone video, warm soft tone, curious gentle mood, no music",
};

const DURATION_SECONDS = 14;

const cache = new Map<LensId, ArrayBuffer>();

// Basic per-IP rate limit (token-bucket style, in-memory).
// Limit: 20 requests per minute per IP. Resets on process restart.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || b.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT;
}

async function generate(lens: LensId): Promise<ArrayBuffer> {
  const cached = cache.get(lens);
  if (cached) return cached;

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: PROMPTS[lens],
      duration_seconds: DURATION_SECONDS,
      prompt_influence: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Log full error server-side only; never forward to caller.
    throw new Error(`ElevenLabs SFX failed [${res.status}]: ${err}`);
  }

  const buf = await res.arrayBuffer();
  cache.set(lens, buf);
  return buf;
}

export const Route = createFileRoute("/api/public/lentes-sfx")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const lens = url.searchParams.get("lens") as LensId | null;
        if (!lens || !(lens in PROMPTS)) {
          return new Response("Invalid lens", { status: 400 });
        }

        // Sem borda Cloudflare aqui: o IP real vem do x-forwarded-for que o
        // proxy reverso (Traefik, no EasyPanel) define. Pegamos o primeiro
        // IP da lista. Isso é só uma proteção informal contra abuso —
        // diferente do cf-connecting-ip da Cloudflare, x-forwarded-for pode
        // em tese ser forjado se o proxy não sobrescrever o header recebido.
        const forwardedFor = request.headers.get("x-forwarded-for");
        const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";


        if (rateLimited(ip)) {
          return new Response("Too many requests", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        }

        try {
          const audio = await generate(lens);
          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "public, max-age=86400, immutable",
            },
          });
        } catch (e) {
          // Log full error server-side; return generic message to caller.
          console.error("[lentes-sfx] error:", (e as Error).message);
          return new Response("Audio generation failed", { status: 500 });
        }
      },
    },
  },
});
