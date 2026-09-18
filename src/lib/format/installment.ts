/**
 * Matches an installment marker anywhere in a purchase name: suffix forms like "...7/8" or
 * "...(3/3)", and prefix forms like "49/58 Carro". Only the first match is used.
 */
const INSTALLMENT_PATTERN = /\(?\b(\d{1,3})\s*\/\s*(\d{1,3})\b\)?/;

export interface Installment {
  current: number;
  total: number;
}

export function parseInstallment(name: string): Installment | null {
  const match = INSTALLMENT_PATTERN.exec(name);
  if (!match) return null;
  const current = Number(match[1]);
  const total = Number(match[2]);
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0 || current > total) return null;
  return { current, total };
}
