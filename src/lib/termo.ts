import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import type { ChecklistItem } from "@/components/ChecklistForm";

export interface TermoData {
  utilizacaoId: string;
  viatura: { modelo: string; cor: string; placa?: string | null };
  condutor: { nome: string; cpf: string; cnh_numero?: string | null };
  dataSaida: string;
  kmInicial: number;
  localSaida: string;
  checklist: ChecklistItem[];
  assinaturaDataUrl: string;
}

export async function gerarEArmazenarTermo(t: TermoData): Promise<string> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("MINISTÉRIO DA JUSTIÇA E SEGURANÇA PÚBLICA", W / 2, y, { align: "center" });
  y += 18;
  doc.setFontSize(12);
  doc.text("TERMO DE RESPONSABILIDADE — USO DE VIATURA OFICIAL", W / 2, y, { align: "center" });
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const block = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 50, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 170, y);
    y += 16;
  };

  block("Viatura", `${t.viatura.modelo} — ${t.viatura.cor}${t.viatura.placa ? ` (${t.viatura.placa})` : ""}`);
  block("Condutor", t.condutor.nome);
  block("CPF", t.condutor.cpf);
  if (t.condutor.cnh_numero) block("CNH", t.condutor.cnh_numero);
  block("Data/hora de saída", new Date(t.dataSaida).toLocaleString("pt-BR"));
  block("Local de saída", t.localSaida);
  block("KM inicial", t.kmInicial.toLocaleString("pt-BR"));

  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("DECLARAÇÃO", 50, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  const texto =
    "Declaro, para os devidos fins, que recebi a viatura acima identificada em condições adequadas de uso, " +
    "conforme checklist abaixo, comprometendo-me a conduzi-la com zelo, obedecendo às leis de trânsito, " +
    "utilizando-a exclusivamente em serviço, e a devolvê-la nas mesmas condições. Responsabilizo-me por multas, " +
    "danos e ocorrências decorrentes de conduta dolosa, culposa ou em desacordo com a legislação vigente.";
  const lines = doc.splitTextToSize(texto, W - 100);
  doc.text(lines, 50, y);
  y += lines.length * 12 + 10;

  doc.setFont("helvetica", "bold");
  doc.text("CHECKLIST", 50, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const it of t.checklist) {
    if (y > 720) {
      doc.addPage();
      y = 50;
    }
    const status = it.status === "ok" ? "[ OK ]" : it.status === "atencao" ? "[ ATENÇÃO ]" : "[ AVARIADO ]";
    doc.text(`${status}  ${it.label}${it.obs ? ` — ${it.obs}` : ""}`, 50, y);
    y += 13;
  }

  y += 20;
  if (y > 680) {
    doc.addPage();
    y = 50;
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Assinatura do condutor:", 50, y);
  y += 8;
  try {
    doc.addImage(t.assinaturaDataUrl, "PNG", 50, y, 200, 70);
  } catch {
    // ignore
  }
  y += 80;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`${t.condutor.nome} — CPF ${t.condutor.cpf}`, 50, y);
  y += 12;
  doc.text(`Documento gerado em ${new Date().toLocaleString("pt-BR")}`, 50, y);

  const blob = doc.output("blob");
  const path = `${t.utilizacaoId}/termo-saida.pdf`;
  const { error } = await supabase.storage
    .from("utilizacoes")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from("utilizacoes").createSignedUrl(path, 60 * 60 * 24 * 365);
  return signed?.signedUrl ?? path;
}
