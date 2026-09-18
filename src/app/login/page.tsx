import Image from "next/image";
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
          {/* The logo asset is white; invert it on the light theme so it stays visible. */}
          <Image src="/logo.png" alt="" width={64} height={64} className="mb-3 size-16 invert dark:invert-0" />
          <h1 className="text-xl font-semibold tracking-tight">Controle financeiro</h1>
          <p className="text-sm text-foreground-secondary">Entre com a senha para continuar.</p>
        </div>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="from" value={from} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" className="h-11" autoFocus required />
          </div>
          {error && <p className="text-sm text-destructive">Senha incorreta. Tente novamente.</p>}
          <Button type="submit" className="h-11 w-full rounded-full text-base">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}
