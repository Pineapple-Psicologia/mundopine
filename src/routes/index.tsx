import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Heart, Users, Lock, LogOut, Shield } from "lucide-react";
import { GAMES, type GameId } from "@/lib/games";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mundo Pine — Ferramentas terapêuticas online" },
      {
        name: "description",
        content:
          "Estante de jogos terapêuticos colaborativos para psicólogas infantojuvenis usarem em sessões online.",
      },
      { property: "og:title", content: "Mundo Pine — Jogos terapêuticos online" },
      { property: "og:description", content: "Jogos terapêuticos colaborativos para psicólogas, crianças e adolescentes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function genCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function Home() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const openGame = (game: GameId) => {
    if (!user) {
      toast.error("Faça login para abrir um jogo.");
      navigate({ to: "/auth" });
      return;
    }
    navigate({
      to: "/sala/$code",
      params: { code: genCode() },
      search: { role: "psi", game },
    });
  };


  return (
    <main className="min-h-screen px-4 py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-end gap-2 mb-6">
          {isAdmin && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin"><Shield className="w-4 h-4 mr-1" /> Admin</Link>
            </Button>
          )}
          {loading ? null : user ? (
            <>

              <span className="text-sm text-muted-foreground self-center">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-1" /> Sair
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Área da psicóloga</Link>
            </Button>
          )}
        </div>
        <header className="mb-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent-foreground text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Estante de jogos terapêuticos
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.05] text-foreground">
            Brincar é <span className="text-primary">Linguagem Clínica.</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto md:mx-0">
            Plataforma exclusiva para psicólogas. Pacientes acessam apenas pelo
            link enviado pela psicóloga — não precisam de cadastro.
          </p>
        </header>

        {!user && !loading ? (
          <section className="max-w-md mx-auto">
            <Card className="p-8 border-2 border-border/60 bg-card/95 backdrop-blur text-center">
              <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="text-lg font-bold mb-2">Área restrita</h2>
              <p className="text-sm text-muted-foreground mb-5">
                O acesso aos jogos é exclusivo para psicólogas cadastradas.
                Entre ou crie sua conta para continuar.
              </p>
              <Button asChild size="lg" className="w-full">
                <Link to="/auth">Entrar / Cadastrar</Link>
              </Button>
            </Card>

            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4 text-accent" /> Vínculo</span>
              <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Ao vivo</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> Sem download</span>
            </div>
          </section>
        ) : user ? (
          <>
            <section className="mb-12">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Escolher recurso
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAMES.map((g) => (
                  <Card
                    key={g.id}
                    className={`p-5 flex flex-col gap-3 border-2 transition-all ${
                      g.available
                        ? "hover:border-primary hover:shadow-xl cursor-pointer hover:-translate-y-0.5"
                        : "opacity-60"
                    }`}
                    onClick={() => g.available && openGame(g.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-4xl">{g.emoji}</div>
                      {!g.available && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> em breve
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold leading-tight">{g.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {g.approach}
                        </span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent-foreground px-2 py-0.5 rounded-full">
                          {g.ageRange}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">
                      {g.description}
                    </p>
                    {g.available && (
                      <Button
                        size="sm"
                        className="w-full mt-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openGame(g.id);
                        }}
                      >
                        Abrir jogo
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2"><Heart className="w-4 h-4 text-accent" /> Vínculo</span>
              <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Ao vivo</span>
              <span className="inline-flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent" /> Sem download</span>
            </div>
          </>
        ) : null}


        <footer className="mt-16 pt-6 border-t border-border/60 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/termos" className="hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <span aria-hidden>·</span>
            <Link to="/privacidade" className="hover:text-foreground transition-colors">
              Política de Privacidade
            </Link>
          </div>
          <p className="mt-3">© {new Date().getFullYear()} Mundo Pine</p>
        </footer>
      </div>
    </main>
  );
}
