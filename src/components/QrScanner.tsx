import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  onResult: (text: string) => void;
  onError?: (message: string) => void;
}

/** Leitor de QR Code pela câmera (carregado só no navegador, nunca no SSR). */
export function QrScanner({ onResult, onError }: Props) {
  const regionId = useRef(`qr-reader-${Math.random().toString(36).slice(2)}`).current;
  const [starting, setStarting] = useState(true);
  const done = useRef(false);
  const cbResult = useRef(onResult);
  const cbError = useRef(onError);
  cbResult.current = onResult;
  cbError.current = onError;

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode(regionId);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (done.current) return;
            done.current = true;
            cbResult.current(text);
          },
          () => {},
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        cbError.current?.(
          "Não foi possível acessar a câmera. Permita o uso da câmera no navegador e tente novamente.",
        );
        console.error(err);
      }
    })();

    return () => {
      cancelled = true;
      const s = scanner;
      if (s) {
        Promise.resolve(s.isScanning ? s.stop() : undefined)
          .catch(() => {})
          .finally(() => {
            try {
              s.clear();
            } catch {
              /* noop */
            }
          });
      }
    };
  }, [regionId]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black min-h-[280px]">
      <div id={regionId} className="w-full" />
      {starting && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
