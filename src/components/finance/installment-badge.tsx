import { Badge } from "@/components/ui/badge";
import type { Installment } from "@/lib/format/installment";

export function InstallmentBadge({ installment }: { installment: Installment }) {
  return (
    <Badge variant="outline" className="font-normal">
      {installment.current} de {installment.total}
    </Badge>
  );
}
