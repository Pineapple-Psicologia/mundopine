import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CreditCard,
  Gamepad2,
  Heart,
  Instagram,
  MessageCircle,
  Monitor,
  Phone,
  Quote,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

const WHATSAPP_URL =
  "https://api.whatsapp.com/send?phone=5511945157506&text=Ol%C3%A1%2C%20vim%20pelo%20site!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20a%20consulta.";
const INSTAGRAM_URL = "https://www.instagram.com/psiraquelandrade/";

export const Route = createFileRoute("/landing")({
  head: () => ({
    meta: [
      { title: "Instituto Pine — Psicologia infantojuvenil online" },
      {
        name: "description",
        content:
          "Terapia online para crianças (a partir de 7 anos) e adolescentes (até 17 anos) com a psicóloga Raquel Andrade — TCC com foco na família.",
      },
      { property: "og:title", content: "Instituto Pine — Psicologia infantojuvenil online" },
      {
        property: "og:description",
        content: "Os ensinamentos de hoje são os comportamentos de amanhã.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: LandingPage,
});

const SIGNS = [
  { title: "Ansiedade", text: "Choro excessivo, medos irracionais e preocupações constantes que afetam a escola e as amizades." },
  { title: "Medos, tristeza e raiva", text: "Emoções intensas demais podem ser a forma de a criança expressar frustração ou insegurança." },
  { title: "Dificuldade com o “não”", text: "Birras e reações intensas mostram habilidades emocionais ainda em construção." },
  { title: "Agressividade", text: "Reflexo de dificuldades emocionais ou de um ambiente desafiador — dá para ensinar formas saudáveis de expressão." },
  { title: "TDAH", text: "Desatenção, impulsividade e hiperatividade que dificultam seguir regras e controlar impulsos." },
  { title: "Depressão", text: "Tristeza constante, irritabilidade, perda de interesse e isolamento pedem acompanhamento." },
  { title: "Baixa autoestima", text: "Autoimagem frágil e comparação constante com os outros." },
  { title: "Timidez excessiva", text: "Quando a insegurança atrapalha a interação social e o desenvolvimento." },
  { title: "Alimentação", text: "Dificuldades alimentares ligadas a questões emocionais, como a ansiedade." },
  { title: "Socialização e aprendizagem", text: "Desatenção, problemas escolares e dificuldade de fazer amigos." },
  { title: "Fases de transição", text: "Divórcio dos pais, mudança de escola ou de cidade." },
  { title: "Luto e perdas", text: "Acolhimento para atravessar perdas importantes." },
];

const STEPS = [
  { icon: MessageCircle, title: "Fale no WhatsApp", text: "Conte um pouco sobre o que está acontecendo." },
  { icon: CalendarCheck, title: "Escolha o horário", text: "Sessões semanais de 50 minutos a 1 hora." },
  { icon: CreditCard, title: "Confirme", text: "Pagamento por transferência ou PIX." },
  { icon: Monitor, title: "Entre na sessão", text: "É só acessar a plataforma no horário marcado." },
];

const TESTIMONIALS = [
  { who: "E.M.D", text: "Tivemos o prazer de investir no tratamento do nosso filho de 7 aninhos com a melhor psicóloga." },
  { who: "C.S.S", text: "Foi uma experiência maravilhosa. Meu filho amou, eu e minha esposa adoramos." },
  { who: "D.S", text: "A Dra é paciente e bem explicativa, tem nos auxiliado — o ambiente em casa melhorou muito." },
  { who: "A.C.A.O", text: "A Raquel é mais que uma psicóloga, é uma pessoa super humana, competente, que consegue ter uma visão do todo." },
  { who: "M.R.F.F", text: "O atendimento é bem humanizado, sinto que todos somos ouvidos. A cada sessão estamos evoluindo." },
  { who: "L.M.S", text: "Foi onde nosso filho encontrou seu lugar no mundo, com acolhimento, conhecimento e interesse." },
  { who: "M.A", text: "Os atendimentos estão sendo essenciais na vida do meu filho de 14 anos e da nossa família." },
  { who: "H.V", text: "Superou as minhas expectativas. A cada dia percebo minha filha mais participativa e amorosa." },
  { who: "G.M", text: "Profissional excelente, muito querida e competente. Notamos avanços importantes na nossa filha." },
];

const FAQ = [
  { q: "Aceita convênio?", a: "Não trabalhamos com convênios, mas emitimos nota fiscal para você solicitar reembolso ao seu plano." },
  { q: "Qual o valor da consulta?", a: "Por orientação ética do Conselho Federal de Psicologia, valores não são divulgados publicamente. Chame no WhatsApp que explicamos tudo." },
  { q: "Existe atendimento presencial?", a: "Não. Os atendimentos são realizados somente online." },
  { q: "Terapia online funciona para crianças?", a: "Sim! Pesquisas mostram que a terapia online com crianças e adolescentes, especialmente baseada em TCC, é tão eficaz quanto a presencial." },
  { q: "Como saber se meu filho precisa de terapia?", a: "Se você reconheceu algum dos sinais descritos nesta página, vale conversar. Uma primeira conversa ajuda a entender o momento da família." },
  { q: "Meu celular ou internet não são bons. É um problema?", a: "Não. A plataforma adapta a qualidade da chamada à conexão disponível." },
  { q: "Posso remarcar?", a: "Cada consulta pode ser remarcada uma vez, pelo WhatsApp, com até 24h de antecedência." },
];

function PineMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path d="M32 4c-3 6-3 11 0 16 3-5 3-10 0-16Z" fill="var(--primary)" />
      <path d="M20 8c1 7 5 11 11 13-2-6-6-10-11-13Z" fill="var(--primary)" opacity=".8" />
      <path d="M44 8c-1 7-5 11-11 13 2-6 6-10 11-13Z" fill="var(--primary)" opacity=".8" />
      <ellipse cx="32" cy="41" rx="16" ry="20" fill="var(--accent)" />
      <path
        d="M20 32l24 20M20 44l18 14M26 24l20 16M44 32L20 52M44 44L26 58M38 24L18 40"
        stroke="oklch(0.2 0.04 70 / .25)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WhatsButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Button asChild size="lg" className={`rounded-full h-12 px-6 text-base ${className}`}>
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="w-5 h-5 mr-1" /> {children}
      </a>
    </Button>
  );
}

function LandingPage() {
  const [openSign, setOpenSign] = useState<number | null>(0);

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <PineMark className="w-8 h-8" />
            <span className="font-display font-bold text-foreground text-lg hidden sm:inline">Instituto Pine</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted-foreground">
            <a href="#sinais" className="hover:text-foreground">Sinais</a>
            <a href="#como-funciona" className="hover:text-foreground">Como funciona</a>
            <a href="#sobre" className="hover:text-foreground">Sobre</a>
            <a href="#familias" className="hover:text-foreground">Famílias</a>
            <a href="#duvidas" className="hover:text-foreground">Dúvidas</a>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Agendar</a>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-[1.25fr_1fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Psicologia infantojuvenil · 100% online
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[0.98] text-foreground">
              Os ensinamentos de hoje são os{" "}
              <span className="relative inline-block text-primary">
                comportamentos
                <svg viewBox="0 0 300 16" className="absolute left-0 -bottom-2 w-full h-3" preserveAspectRatio="none" aria-hidden>
                  <path d="M2 10 C 80 2, 180 16, 298 6" stroke="var(--accent)" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>{" "}
              de amanhã.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-xl">
              Que mudanças você quer ver no futuro do seu filho? Terapia para crianças a partir de 7 anos
              e adolescentes até 17 — com a família caminhando junto.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <WhatsButton>Quero conversar</WhatsButton>
              <Button asChild variant="outline" size="lg" className="rounded-full h-12 px-6 text-base">
                <a href="#sinais">
                  Ver sinais <ArrowRight className="w-4 h-4 ml-1" />
                </a>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              Não atendemos convênios — emitimos nota fiscal para reembolso.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm aspect-square">
            <div className="absolute inset-0 rounded-[40%_60%_55%_45%/50%_45%_55%_50%] bg-primary/15 animate-landing-blob" />
            <div className="absolute inset-8 rounded-[55%_45%_40%_60%/45%_55%_45%_55%] bg-accent/20 animate-landing-blob [animation-delay:-4s]" />
            <PineMark className="absolute inset-0 m-auto w-1/2 h-1/2 animate-avatar-bob drop-shadow-xl" />
            <div className="absolute -left-2 top-10 bg-card shadow-lg rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> +40 famílias
            </div>
            <div className="absolute -right-2 bottom-12 bg-card shadow-lg rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2">
              <Gamepad2 className="w-4 h-4 text-accent" /> Sessões lúdicas
            </div>
          </div>
        </div>
      </header>

      {/* Proof band */}
      <section className="bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            ["3 anos", "dedicados à clínica infantojuvenil"],
            ["+40", "famílias acompanhadas"],
            ["7–17", "anos de idade"],
            ["TCC", "com ênfase em famílias"],
          ].map(([n, l]) => (
            <div key={n}>
              <div className="font-display text-3xl md:text-4xl font-bold text-accent">{n}</div>
              <div className="text-xs md:text-sm opacity-70 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Sinais */}
      <section id="sinais" className="max-w-6xl mx-auto px-4 py-20 md:py-28 scroll-mt-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Você reconhece algum destes?</p>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">Sinais de que seu filho pode precisar de apoio</h2>
        </div>
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-8 items-start">
          <div className="flex flex-wrap gap-2">
            {SIGNS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setOpenSign(i)}
                className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all ${
                  openSign === i
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : "bg-card border-border hover:border-primary/60"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div className="md:sticky md:top-24 rounded-3xl bg-card border-2 border-border/60 p-8 min-h-[220px] shadow-sm">
            {openSign !== null && (
              <div key={openSign} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-5xl font-display font-bold text-accent/40 leading-none mb-3">
                  {String(openSign + 1).padStart(2, "0")}
                </div>
                <h3 className="text-2xl font-bold mb-3">{SIGNS[openSign].title}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">{SIGNS[openSign].text}</p>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
                >
                  Conversar sobre isso <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Por que online */}
      <section className="bg-secondary/60">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Por que online</p>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight">Do conforto de casa, com a mesma eficácia.</h2>
          </div>
          <div className="space-y-5 text-lg text-foreground/85">
            <p>
              Pesquisas mostram que a terapia online com crianças e adolescentes, especialmente quando baseada na
              Terapia Cognitivo-Comportamental, é <strong>tão eficaz quanto o modelo presencial</strong>.
            </p>
            <p className="text-muted-foreground">
              Sem trânsito, com flexibilidade de horário e a segurança do próprio ambiente. A prática é reconhecida
              pela APA e regulamentada pelo CRP.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4 text-accent" /> Vínculo real</span>
              <span className="inline-flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-accent" /> Jogos, livros e vídeos</span>
              <span className="inline-flex items-center gap-2"><Monitor className="w-4 h-4 text-accent" /> Sem deslocamento</span>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-4 py-20 md:py-28 scroll-mt-16">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Como funciona</p>
        <h2 className="text-3xl md:text-5xl font-bold leading-tight max-w-2xl mb-12">Quatro passos até a primeira sessão</h2>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-3xl bg-card border-2 border-border/60 p-6 hover:-translate-y-1 transition-transform">
              <span className="absolute top-5 right-6 font-display text-4xl font-bold text-muted-foreground/20">{i + 1}</span>
              <s.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-3xl bg-accent/10 border-2 border-accent/30 p-6 md:p-8 grid md:grid-cols-3 gap-6 text-sm">
          <div><strong className="block text-base mb-1">1ª sessão</strong>Somente com os responsáveis, para entender a história da família.</div>
          <div><strong className="block text-base mb-1">3 sessões seguintes</strong>Com a criança ou adolescente, para construir vínculo e avaliar.</div>
          <div><strong className="block text-base mb-1">Orientação parental</strong>Os pais participam do processo — a mudança acontece em casa também.</div>
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="bg-foreground text-background scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-[1fr_1.4fr] gap-12 items-center">
          <div className="relative mx-auto w-64 h-64 md:w-80 md:h-80">
            <div className="absolute inset-0 rounded-full bg-accent/25" />
            <div className="absolute inset-6 rounded-full bg-primary/40 flex items-center justify-center">
              <span className="font-display text-7xl md:text-8xl font-bold text-background">RA</span>
            </div>
            <div className="absolute bottom-2 right-0 bg-accent text-accent-foreground rounded-full px-4 py-2 text-xs font-bold">
              CRP 06/184861
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">Quem cuida</p>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-6">Oi, eu sou a Raquel Andrade.</h2>
            <p className="text-lg opacity-85 mb-4">
              Psicóloga especializada no público infantojuvenil e apaixonada por apoiar famílias nessa jornada tão
              desafiadora que é a criação dos filhos.
            </p>
            <p className="opacity-70 mb-6">
              Formada pela Universidade Municipal de São Caetano do Sul, especialista em TCC com ênfase em famílias,
              com cursos em orientação parental, psicopatologia, análise do comportamento e atendimento online.
            </p>
            <blockquote className="border-l-4 border-accent pl-5 font-display text-xl md:text-2xl leading-snug">
              “Acredito que é possível ajudar seu filho a se desenvolver com autonomia, respeito e felicidade — e que
              essa caminhada pode (e deve) ser feita com apoio.”
            </blockquote>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="familias" className="py-20 md:py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-4 mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">O que as famílias dizem</p>
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">“A cada sessão estamos evoluindo.”</h2>
        </div>
        <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex gap-4 w-max animate-landing-marquee hover:[animation-play-state:paused]">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <figure
                key={i}
                aria-hidden={i >= TESTIMONIALS.length}
                className="w-80 shrink-0 rounded-3xl bg-card border-2 border-border/60 p-6"
              >
                <Quote className="w-6 h-6 text-accent mb-3" />
                <blockquote className="text-foreground/85 leading-relaxed">{t.text}</blockquote>
                <figcaption className="mt-4 text-sm font-bold text-primary">— {t.who}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="max-w-3xl mx-auto px-4 pb-20 md:pb-28 scroll-mt-16">
        <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3 text-center">Dúvidas frequentes</p>
        <h2 className="text-3xl md:text-5xl font-bold leading-tight text-center mb-10">Antes de começar</h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`} className="rounded-2xl bg-card border-2 border-border/60 px-5">
              <AccordionTrigger className="text-left font-bold text-base hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground text-base">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto rounded-[2.5rem] bg-primary text-primary-foreground p-10 md:p-16 text-center relative overflow-hidden">
          <PineMark className="absolute -right-10 -bottom-10 w-56 h-56 opacity-20 rotate-12" />
          <h2 className="text-3xl md:text-5xl font-bold leading-tight max-w-2xl mx-auto">
            Vamos dar o primeiro passo juntos?
          </h2>
          <p className="mt-4 text-lg opacity-90 max-w-xl mx-auto">
            Uma conversa sem compromisso para entender o momento do seu filho e da sua família.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <WhatsButton className="bg-accent text-accent-foreground hover:bg-accent/90">Chamar no WhatsApp</WhatsButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <PineMark className="w-8 h-8" />
              <span className="font-display font-bold text-lg">Instituto Pine</span>
            </div>
            <p className="text-muted-foreground">Raquel Andrade · Psicóloga · CRP 06/184861</p>
          </div>
          <div className="space-y-2">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
              <Phone className="w-4 h-4" /> (11) 94515-7506
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary">
              <Instagram className="w-4 h-4" /> @psiraquelandrade
            </a>
          </div>
          <div className="rounded-2xl bg-destructive/10 p-4 text-xs text-foreground/80 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
            <p>
              Este site não oferece atendimento imediato a pessoas em crise. Em crise, ligue para o <strong>CVV 188</strong>.
              Em emergência, procure o hospital mais próximo ou ligue para o <strong>SAMU 192</strong>.
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground pb-8">© {new Date().getFullYear()} Instituto Pine</p>
      </footer>
    </div>
  );
}
