"use client";

import { Button } from "@/components/ui/button";

export default function AnaliseError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card px-4 py-6">
      <p className="text-sm font-medium">Não foi possível carregar a análise.</p>
      <p className="text-sm text-foreground-secondary">A leitura das planilhas falhou. Tente de novo em instantes.</p>
      <Button variant="outline" onClick={reset}>
        Tentar de novo
      </Button>
    </div>
  );
}
