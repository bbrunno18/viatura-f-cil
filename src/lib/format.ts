export function formatCPF(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

export function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function weekday(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "long" });
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Data e hora LOCAIS no formato do <input type="datetime-local"> (AAAA-MM-DDTHH:mm).
 *  Evita o erro de usar toISOString(), que devolve UTC (3 h à frente no horário de Brasília). */
export function nowLocalInput(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Data LOCAL no formato do <input type="date"> (AAAA-MM-DD). */
export function todayLocal(d: Date = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Converte texto de KM em inteiro >= 0, ou null se vazio/inválido. */
export function parseKm(v: string): number | null {
  const t = v.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}

/** Converte "12,5" ou "12.5" em número > 0, ou null se vazio/inválido. */
export function parsePositiveDecimal(v: string): number | null {
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
