import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from = "/", error } = await searchParams;

  return (
    <div className="flex h-dvh items-center justify-center bg-background px-4">
      <div className="glass-surface w-full max-w-sm rounded-3xl border border-border p-8">
        <div className="mb-6 flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Controle financeiro</h1>
          <p className="text-sm text-foreground-secondary">Entre com a senha para continuar.</p>
        </div>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="from" value={from} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" autoFocus required />
          </div>
          {error && <p className="text-sm text-destructive">Senha incorreta. Tente novamente.</p>}
          <Button type="submit" className="w-full rounded-full">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
