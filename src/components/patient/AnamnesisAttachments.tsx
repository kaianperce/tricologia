import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, FileText, Image as ImageIcon, Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";

export type AnamnesisAttachment = {
  path: string;
  name: string;
  mime: string;
  size: number;
  uploaded_at: string;
};

const BUCKET = "anamnesis-attachments";

export function AnamnesisAttachments({
  clinicId,
  patientId,
  attachments,
  onChange,
}: {
  clinicId: string;
  patientId: string;
  attachments: AnamnesisAttachment[];
  onChange: (next: AnamnesisAttachment[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const out: Record<string, string> = {};
      for (const a of attachments) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(a.path, 3600);
        if (data?.signedUrl) out[a.path] = data.signedUrl;
      }
      setUrls(out);
    })();
  }, [attachments]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const added: AnamnesisAttachment[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const safe = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${clinicId}/${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || `application/${ext}`,
        });
        if (error) { toast.error(`${file.name}: ${error.message}`); continue; }
        added.push({
          path, name: file.name, mime: file.type || "application/octet-stream",
          size: file.size, uploaded_at: new Date().toISOString(),
        });
      }
      if (added.length) onChange([...attachments, ...added]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(a: AnamnesisAttachment) {
    if (!confirm(`Remover "${a.name}"?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([a.path]);
    if (error) return toast.error(error.message);
    onChange(attachments.filter((x) => x.path !== a.path));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4 text-primary" /> Anexos (exames, receitas, fotos)</div>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
          Anexar arquivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {attachments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          Nenhum anexo. Envie PDFs de exames, fotos antigas ou receitas.
        </div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => {
            const isImg = a.mime.startsWith("image/");
            return (
              <li key={a.path} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {isImg ? <ImageIcon className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {(a.size / 1024).toFixed(0)} KB · {new Date(a.uploaded_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {urls[a.path] && (
                    <Button asChild size="icon" variant="ghost">
                      <a href={urls[a.path]} target="_blank" rel="noreferrer" download={a.name}><Download className="h-4 w-4" /></a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
