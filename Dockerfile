FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
# Build (Vite + Nitro) em VPS com pouca RAM sobrando fica no limite do heap
# padrao do V8 e derruba o processo (OOM); com o swap do host isso vira mais
# lento em vez de travar, mas ainda assim damos um teto explicito ao heap.
ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
