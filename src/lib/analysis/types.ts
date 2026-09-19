/** Lean, JSON-serializable view of a month tab: only what the analysis page needs. */
export interface AnalysisRow {
  /** "dd/MM/yyyy" or the "xx/MM/yyyy" placeholder. */
  date: string;
  name: string;
  categoria: string;
  valor: number;
}

/** "3/20" marker read from the name; the plan keeps repeating in the months that have no tab yet. */
export interface RowInstallment {
  current: number;
  total: number;
}

export interface AnalysisEntrada extends AnalysisRow {
  installment: RowInstallment | null;
  /** Withdrawal from the emergency reserve: money moving between pockets, not income. */
  isTransfer: boolean;
}

export interface AnalysisDebito extends AnalysisRow {
  installment: RowInstallment | null;
  /** Savings/investment: money moving between pockets, not a real expense. */
  isTransfer: boolean;
  /** The auto-synced "Cartão de crédito" line (previous month's Nubank total). */
  isCardRollover: boolean;
}

export interface AnalysisNubank extends AnalysisRow {
  installment: RowInstallment | null;
}

export interface AnalysisMonth {
  year: string;
  /** Tab title, e.g. "Setembro". */
  month: string;
  entradas: AnalysisEntrada[];
  debitos: AnalysisDebito[];
  nubank: AnalysisNubank[];
}
