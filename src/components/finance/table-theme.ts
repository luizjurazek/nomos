import { CreditCard, Receipt, TrendingUp, Utensils, type LucideIcon } from "lucide-react";
import type { TableId } from "@/lib/sheets/types";
import { TABLE_HEADER_COLORS } from "./table-colors";

interface TableTheme {
  title: string;
  color: string;
  Icon: LucideIcon;
}

/** Identity of each table (name, color, icon) shared by the "add" menu and the entry form header. */
export const TABLE_THEME: Record<TableId, TableTheme> = {
  entradas: { title: "Entradas", color: TABLE_HEADER_COLORS.entradas, Icon: TrendingUp },
  debitos: { title: "Débitos", color: TABLE_HEADER_COLORS.debitos, Icon: Receipt },
  valeAlimentacaoCredito: {
    title: "Vale alimentação · Entrada",
    color: TABLE_HEADER_COLORS.valeAlimentacaoCredito,
    Icon: Utensils,
  },
  valeAlimentacaoConsumo: {
    title: "Vale alimentação · Saída",
    color: TABLE_HEADER_COLORS.valeAlimentacaoConsumo,
    Icon: Utensils,
  },
  nubank: { title: "Nubank", color: TABLE_HEADER_COLORS.nubank, Icon: CreditCard },
};
