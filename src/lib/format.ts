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

/** Valida CPF pelos dígitos verificadores (rejeita 111.111.111-11 etc.). */
export function isValidCPF(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Interpreta "AAAA-MM-DD" como data LOCAL (new Date("AAAA-MM-DD") é UTC e mostra o dia anterior no Brasil). */
export function parseDateOnly(v: string | null | undefined): Date | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Formata data sem hora (campo "date") em dd/mm/aaaa, sem deslocar o dia por fuso. */
export function formatDateBR(v: string | null | undefined): string {
  const d = parseDateOnly(v);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

/** Chave AAAA-MM do mês LOCAL (evita virar o mês por causa do UTC). */
export function monthKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Máscara de telefone brasileiro: (11) 91234-5678. */
export function formatPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Saudação conforme a hora local. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
