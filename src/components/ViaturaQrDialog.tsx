import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildViaturaQrUrl } from "@/lib/qr";

interface V {
  id: string;
  modelo: string;
  cor: string;
  placa: string | null;
}

async function renderLabel(v: V): Promise<string> {
  const qr = await QRCode.toDataURL(buildViaturaQrUrl(v.id), {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 640,
  });
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Falha ao gerar QR"));
    img.src = qr;
  });
  const c = document.createElement("canvas");
  c.width = 760;
  c.height = 900;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 60, 60, 640, 640);
  ctx.fillStyle = "#0a0a23";
  ctx.textAlign = "center";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText(v.placa ?? "SEM PLACA", c.width / 2, 770);
  ctx.font = "30px sans-serif";
  ctx.fillText(`${v.modelo} · ${v.cor}`.slice(0, 48), c.width / 2, 820);
  ctx.font = "24px sans-serif";
  ctx.fillStyle = "#555";
  ctx.fillText("Easy Patrol · escaneie pelo aplicativo para usar a viatura", c.width / 2, 865);
  return c.toDataURL("image/png");
}

export function ViaturaQrDialog({
  viatura,
  open,
  onOpenChange,
}: {
  viatura: V | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !viatura) return;
    let alive = true;
    setSrc(null);
    renderLabel(viatura).then((s) => alive && setSrc(s)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, viatura]);

  function download() {
    if (!src || !viatura) return;
    const a = document.createElement("a");
    a.href = src;
    a.download = `qrcode-${(viatura.placa ?? viatura.id).replace(/[^A-Za-z0-9-]/g, "")}.png`;
    a.click();
  }

  function print() {
    if (!src) return;
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    w.document.write(
      `<html><head><title>QR Code</title><style>@page{margin:10mm}body{margin:0;text-align:center}img{width:100%;max-width:170mm}</style></head><body><img src="${src}" onload="window.focus();window.print()"/></body></html>`,
    );
    w.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" /> QR Code da viatura
          </DialogTitle>
          <DialogDescription>
            Imprima e cole na viatura. Para retirar o veículo, o condutor escaneia este código pelo
            aplicativo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {src ? (
            <img src={src} alt={`QR Code ${viatura?.placa ?? ""}`} className="w-64 rounded-lg border bg-white" />
          ) : (
            <div className="h-64 w-64 animate-pulse rounded-lg bg-muted" />
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={download} disabled={!src}>
            <Download className="h-4 w-4 mr-1.5" /> Baixar PNG
          </Button>
          <Button className="flex-1 bg-gradient-primary" onClick={print} disabled={!src}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
