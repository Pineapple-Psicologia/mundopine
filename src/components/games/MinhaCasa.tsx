import { useEffect, useMemo, useRef, useState } from "react";
import type { useRoom } from "@/lib/useRoom";
import { Button } from "@/components/ui/button";
import { Home, RotateCcw, Download, Trash2, Sun, Moon, Sparkles, Cloud, EyeOff, X, StickyNote, Smile, BookmarkPlus } from "lucide-react";
import jsPDF from "jspdf";
import MinhaCasa3D, { type CasaCamera, type CasaCameraUpdate, type GardenStyle } from "./MinhaCasa3D";

import imgCrianca from "@/assets/casa/char-crianca.png";
import imgAdolescente from "@/assets/casa/char-adolescente.png";
import imgMae from "@/assets/casa/char-mae.png";
import imgPai from "@/assets/casa/char-pai.png";
import imgAvo from "@/assets/casa/char-avo.png";
import imgAvo2 from "@/assets/casa/char-avo2.png";
import imgIrmao from "@/assets/casa/char-irmao.png";
import imgIrma from "@/assets/casa/char-irma.png";
import imgCuidador from "@/assets/casa/char-cuidador.png";
import imgCao from "@/assets/casa/char-cao.png";
import imgGato from "@/assets/casa/char-gato.png";
// família negra
import imgMaeNegra from "@/assets/casa/char-mae-negra.png";
import imgPaiNegro from "@/assets/casa/char-pai-negro.png";
import imgCriancaNegra from "@/assets/casa/char-crianca-negra.png";
import imgAdolescenteNegro from "@/assets/casa/char-adolescente-negro.png";
import imgAvoNegra from "@/assets/casa/char-avo-negra.png";
import imgAvo2Negro from "@/assets/casa/char-avo2-negro.png";
import imgIrmaoNegro from "@/assets/casa/char-irmao-negro.png";
import imgIrmaNegra from "@/assets/casa/char-irma-negra.png";
// extras (mais irmãos / bebês)
import imgBebe from "@/assets/casa/char-bebe.png";
import imgBebeNegro from "@/assets/casa/char-bebe-negro.png";
import imgIrmaoCacula from "@/assets/casa/char-irmao-caculado.png";
import imgIrmaMaisVelha from "@/assets/casa/char-irma-mais-velha.png";

type Props = { room: ReturnType<typeof useRoom> };

type CharGroup = "familia" | "familia-negra" | "extras" | "pets";
type CharDef = { id: string; label: string; img: string; group: CharGroup; isPet?: boolean };

const CHARACTERS: CharDef[] = [
  // Família
  { id: "crianca",     label: "Criança",     img: imgCrianca,     group: "familia" },
  { id: "adolescente", label: "Adolescente", img: imgAdolescente, group: "familia" },
  { id: "mae",         label: "Mãe",         img: imgMae,         group: "familia" },
  { id: "pai",         label: "Pai",         img: imgPai,         group: "familia" },
  { id: "avo",         label: "Avó",         img: imgAvo,         group: "familia" },
  { id: "avo2",        label: "Avô",         img: imgAvo2,        group: "familia" },
  { id: "irmao",       label: "Irmão",       img: imgIrmao,       group: "familia" },
  { id: "irma",        label: "Irmã",        img: imgIrma,        group: "familia" },
  { id: "cuidador",    label: "Cuidador(a)", img: imgCuidador,    group: "familia" },
  // Família negra
  { id: "mae-n",         label: "Mãe",         img: imgMaeNegra,         group: "familia-negra" },
  { id: "pai-n",         label: "Pai",         img: imgPaiNegro,         group: "familia-negra" },
  { id: "crianca-n",     label: "Criança",     img: imgCriancaNegra,     group: "familia-negra" },
  { id: "adolescente-n", label: "Adolescente", img: imgAdolescenteNegro, group: "familia-negra" },
  { id: "avo-n",         label: "Avó",         img: imgAvoNegra,         group: "familia-negra" },
  { id: "avo2-n",        label: "Avô",         img: imgAvo2Negro,        group: "familia-negra" },
  { id: "irmao-n",       label: "Irmão",       img: imgIrmaoNegro,       group: "familia-negra" },
  { id: "irma-n",        label: "Irmã",        img: imgIrmaNegra,        group: "familia-negra" },
  // Mais irmãos / bebês
  { id: "bebe",          label: "Bebê",            img: imgBebe,           group: "extras" },
  { id: "bebe-n",        label: "Bebê",            img: imgBebeNegro,      group: "extras" },
  { id: "irmao-cacula",  label: "Irmão caçula",    img: imgIrmaoCacula,    group: "extras" },
  { id: "irma-mais-velha", label: "Irmã mais velha", img: imgIrmaMaisVelha, group: "extras" },
  // Pets
  { id: "cao",         label: "Cachorro",    img: imgCao,  group: "pets", isPet: true },
  { id: "gato",        label: "Gato",        img: imgGato, group: "pets", isPet: true },
];

