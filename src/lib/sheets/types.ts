export type ColumnRole = "date" | "name" | "category" | "quem" | "valor" | "checkbox";

export type TableId =
  | "entradas"
  | "debitos"
  | "valeAlimentacaoCredito"
  | "valeAlimentacaoConsumo"
  | "nubank";

export type SemanticTag = "poupanca" | "transferenciaReserva";

export type Quem = "Luiz" | "Jéssica" | "Luiz e Jéssica";

/** Raw grid cell as returned by the Sheets API: string for FORMATTED_VALUE reads, or the JS-typed value for UNFORMATTED_VALUE reads. */
export type SheetCell = string | number | boolean | null | undefined;

export type SheetGrid = SheetCell[][];

export interface TotalRowLocation {
  label: string;
  row: number; // 0-indexed within the grid
}

export interface TableLocation {
  tableId: TableId;
  startCol: number; // 0-indexed
  endCol: number; // 0-indexed, inclusive
  headerRow: number | null; // 0-indexed, null for tables with no header row of their own (vale credito)
  dataStartRow: number; // 0-indexed, inclusive
  dataEndRow: number; // 0-indexed, inclusive
  totalRows: TotalRowLocation[];
}

export interface RowBase {
  /** 0-indexed row within the sheet grid; used to target updates/deletes. */
  rowIndex: number;
  date: string; // "dd/MM/yyyy" or the "xx/MM/yyyy" placeholder used for "date not yet known"
  name: string;
  valor: number;
}

export interface EntradaRow extends RowBase {
  categoria: string;
  recebido: boolean;
  isReservaWithdrawal: boolean;
}

export interface DebitoRow extends RowBase {
  categoria: string;
  quem: Quem | string;
  pago: boolean;
  isPoupanca: boolean;
  isCardRollover?: boolean;
}

export interface NubankRow extends RowBase {
  categoria: string;
  quem: Quem | string;
  installment: { current: number; total: number } | null;
}

export interface ValeAlimentacaoCreditoRow extends RowBase {
  quem: Quem | string;
  recebido: boolean;
}

export interface ValeAlimentacaoConsumoRow extends RowBase {
  quem: Quem | string;
  pago: boolean;
}

export interface MonthKpis {
  recebido: number;
  aReceber: number;
  pago: number;
  aPagar: number;
  saldoAtual: number;
  saldoFinal: number;
  valeAlimentacaoRecebido: number;
  valeAlimentacaoSaldo: number;
}

export interface MonthData {
  year: string;
  month: string;
  kpis: MonthKpis;
  entradas: EntradaRow[];
  debitos: DebitoRow[];
  valeAlimentacaoCredito: ValeAlimentacaoCreditoRow[];
  valeAlimentacaoConsumo: ValeAlimentacaoConsumoRow[];
  nubank: NubankRow[];
}

export interface Categories {
  entradas: string[];
  saidas: string[];
}
