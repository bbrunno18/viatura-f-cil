import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportPDF(opts: {
  title: string;
  subtitle?: string;
  head: string[];
  rows: (string | number)[][];
  filename: string;
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text("Ministério da Justiça e Segurança Pública", 40, 40);
  doc.setFontSize(11);
  doc.setTextColor(120);
  doc.text("Frota COLOG — Relatório", 40, 56);
  doc.setTextColor(20);
  doc.setFontSize(13);
  doc.text(opts.title, 40, 80);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(opts.subtitle, 40, 96);
  }
  autoTable(doc, {
    head: [opts.head],
    body: opts.rows,
    startY: 110,
    theme: "striped",
    headStyles: { fillColor: [40, 60, 120] },
    styles: { fontSize: 9 },
  });
  doc.save(opts.filename);
}

export function exportXLSX(opts: { sheetName: string; head: string[]; rows: (string | number)[][]; filename: string }) {
  const ws = XLSX.utils.aoa_to_sheet([opts.head, ...opts.rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31));
  XLSX.writeFile(wb, opts.filename);
}