const GROUP_LABELS: Record<CharGroup, string> = {
  "familia": "Família",
  "familia-negra": "Família",
  "extras": "Mais integrantes",
  "pets": "Pets",
};

type Emotion = "feliz" | "calmo" | "amoroso" | "triste" | "bravo" | "ansioso" | "neutro";
const EMOTIONS: { id: Emotion; label: string; color: string }[] = [
  { id: "neutro",  label: "Neutro",  color: "transparent" },
  { id: "feliz",   label: "Feliz",   color: "#fbbf24" },
  { id: "calmo",   label: "Calmo",   color: "#60a5fa" },
  { id: "amoroso", label: "Amoroso", color: "#f472b6" },
  { id: "triste",  label: "Triste",  color: "#64748b" },
  { id: "bravo",   label: "Bravo",   color: "#ef4444" },
  { id: "ansioso", label: "Ansioso", color: "#a855f7" },
];

type Mood = "dia" | "aconchego" | "calmo" | "noite";
const MOODS: { id: Mood; label: string; icon: any; overlay: string; blend: string }[] = [
  { id: "dia",       label: "Dia",       icon: Sun,      overlay: "transparent",                          blend: "normal" },
  { id: "aconchego", label: "Aconchego", icon: Sparkles, overlay: "rgba(255,170,80,0.22)",                blend: "soft-light" },
  { id: "calmo",     label: "Calmo",     icon: Cloud,    overlay: "rgba(120,180,230,0.25)",               blend: "soft-light" },
  { id: "noite",     label: "Noite",     icon: Moon,     overlay: "rgba(15,20,55,0.55)",                  blend: "multiply" },
];

type Placed = {
  id: string;       // unique
  charId: string;   // CharDef.id
  x: number; y: number; // 0..1 (% do canvas)
  scale: number;        // 0.6..1.6
  flip: boolean;        // espelhar horizontalmente
  emotion: Emotion;
};

type Cover = {
  id: string;
  x: number; y: number;   // top-left 0..1
  w: number; h: number;   // 0..1
  label: string;
};

type Note = {
  id: string;
  x: number; y: number;   // top-left 0..1
  w: number; h: number;   // 0..1
  text: string;
  color: "amarelo" | "rosa" | "azul" | "verde";
};

const NOTE_COLORS: Record<Note["color"], { bg: string; border: string }> = {
  amarelo: { bg: "#fff7c2", border: "#f5d76e" },
  rosa:    { bg: "#ffd6e0", border: "#f48fb1" },
  azul:    { bg: "#cfe7ff", border: "#7fb8e8" },
  verde:   { bg: "#d6f5d6", border: "#7fc77f" },
};

type Sticker = {
  id: string;
  x: number; y: number;   // 0..1 (centro)
  scale: number;          // 0.6..2.2
  emoji: string;
};

