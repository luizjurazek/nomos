import { TABLE_HEADER_COLORS } from "./table-colors";

export type TableSlug = "entradas" | "debitos" | "vale-alimentacao" | "nubank";

interface TabDef {
  slug: TableSlug;
  label: string;
  shortLabel: string;
  color: string;
}

/** Single source of truth for the 4 table "categories" shown on the overview and the detail/focus screen. */
export const TABLE_TABS: TabDef[] = [
  { slug: "entradas", label: "Entradas", shortLabel: "Entradas", color: TABLE_HEADER_COLORS.entradas },
  { slug: "debitos", label: "Débitos", shortLabel: "Débitos", color: TABLE_HEADER_COLORS.debitos },
  {
    slug: "vale-alimentacao",
    label: "Vale Alimentação",
    shortLabel: "Vale",
    color: TABLE_HEADER_COLORS.valeAlimentacaoConsumo,
  },
  { slug: "nubank", label: "Nubank", shortLabel: "Nubank", color: TABLE_HEADER_COLORS.nubank },
];

export function isTableSlug(value: string): value is TableSlug {
  return TABLE_TABS.some((tab) => tab.slug === value);
}

export function getTab(slug: TableSlug): TabDef {
  const tab = TABLE_TABS.find((t) => t.slug === slug);
  if (!tab) throw new Error(`Unknown table slug "${slug}".`);
  return tab;
}
