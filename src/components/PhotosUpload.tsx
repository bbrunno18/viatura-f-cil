import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  values: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  label?: string;
  max?: number;
  bucket?: string;
}

export function PhotosUpload({ values, onChange, folder, label = "Fotos", max = 6, bucket = "utilizacoes" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList) {
    const slots = max - values.length;
    if (slots <= 0) return toast.error(`Máximo de ${max} fotos`);
    const list = Array.from(files).slice(0, slots);
    setBusy(true);
    const uploaded: string[] = [];
    for (const file of list) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`${file.name}: máximo 8MB`);
        continue;
      }
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(error.message);
        continue;
      }
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
      uploaded.push(signed?.signedUrl ?? path);
    }
    setBusy(false);
    onChange([...values, ...uploaded]);
  }

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-xs text-muted-foreground">({values.length}/{max})</span></Label>
      <div className="grid grid-cols-3 gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative aspect-square">
            <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-md border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {values.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="aspect-square flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-border bg-card hover:bg-secondary/50 text-xs text-muted-foreground"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <ImagePlus className="h-5 w-5 text-primary" />}
            Adicionar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
