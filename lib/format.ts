export function formatMoney(value: unknown, currency = "PLN") {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency }).format(amount);
}

export function periodLabel(period: string, custom?: string | null) {
  if (custom) return custom;
  return ({ ONE_TIME: "jednorazowo", MONTH: "/ mies.", YEAR: "/ rok", CUSTOM: "" } as Record<string, string>)[period] ?? "";
}

export function polishDate(date: Date) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}
