import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label?: string;
  required?: boolean;
  bucket?: string;
}

export function PhotoUpload({ value, onChange, folder, label = "Foto", required, bucket = "utilizacoes" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem deve ter no máximo 8MB");
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    setBusy(false);
    onChange(signed?.signedUrl ?? path);
  }

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {value ? (
        <div className="relative w-full">
          <img src={value} alt={label} className="w-full max-h-56 object-cover rounded-lg border" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange(null)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full flex flex-col items-center justify-center gap-2 py-7 rounded-lg border-2 border-dashed border-border bg-card hover:bg-secondary/50 transition-colors text-sm text-muted-foreground"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Camera className="h-5 w-5 text-primary" />}
          {busy ? "Enviando…" : "Tirar foto / escolher imagem"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
