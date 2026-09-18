import { Badge } from "@/components/ui/badge";
import type { SemanticTag } from "@/lib/sheets/types";

const LABELS: Record<SemanticTag, string> = {
  poupanca: "Poupança",
  transferenciaReserva: "Reserva",
};

const STYLES: Record<SemanticTag, string> = {
  poupanca: "bg-success/12 text-success",
  transferenciaReserva: "bg-warning/12 text-warning",
};

export function TagBadge({ tag }: { tag: SemanticTag }) {
  return <Badge className={`border-0 font-normal ${STYLES[tag]}`}>{LABELS[tag]}</Badge>;
}