const EMOJI_GROUPS: { label: string; items: { emoji: string; name: string }[] }[] = [
  {
    label: "Sentimentos",
    items: [
      { emoji: "😀", name: "feliz" },
      { emoji: "😊", name: "contente" },
      { emoji: "🥰", name: "amoroso" },
      { emoji: "😍", name: "apaixonado" },
      { emoji: "🤗", name: "abraço" },
      { emoji: "😌", name: "calmo" },
      { emoji: "😴", name: "sono" },
      { emoji: "😢", name: "triste" },
      { emoji: "😭", name: "chorando" },
      { emoji: "😞", name: "desanimado" },
      { emoji: "😟", name: "preocupado" },
      { emoji: "😨", name: "com medo" },
      { emoji: "😰", name: "ansioso" },
      { emoji: "😡", name: "bravo" },
      { emoji: "🤬", name: "muito bravo" },
      { emoji: "😤", name: "irritado" },
      { emoji: "😳", name: "envergonhado" },
      { emoji: "😬", name: "tenso" },
      { emoji: "🤒", name: "doente" },
      { emoji: "🤕", name: "machucado" },
      { emoji: "🥱", name: "entediado" },
      { emoji: "😶", name: "calado" },
      { emoji: "🤔", name: "pensativo" },
      { emoji: "😎", name: "confiante" },
    ],
  },
  {
    label: "Símbolos",
    items: [
      { emoji: "❤️", name: "amor" },
      { emoji: "💔", name: "coração partido" },
      { emoji: "✨", name: "brilho" },
      { emoji: "⭐", name: "estrela" },
      { emoji: "🌈", name: "arco-íris" },
      { emoji: "☀️", name: "sol" },
      { emoji: "☁️", name: "nuvem" },
      { emoji: "⛈️", name: "tempestade" },
      { emoji: "🔥", name: "fogo" },
      { emoji: "💤", name: "dormir" },
      { emoji: "💭", name: "pensamento" },
      { emoji: "💬", name: "fala" },
      { emoji: "❓", name: "dúvida" },
      { emoji: "❗", name: "atenção" },
      { emoji: "🚫", name: "não" },
      { emoji: "🎉", name: "festa" },
    ],
  },
];

type State = { items: Placed[]; mood: Mood; covers: Cover[]; notes: Note[]; stickers: Sticker[]; garden: GardenStyle };
type MovePayload = { kind: "item" | "cover" | "note" | "sticker"; id: string; x: number; y: number };
const DEFAULT_STATE: State = { items: [], mood: "dia", covers: [], notes: [], stickers: [], garden: "florido" };
type ScenePreset = { id: string; name: string; state: State };
const PRESETS_KEY = "casa:presets";
const loadPresets = (): ScenePreset[] => {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]") as ScenePreset[]; } catch { return []; }
};
const uid = () => Math.random().toString(36).slice(2, 9);

