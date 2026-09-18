"use client";

import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { refreshAnalysis } from "@/app/(app)/analise/actions";
import { Button } from "@/components/ui/button";

/** Drops the page's cached spreadsheet read (which can lag up to a minute behind edits) and reloads it. */
export function RefreshButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await refreshAnalysis();
          } catch {
            toast.error("Não foi possível atualizar.");
          }
        })
      }
    >
      <RefreshCw className={`size-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Atualizando" : "Atualizar"}
    </Button>
  );
}
