const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Conteúdo gravado no QR Code da viatura: abre a tela de saída já com a viatura. */
export function buildViaturaQrUrl(viaturaId: string, origin = window.location.origin) {
  return `${origin}/app/saida?viaturaId=${encodeURIComponent(viaturaId)}&qr=1`;
}

/** Extrai o id da viatura do texto lido pelo scanner (URL do app ou UUID puro). */
export function parseViaturaQr(text: string): string | null {
  const raw = text.trim();
  try {
    const id = new URL(raw).searchParams.get("viaturaId");
    if (id && UUID_RE.test(id)) return id.match(UUID_RE)![0].toLowerCase();
  } catch {
    // não é URL: tenta UUID puro
  }
  const m = raw.match(UUID_RE);
  return m ? m[0].toLowerCase() : null;
}