export default function MinhaCasa({ room }: Props) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [presets, setPresets] = useState<ScenePreset[]>([]);
  const remoteCameraRef = useRef<CasaCamera | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // sync realtime — evita ping-pong: quando o estado chega do peer (ou de um
  // moveShared local), NÃO arma um novo timer de broadcast pra essa mudança.
  const remoteRef = useRef(false);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espelha sempre o `state` mais atual (atualizado a cada render, sem depender
  // de quem originou a mudança) — assim, quando o timer de debounce disparar,
  // ele nunca manda uma foto antiga que sobrescreveria uma posição já correta
  // no peer (ver PLANO: causa raiz 2 — item "volta" pra posição errada).
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    return room.on?.((m) => {
      if (m.type === "casa:state") {
        const p = m.payload as Partial<State>;
        remoteRef.current = true;
        setState({ ...DEFAULT_STATE, ...p, covers: p.covers ?? [], notes: p.notes ?? [], stickers: p.stickers ?? [], garden: p.garden ?? "florido" });
      } else if (m.type === "casa:cam") {
        const update = m.payload as CasaCameraUpdate;
        const previous = remoteCameraRef.current ?? { x: 0, z: 19.2, yaw: 0, pitch: -0.04, targetX: 0, targetZ: 19.2, moving: false, t: 0 };
        remoteCameraRef.current = { ...previous, ...update };
      } else if (m.type === "casa:move") {
        const move = m.payload as MovePayload;
        remoteRef.current = true;
        setState((current) => {
          if (move.kind === "item") return { ...current, items: current.items.map((item) => item.id === move.id ? { ...item, x: move.x, y: move.y } : item) };
          if (move.kind === "cover") return { ...current, covers: current.covers.map((cover) => cover.id === move.id ? { ...cover, x: move.x, y: move.y } : cover) };
          if (move.kind === "note") return { ...current, notes: current.notes.map((note) => note.id === move.id ? { ...note, x: move.x, y: move.y } : note) };
          return { ...current, stickers: current.stickers.map((sticker) => sticker.id === move.id ? { ...sticker, x: move.x, y: move.y } : sticker) };
        });
      }
    });
  }, [room]);

  useEffect(() => {
    if (!room.ready) return;
    if (remoteRef.current) {
      remoteRef.current = false; // consumida; não arma novo timer para esta mudança
      return;
    }
    if (sendTimerRef.current) return; // já tem um envio armado — ele vai pegar o state mais atual ao disparar
    sendTimerRef.current = setTimeout(() => {
      sendTimerRef.current = null;
      room.send?.("casa:state", stateRef.current);
    }, 140);
  }, [state, room]);

  useEffect(() => () => {
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
  }, []);

  const addCharacter = (c: CharDef) => {
    setState((s) => ({
      ...s,
      items: [
        ...s.items,
        { id: uid(), charId: c.id, x: 0.5, y: 0.31, scale: 1, flip: false, emotion: "neutro" },
      ],
    }));
  };
  const removeSelected = () => {
    if (!selectedId) return;
    setState((s) => ({
      ...s,
      items: s.items.filter((i) => i.id !== selectedId),
      covers: s.covers.filter((c) => c.id !== selectedId),
      notes: s.notes.filter((n) => n.id !== selectedId),
      stickers: s.stickers.filter((st) => st.id !== selectedId),
    }));
    setSelectedId(null);
  };
  const updateSelected = (patch: Partial<Placed>) => {
    if (!selectedId) return;
    setState((s) => ({ ...s, items: s.items.map((i) => i.id === selectedId ? { ...i, ...patch } : i) }));
  };

  const addCover = () => {
    const id = uid();
    setState((s) => ({
      ...s,
      covers: [...s.covers, { id, x: 0.35, y: 0.15, w: 0.3, h: 0.25, label: "não tenho" }],
    }));
    setSelectedId(id);
  };
  const updateCover = (id: string, patch: Partial<Cover>) => {
    setState((s) => ({ ...s, covers: s.covers.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  };
  const removeCover = (id: string) => {
    setState((s) => ({ ...s, covers: s.covers.filter((c) => c.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const addNote = () => {
    const id = uid();
    setState((s) => ({
      ...s,
      notes: [...s.notes, { id, x: 0.4, y: 0.17, w: 0.22, h: 0.18, text: "", color: "amarelo" }],
    }));
    setSelectedId(id);
  };
  const updateNote = (id: string, patch: Partial<Note>) => {
    setState((s) => ({ ...s, notes: s.notes.map((n) => n.id === id ? { ...n, ...patch } : n) }));
  };
  const removeNote = (id: string) => {
    setState((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const addSticker = (emoji: string) => {
    const id = uid();
    setState((s) => ({
      ...s,
      stickers: [...s.stickers, { id, x: 0.5, y: 0.22, scale: 1, emoji }],
    }));
    setSelectedId(id);
  };
  const updateSticker = (id: string, patch: Partial<Sticker>) => {
    setState((s) => ({ ...s, stickers: s.stickers.map((st) => st.id === id ? { ...st, ...patch } : st) }));
  };

  const moveShared = (move: MovePayload) => {
    remoteRef.current = true;
    setState((current) => {
      if (move.kind === "item") return { ...current, items: current.items.map((item) => item.id === move.id ? { ...item, x: move.x, y: move.y } : item) };
      if (move.kind === "cover") return { ...current, covers: current.covers.map((cover) => cover.id === move.id ? { ...cover, x: Math.min(move.x, 1 - cover.w), y: Math.min(move.y, 1 - cover.h) } : cover) };
      if (move.kind === "note") return { ...current, notes: current.notes.map((note) => note.id === move.id ? { ...note, x: Math.min(move.x, 1 - note.w), y: Math.min(move.y, 1 - note.h) } : note) };
      return { ...current, stickers: current.stickers.map((sticker) => sticker.id === move.id ? { ...sticker, x: move.x, y: move.y } : sticker) };
    });
    if (room.ready) room.send?.("casa:move", move);
  };
  const removeSticker = (id: string) => {
    setState((s) => ({ ...s, stickers: s.stickers.filter((st) => st.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  // leituras simbólicas
  const characters = state.items;
  const proximity = useMemo(() => {
    const pairs: { a: Placed; b: Placed; dist: number }[] = [];
    for (let i = 0; i < characters.length; i++)
      for (let j = i + 1; j < characters.length; j++) {
        const a = characters[i], b = characters[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        pairs.push({ a, b, dist });
      }
    return pairs.sort((p, q) => p.dist - q.dist);
  }, [characters]);

  useEffect(() => { setPresets(loadPresets()); }, []);
  const persistPresets = (next: ScenePreset[]) => {
    setPresets(next);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); } catch { /* armazenamento indisponível */ }
  };
  const savePreset = () => {
    const name = window.prompt("Nome desta cena (ex.: Casa da avó · sereno)");
    if (!name?.trim()) return;
    persistPresets([...presets, { id: uid(), name: name.trim(), state }]);
  };
  const loadPreset = (preset: ScenePreset) => {
    setState({ ...DEFAULT_STATE, ...preset.state });
    setSelectedId(null);
    setPresetsOpen(false);
  };
  const removePreset = (id: string) => persistPresets(presets.filter((p) => p.id !== id));

  const sendCamera = (camera: CasaCameraUpdate) => {
    if (room.ready) room.send?.("casa:cam", camera);
  };
  const setGarden = (garden: GardenStyle) => setState((s) => ({ ...s, garden }));

  const reset = () => { setState(DEFAULT_STATE); setSelectedId(null); };
  const exportPdf = () => exportCasaPdf(state, proximity);
  const selected = state.items.find((i) => i.id === selectedId) || null;
  const selectedDef = selected ? CHARACTERS.find((c) => c.id === selected.charId) : null;

  return (
    <div className="flex flex-col h-full gap-2 sm:gap-3 p-1 sm:p-0">
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <Home className="w-5 h-5 text-amber-700 shrink-0" />
          <h2 className="font-display text-base sm:text-xl font-bold truncate">Minha Casa</h2>
          <span className="text-xs text-muted-foreground hidden md:inline">Quem mora aqui? Onde cada um fica?</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap relative">
          <Button size="sm" variant="outline" className="sm:hidden h-8 px-2" onClick={() => setSidebarOpen((v) => !v)}>
            👥 <span className="ml-1 text-xs">Pessoas</span>
          </Button>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setEmojiOpen((v) => !v)} title="Adicionar emoji">
              <Smile className="w-4 h-4" /> <span className="hidden sm:inline">Emojis</span>
            </Button>
            {emojiOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setEmojiOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-50 w-[320px] max-h-[360px] overflow-auto bg-white border rounded-xl shadow-xl p-3">
                  {EMOJI_GROUPS.map((grp) => (
                    <div key={grp.label} className="mb-2 last:mb-0">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1 mb-1">{grp.label}</div>
                      <div className="grid grid-cols-8 gap-1">
                        {grp.items.map((it) => (
                          <button
                            key={it.emoji}
                            onClick={() => { addSticker(it.emoji); setEmojiOpen(false); }}
                            title={it.name}
                            className="aspect-square flex items-center justify-center text-2xl rounded-md hover:bg-amber-50 transition"
                          >
                            {it.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={addNote} title="Adicionar uma nota / caixa de texto">
            <StickyNote className="w-4 h-4" /> <span className="hidden sm:inline">Adicionar nota</span>
          </Button>
          <Button size="sm" variant="outline" onClick={addCover} title="Cobrir um cômodo que não existe">
            <EyeOff className="w-4 h-4" /> <span className="hidden sm:inline">Cobrir cômodo</span>
          </Button>
          <div className="flex gap-1 rounded-lg bg-white/80 border p-1 shadow-sm">
            {MOODS.map((m) => {
              const Icon = m.icon;
              const active = state.mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setState((s) => ({ ...s, mood: m.id }))}
                  title={m.label}
                  className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1 transition ${active ? "bg-amber-100 text-amber-900 font-semibold" : "hover:bg-amber-50 text-muted-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Button size="sm" variant="outline" onClick={() => setPresetsOpen((v) => !v)} title="Salvar ou carregar cenas">
              <BookmarkPlus className="w-4 h-4" /> <span className="hidden sm:inline">Cenas</span>
            </Button>
            {presetsOpen && (
              <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border bg-white p-2 shadow-2xl">
                <Button size="sm" className="w-full mb-2" onClick={savePreset}>Salvar cena atual</Button>
                {presets.length === 0 && <p className="px-1 pb-1 text-[11px] text-muted-foreground">Nenhuma cena salva ainda.</p>}
                <div className="max-h-56 overflow-auto flex flex-col gap-1">
                  {presets.map((preset) => (
                    <div key={preset.id} className="flex items-center gap-1">
                      <button onClick={() => loadPreset(preset)} className="flex-1 text-left text-xs px-2 py-1.5 rounded-md hover:bg-amber-50 truncate">
                        {preset.name}
                      </button>
                      <button onClick={() => removePreset(preset.id)} title="Apagar" className="w-7 h-7 rounded-md border flex items-center justify-center text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={state.items.length === 0 && state.notes.length === 0 && state.covers.length === 0 && state.stickers.length === 0}>
            <Download className="w-4 h-4" /> PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-2 sm:gap-3 min-h-0 relative">
        {/* sidebar de personagens — drawer no mobile */}
        {sidebarOpen && (
          <div className="sm:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} sm:translate-x-0 transition-transform fixed sm:static left-0 top-0 h-full z-50 sm:z-auto w-44 sm:w-48 shrink-0 bg-white sm:bg-white/85 border rounded-none sm:rounded-xl p-2 overflow-auto shadow-2xl sm:shadow-none`}
        >
          <div className="flex items-center justify-between sm:hidden mb-2">
            <span className="text-xs font-bold">Pessoas & Pets</span>
            <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 rounded-full border flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          {(["familia", "familia-negra", "extras", "pets"] as CharGroup[]).map((grp, idx) => {
            const items = CHARACTERS.filter((c) => c.group === grp);
            if (items.length === 0) return null;
            const label = GROUP_LABELS[grp];
            return (
              <div key={grp} className={idx > 0 ? "mt-3" : ""}>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1 mb-1">{label}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { addCharacter(c); setSidebarOpen(false); }}
                      title={`Adicionar ${c.label}`}
                      className="group flex flex-col items-center gap-0.5 p-1.5 rounded-lg border bg-white hover:bg-amber-50 hover:border-amber-300 transition"
                    >
                      <div className="w-full aspect-square bg-gradient-to-b from-amber-50 to-white rounded-md overflow-hidden flex items-end justify-center">
                        <img src={c.img} alt={c.label} className="h-full w-auto object-contain group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                      <span className="text-[10px] font-semibold text-center leading-tight">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </aside>

        {/* casa terapêutica 3D */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="relative flex-1 min-h-[430px] short:min-h-[300px] rounded-xl border-4 border-accent/25 overflow-hidden shadow-xl touch-none">
            <MinhaCasa3D
              items={state.items}
              covers={state.covers}
              notes={state.notes}
              stickers={state.stickers}
              characters={CHARACTERS}
              mood={state.mood}
              garden={state.garden}
              onGardenChange={setGarden}
              remoteCamera={remoteCameraRef}
              onCamera={sendCamera}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onMoveItem={(id, x, y) => moveShared({ kind: "item", id, x, y })}
              onMoveCover={(id, x, y) => moveShared({ kind: "cover", id, x, y })}
              onMoveNote={(id, x, y) => moveShared({ kind: "note", id, x, y })}
              onMoveSticker={(id, x, y) => moveShared({ kind: "sticker", id, x, y })}
              onChangeNote={(id, text) => updateNote(id, { text })}
            />
          </div>

          {/* painel inferior */}
          <div className="rounded-xl bg-white/85 border p-3 min-h-[96px]">
            {(() => {
              const selectedSticker = state.stickers.find((s) => s.id === selectedId);
              if (selectedSticker) {
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-2xl leading-none">{selectedSticker.emoji}</span>
                    <div className="font-semibold">Emoji</div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-muted-foreground">tamanho</span>
                      <input
                        type="range" min={0.6} max={2.2} step={0.05}
                        value={selectedSticker.scale}
                        onChange={(e) => updateSticker(selectedSticker.id, { scale: parseFloat(e.target.value) })}
                        className="w-32"
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">arraste para mover</div>
                    <Button size="sm" variant="outline" onClick={() => removeSticker(selectedSticker.id)} className="ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> remover
                    </Button>
                  </div>
                );
              }
              const selectedNote = state.notes.find((n) => n.id === selectedId);
              if (selectedNote) {
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    <StickyNote className="w-5 h-5 text-amber-700 shrink-0" />
                    <div className="font-semibold">Nota</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground">cor</span>
                      {(Object.keys(NOTE_COLORS) as Note["color"][]).map((col) => (
                        <button
                          key={col}
                          onClick={() => updateNote(selectedNote.id, { color: col })}
                          className={`w-6 h-6 rounded-full border-2 transition ${selectedNote.color === col ? "ring-2 ring-amber-500 scale-110" : "border-white"}`}
                          style={{ background: NOTE_COLORS[col].bg, borderColor: NOTE_COLORS[col].border }}
                          title={col}
                        />
                      ))}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      digite direto na nota · arraste o cantinho colorido para redimensionar
                    </div>
                    <Button size="sm" variant="outline" onClick={() => removeNote(selectedNote.id)} className="ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> remover
                    </Button>
                  </div>
                );
              }
              const selectedCover = state.covers.find((c) => c.id === selectedId);
              if (selectedCover) {
                return (
                  <div className="flex items-center gap-3 flex-wrap">
                    <EyeOff className="w-5 h-5 text-amber-700 shrink-0" />
                    <div className="font-semibold">Cobertura de cômodo</div>
                    <input
                      type="text"
                      value={selectedCover.label}
                      onChange={(e) => updateCover(selectedCover.id, { label: e.target.value })}
                      placeholder="ex.: não tenho, não uso, vazio"
                      className="text-xs border rounded-md px-2 py-1 bg-white min-w-[180px]"
                    />
                    <div className="text-[11px] text-muted-foreground">arraste para mover · canto inferior direito redimensiona</div>
                    <Button size="sm" variant="outline" onClick={() => removeCover(selectedCover.id)} className="ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> remover
                    </Button>
                  </div>
                );
              }
              if (selected && selectedDef) {
                return (
                  <div className="flex gap-3 items-start">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-b from-amber-50 to-white border flex items-end justify-center overflow-hidden shrink-0">
                      <img src={selectedDef.img} alt="" className="h-full w-auto object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold">{selectedDef.label}</div>
                        <button
                          onClick={() => updateSelected({ flip: !selected.flip })}
                          className="text-[10px] px-2 py-0.5 rounded-full border bg-white hover:bg-amber-50"
                          title="Virar"
                        >
                          ⇄ virar
                        </button>
                        <div className="flex items-center gap-1 text-[10px]">
                          <span className="text-muted-foreground">tamanho</span>
                          <input
                            type="range" min={0.6} max={1.6} step={0.05}
                            value={selected.scale}
                            onChange={(e) => updateSelected({ scale: parseFloat(e.target.value) })}
                            className="w-24"
                          />
                        </div>
                        <Button size="sm" variant="outline" onClick={removeSelected} className="ml-auto">
                          <Trash2 className="w-3.5 h-3.5" /> remover
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {EMOTIONS.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => updateSelected({ emotion: e.id })}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition ${selected.emotion === e.id ? "bg-amber-100 border-amber-400 font-semibold" : "bg-white hover:bg-amber-50"}`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border"
                              style={{ background: e.color === "transparent" ? "white" : e.color, borderColor: e.color === "transparent" ? "#cbd5e1" : "transparent" }}
                            />
                            {e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
              <div className="text-sm text-muted-foreground">
                <strong>Como brincar:</strong> escolha pessoas e pets na lateral, arraste-os para os cômodos da casa. Clique em alguém para mudar tamanho, virar e escolher uma emoção (o brilho ao redor representa o sentimento). A iluminação muda a atmosfera da casa toda.
                {characters.length >= 2 && (
                  <div className="mt-1.5 text-xs">
                    <strong>Proximidades:</strong>{" "}
                    {proximity.slice(0, 3).map((p, i) => {
                      const a = CHARACTERS.find(c => c.id === p.a.charId)?.label;
                      const b = CHARACTERS.find(c => c.id === p.b.charId)?.label;
                      const tag = p.dist < 0.12 ? "muito próximos" : p.dist < 0.28 ? "próximos" : p.dist < 0.5 ? "distantes" : "muito distantes";
                      return <span key={i} className="mr-3">{a} ↔ {b}: <em>{tag}</em></span>;
                    })}
                  </div>
                )}
              </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- PDF ------------------------------------------------------------------

function exportCasaPdf(state: State, proximity: { a: Placed; b: Placed; dist: number }[]) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Minha Casa", 40, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  const moodLabel = MOODS.find(m => m.id === state.mood)?.label;
  doc.text(`Sessão · ${new Date().toLocaleDateString("pt-BR")} · Atmosfera: ${moodLabel}`, 40, y);
  y += 24;
  doc.setTextColor(20);

  const section = (title: string) => {
    if (y > 760) { doc.addPage(); y = 56; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(title, 40, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  };
  const line = (txt: string) => {
    if (y > 780) { doc.addPage(); y = 56; }
    const wrapped = doc.splitTextToSize(txt, W - 80);
    doc.text(wrapped, 50, y);
    y += wrapped.length * 14;
  };

  section(`Moradores posicionados (${state.items.length})`);
  if (state.items.length === 0) line("— nenhum personagem posicionado.");
  state.items.forEach((it) => {
    const def = CHARACTERS.find(c => c.id === it.charId);
    const emo = EMOTIONS.find(e => e.id === it.emotion);
    line(`• ${def?.label ?? it.charId} — emoção: ${emo?.label ?? "neutro"}`);
  });
  y += 8;

  if (state.covers.length > 0) {
    section(`Cômodos cobertos (${state.covers.length})`);
    state.covers.forEach((c) => line(`• ${c.label || "(sem rótulo)"}`));
    y += 8;
  }

  if (state.notes.length > 0) {
    section(`Notas do paciente (${state.notes.length})`);
    state.notes.forEach((n, i) => line(`${i + 1}. ${n.text.trim() || "(em branco)"}`));
    y += 8;
  }

  if (state.stickers.length > 0) {
    const counts = new Map<string, number>();
    state.stickers.forEach((s) => counts.set(s.emoji, (counts.get(s.emoji) ?? 0) + 1));
    section(`Emojis colocados (${state.stickers.length})`);
    Array.from(counts.entries()).forEach(([emo, n]) => {
      const meta = EMOJI_GROUPS.flatMap((g) => g.items).find((i) => i.emoji === emo);
      line(`• ${emo} ${meta?.name ?? ""} ×${n}`);
    });
    y += 8;
  }

  if (proximity.length > 0) {
    section("Proximidades simbólicas");
    proximity.slice(0, 10).forEach((p) => {
      const a = CHARACTERS.find(c => c.id === p.a.charId)?.label;
      const b = CHARACTERS.find(c => c.id === p.b.charId)?.label;
      const tag = p.dist < 0.12 ? "muito próximos" : p.dist < 0.28 ? "próximos" : p.dist < 0.5 ? "distantes" : "muito distantes";
      line(`• ${a} ↔ ${b}: ${tag}`);
    });
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(140);
    doc.text(`Minha Casa · página ${i} de ${pages}`, W / 2, 820, { align: "center" });
  }
  doc.save(`minha-casa-${new Date().toISOString().slice(0, 10)}.pdf`);
}
