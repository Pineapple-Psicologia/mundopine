import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { setSessionPolicy, type SessionDuration } from "@/lib/session-policy";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Mundo Pine" },
      { name: "description", content: "Acesso para psicólogas e psicólogos." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(1, "Informe a senha").max(72),
});

function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [showSignInPwd, setShowSignInPwd] = useState(false);
  const [showSignUpPwd, setShowSignUpPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [duration, setDuration] = useState<SessionDuration>("7d");

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await signIn(parsed.data.email, parsed.data.password);
    setBusy(false);
    if (error) {
      toast.error(error);
    } else {
      setSessionPolicy(remember ? duration : "session");
      navigate({ to: "/" });
    }
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: fd.get("fullName"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setBusy(true);
    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
    setBusy(false);
    if (error) toast.error(error);
    else toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Mundo Pine</h1>
          <p className="text-sm text-muted-foreground mt-1">Acesso para psicólogas e psicólogos</p>
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={onSignIn} method="post" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-password">Senha</Label>
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground underline">
                    Esqueci minha senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="si-password"
                    name="password"
                    type={showSignInPwd ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPwd((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showSignInPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showSignInPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer">
                    Lembrar de mim
                  </Label>
                </div>
                <Select
                  value={remember ? duration : "session"}
                  onValueChange={(v) => {
                    if (v === "session") setRemember(false);
                    else {
                      setRemember(true);
                      setDuration(v as SessionDuration);
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs w-auto ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="session">Apenas esta sessão</SelectItem>
                    <SelectItem value="1d">1 dia</SelectItem>
                    <SelectItem value="7d">7 dias</SelectItem>
                    <SelectItem value="30d">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>Entrar</Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={onSignUp} method="post" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="su-name">Nome completo</Label>
                <Input id="su-name" name="fullName" type="text" autoComplete="name" required />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" name="email" type="email" autoComplete="email" required />
              </div>
              <div>
                <Label htmlFor="su-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="su-password"
                    name="password"
                    type={showSignUpPwd ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPwd((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showSignUpPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showSignUpPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres.</p>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>Criar conta</Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="underline">Voltar ao início</Link>
        </p>
      </Card>
    </main>
  );
}
