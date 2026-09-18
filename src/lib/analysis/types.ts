/** Lean, JSON-serializable view of a month tab: only what the analysis page needs. */
export interface AnalysisRow {
  /** "dd/MM/yyyy" or the "xx/MM/yyyy" placeholder. */
  date: string;
  name: string;
  categoria: string;
  valor: number;
}

export interface AnalysisEntrada extends AnalysisRow {
  /** Withdrawal from the emergency reserve: money moving between pockets, not income. */
  isTransfer: boolean;
}

export interface AnalysisDebito extends AnalysisRow {
  /** Savings/investment: money moving between pockets, not a real expense. */
  isTransfer: boolean;
  /** The auto-synced "Cartão de crédito" line (previous month's Nubank total). */
  isCardRollover: boolean;
}

export interface AnalysisNubank extends AnalysisRow {
  installment: { current: number; total: number } | null;
}

export interface AnalysisMonth {
  year: string;
  /** Tab title, e.g. "Setembro". */
  month: string;
  entradas: AnalysisEntrada[];
  debitos: AnalysisDebito[];
  nubank: AnalysisNubank[];
}
