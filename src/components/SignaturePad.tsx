import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, PenLine } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

export function SignaturePad({ value, onChange, label = "Assine aqui" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#0a0a23";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
    }
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    last.current = getPos(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onChange(dataUrl);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <PenLine className="h-4 w-4 text-primary" /> {label}
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>
          <Eraser className="h-3.5 w-3.5 mr-1" /> Limpar
        </Button>
      </div>
      <div className="rounded-lg border-2 border-dashed border-border bg-card touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="w-full h-44 rounded-lg cursor-crosshair touch-none"
          style={{ touchAction: "none" }}
        />
      </div>
      {empty && <p className="text-xs text-muted-foreground">Use o dedo ou mouse para assinar dentro da caixa.</p>}
    </div>
  );
}
