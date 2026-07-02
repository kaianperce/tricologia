import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SCALP_REGION_LABELS } from "@/lib/trichocare";
import { Plus, Trash2, Upload, Loader2, ChevronLeft, ChevronRight, X, Download, Camera, ImageOff } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "patient-photos";
const REGION_KEYS = Object.keys(SCALP_REGION_LABELS);

type PhotoRow = {
  id: string;
  patient_id: string;
  clinic_id: string;
  region: string;
  url: string;
  storage_path?: string | null;
  tags: string[] | null;
  notes: string | null;
  visible_to_client: boolean;
  captured_at: string;
};

function isStoragePath(url: string) {
  return !!url && !url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("data:");
}

export function PhotosSection({ patient }: { patient: any }) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [defaultRegion, setDefaultRegion] = useState<string>("vertex");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ list: PhotoRow[]; index: number } | null>(null);
  const [compareRegion, setCompareRegion] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("photo_records")
      .select("*")
      .eq("patient_id", patient.id)
      .order("captured_at", { ascending: false });
    const list = (data ?? []) as PhotoRow[];
    setPhotos(list);
    // resolve signed URLs for storage-backed photos
    const map: Record<string, string> = {};
    const toSign = list.filter((p) => isStoragePath(p.url));
    if (toSign.length) {
      const { data: signedRes } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(toSign.map((p) => p.url), 3600);
      signedRes?.forEach((s, i) => { if (s.signedUrl) map[toSign[i].url] = s.signedUrl; });
    }
    setSigned(map);
    setLoading(false);
  }, [patient.id]);

  useEffect(() => { load(); }, [load]);

  const resolveUrl = (p: PhotoRow) => (isStoragePath(p.url) ? signed[p.url] : p.url);

  const byRegion = useMemo(() => {
    const m: Record<string, PhotoRow[]> = {};
    for (const r of REGION_KEYS) m[r] = [];
    for (const p of photos) {
      if (!m[p.region]) m[p.region] = [];
      m[p.region].push(p);
    }
    return m;
  }, [photos]);

  // ordenar: regiões com fotos primeiro
  const orderedRegions = useMemo(() => {
    return [...REGION_KEYS].sort((a, b) => (byRegion[b]?.length ?? 0) - (byRegion[a]?.length ?? 0));
  }, [byRegion]);

  async function toggleVisible(p: PhotoRow) {
    await supabase.from("photo_records").update({ visible_to_client: !p.visible_to_client } as any).eq("id", p.id);
    load();
  }

  async function remove(p: PhotoRow) {
    if (!confirm("Remover esta foto?")) return;
    if (isStoragePath(p.url)) {
      await supabase.storage.from(BUCKET).remove([p.url]);
    }
    await supabase.from("photo_records").delete().eq("id", p.id);
    if (lightbox) setLightbox(null);
    load();
  }

  function openUploader(region: string) {
    setDefaultRegion(region);
    setUploadOpen(true);
  }

  function openLightbox(list: PhotoRow[], index: number) {
    setLightbox({ list, index });
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 card-premium">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="font-display text-lg">Evolução fotográfica</h3>
            <p className="text-xs text-muted-foreground">
              Faça upload organizando por região do couro cabeludo. Clique numa foto para ampliar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={compareRegion ?? "__none"} onValueChange={(v) => setCompareRegion(v === "__none" ? null : v)}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Comparar região…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem comparação</SelectItem>
                {orderedRegions.filter((r) => byRegion[r].length >= 2).map((r) => (
                  <SelectItem key={r} value={r}>{SCALP_REGION_LABELS[r]} ({byRegion[r].length})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openUploader("vertex")}>
              <Plus className="mr-2 h-4 w-4" />Adicionar foto
            </Button>
          </div>
        </CardContent>
      </Card>

      {compareRegion && byRegion[compareRegion]?.length >= 2 && (
        <CompareDialog
          photos={byRegion[compareRegion]}
          regionLabel={SCALP_REGION_LABELS[compareRegion]}
          resolveUrl={resolveUrl}
          onClose={() => setCompareRegion(null)}
        />
      )}

      {loading ? (
        <Card className="border-0 card-premium"><CardContent className="p-10 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" /> Carregando fotos…
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {orderedRegions.map((region) => {
            const list = byRegion[region];
            const isOpen = expanded === region;
            return (
              <Card key={region} className="border-0 card-premium">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpanded(isOpen ? null : region)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {list[0] ? (
                          <img src={resolveUrl(list[0])} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{SCALP_REGION_LABELS[region]}</div>
                        <div className="text-xs text-muted-foreground">
                          {list.length === 0 ? "Nenhuma foto" : `${list.length} foto${list.length > 1 ? "s" : ""}`}
                          {list[0] && ` · última em ${new Date(list[0].captured_at).toLocaleDateString("pt-BR")}`}
                        </div>
                      </div>
                    </button>
                    <Button size="sm" variant="outline" onClick={() => openUploader(region)}>
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {list.length === 0 && (
                        <div className="col-span-full rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                          Nenhuma foto desta região ainda.
                        </div>
                      )}
                      {list.map((p, idx) => (
                        <div key={p.id} className="group relative">
                          <button
                            onClick={() => openLightbox(list, idx)}
                            className="block w-full overflow-hidden rounded-lg bg-muted"
                          >
                            <img
                              src={resolveUrl(p)}
                              alt=""
                              className="aspect-square w-full object-cover transition group-hover:scale-105"
                              loading="lazy"
                            />
                          </button>
                          <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{new Date(p.captured_at).toLocaleDateString("pt-BR")}</span>
                            <button onClick={() => remove(p)} className="opacity-0 transition group-hover:opacity-100">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <label className="mt-1 flex items-center justify-between text-[10px]">
                            <span>Liberar ao cliente</span>
                            <Switch checked={!!p.visible_to_client} onCheckedChange={() => toggleVisible(p)} />
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <UploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        clinicId={patient.clinic_id}
        patientId={patient.id}
        defaultRegion={defaultRegion}
        onUploaded={() => { setUploadOpen(false); load(); }}
      />

      {lightbox && (
        <Lightbox
          list={lightbox.list}
          index={lightbox.index}
          resolveUrl={resolveUrl}
          onIndex={(i) => setLightbox({ ...lightbox, index: i })}
          onClose={() => setLightbox(null)}
          onDelete={remove}
        />
      )}
    </div>
  );
}

/* ---------- Upload Dialog ---------- */

function UploadDialog({
  open, onOpenChange, clinicId, patientId, defaultRegion, onUploaded,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clinicId: string;
  patientId: string;
  defaultRegion: string;
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [region, setRegion] = useState(defaultRegion);
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  useEffect(() => { if (open) { setRegion(defaultRegion); setTags(""); setNotes(""); } }, [open, defaultRegion]);

  async function uploadFiles(files: FileList | File[] | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) { toast.error("Selecione arquivos de imagem"); return; }
    const tooBig = arr.find((f) => f.size > 10 * 1024 * 1024);
    if (tooBig) { toast.error(`"${tooBig.name}" excede 10MB`); return; }

    setUploading(true);
    setProgress({ done: 0, total: arr.length });
    const tagArr = tags.split(",").map((s) => s.trim()).filter(Boolean);
    let okCount = 0;

    for (const file of arr) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${clinicId}/${patientId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || `image/${ext}`,
      });
      if (upErr) { toast.error(`${file.name}: ${upErr.message}`); setProgress((p) => ({ ...p, done: p.done + 1 })); continue; }

      const { error: insErr } = await supabase.from("photo_records").insert({
        patient_id: patientId,
        clinic_id: clinicId,
        region: region as any,
        url: path,
        tags: tagArr,
        notes: notes || null,
      } as any);
      if (insErr) { toast.error(`${file.name}: ${insErr.message}`); }
      else okCount++;
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setUploading(false);
    if (okCount > 0) toast.success(`${okCount} foto${okCount > 1 ? "s" : ""} enviada${okCount > 1 ? "s" : ""}`);
    if (okCount > 0) onUploaded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-display">Adicionar fotos</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Região do couro cabeludo</Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCALP_REGION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files); }}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm">Arraste fotos aqui ou</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Escolher arquivos
              </Button>
              <Button size="sm" variant="outline" onClick={() => cameraRef.current?.click()} disabled={uploading}>
                <Camera className="mr-2 h-4 w-4" /> Câmera
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">JPG, PNG, WebP, HEIC · até 10MB cada</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => uploadFiles(e.target.files)}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => uploadFiles(e.target.files)}
            />
            {uploading && (
              <div className="mt-3 text-xs text-muted-foreground">
                Enviando {progress.done} de {progress.total}…
              </div>
            )}
          </div>

          <div>
            <Label>Tags (separadas por vírgula)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Inicial, Pós 3 meses" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={uploading}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Lightbox ---------- */

function Lightbox({
  list, index, resolveUrl, onIndex, onClose, onDelete,
}: {
  list: PhotoRow[];
  index: number;
  resolveUrl: (p: PhotoRow) => string | undefined;
  onIndex: (i: number) => void;
  onClose: () => void;
  onDelete: (p: PhotoRow) => void;
}) {
  const p = list[index];
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < list.length - 1) onIndex(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, list.length, onIndex, onClose]);

  if (!p) return null;
  const url = resolveUrl(p);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm">
          <div className="font-medium">{SCALP_REGION_LABELS[p.region]}</div>
          <div className="text-xs opacity-70">{new Date(p.captured_at).toLocaleString("pt-BR")} · {index + 1}/{list.length}</div>
        </div>
        <div className="flex gap-2">
          {url && (
            <a href={url} target="_blank" rel="noreferrer" download className="rounded-md bg-white/10 p-2 hover:bg-white/20">
              <Download className="h-4 w-4" />
            </a>
          )}
          <button onClick={() => onDelete(p)} className="rounded-md bg-white/10 p-2 hover:bg-red-500/40">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="rounded-md bg-white/10 p-2 hover:bg-white/20">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {index > 0 && (
          <button onClick={() => onIndex(index - 1)} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {url ? (
          <img src={url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        )}
        {index < list.length - 1 && (
          <button onClick={() => onIndex(index + 1)} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      {(p.tags?.length || p.notes) && (
        <div className="px-4 py-3 text-xs text-white/80" onClick={(e) => e.stopPropagation()}>
          {p.tags?.length ? <div className="mb-1">{p.tags.map((t) => <span key={t} className="mr-1 rounded-full bg-white/10 px-2 py-0.5">{t}</span>)}</div> : null}
          {p.notes && <div className="max-w-2xl">{p.notes}</div>}
        </div>
      )}
    </div>
  );
}

/* ---------- Compare ---------- */

function CompareDialog({
  photos, regionLabel, resolveUrl, onClose,
}: {
  photos: PhotoRow[];
  regionLabel: string;
  resolveUrl: (p: PhotoRow) => string | undefined;
  onClose: () => void;
}) {
  const [leftId, setLeftId] = useState<string>(photos[photos.length - 1].id);
  const [rightId, setRightId] = useState<string>(photos[0].id);
  const left = photos.find((p) => p.id === leftId);
  const right = photos.find((p) => p.id === rightId);

  return (
    <Card className="border-0 card-premium">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-base">Comparativo — {regionLabel}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[{ id: leftId, set: setLeftId, photo: left, label: "Antes" }, { id: rightId, set: setRightId, photo: right, label: "Depois" }].map((side) => (
            <div key={side.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{side.label}</span>
                <Select value={side.id} onValueChange={side.set}>
                  <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {photos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{new Date(p.captured_at).toLocaleDateString("pt-BR")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {side.photo && (
                <img src={resolveUrl(side.photo)} alt="" className="aspect-square w-full rounded-lg object-cover" />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
