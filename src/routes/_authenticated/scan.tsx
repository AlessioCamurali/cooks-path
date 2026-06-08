import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scanInventory, listMyScans } from "@/lib/api/scan.functions";
import { QuestPanel } from "@/components/quest-panel";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Refrigerator, Utensils } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scan")({
  head: () => ({ meta: [{ title: "Scan · Cook's Path" }, { name: "description", content: "Photograph your fridge or cutlery. The system identifies everything." }] }),
  component: Scan,
});

function Scan() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanType, setScanType] = useState<"ingredients" | "tools">("ingredients");
  const [busy, setBusy] = useState(false);
  const [lastItems, setLastItems] = useState<Array<{ name: string; confidence?: number }> | null>(null);
  const scanFn = useServerFn(scanInventory);
  const listFn = useServerFn(listMyScans);
  const qc = useQueryClient();

  const recent = useQuery({ queryKey: ["scans"], queryFn: () => listFn() });

  async function onFile(file: File) {
    if (file.size > 6 * 1024 * 1024) { toast.error("Image too large (max 6MB)"); return; }
    setBusy(true); setLastItems(null);
    try {
      const b64 = await fileToBase64(file);
      const res = await scanFn({ data: { scan_type: scanType, image_base64: b64, mime_type: file.type } });
      setLastItems(res.items);
      toast.success(`Detected ${res.items.length} ${scanType === "ingredients" ? "ingredients" : "tools"}`);
      qc.invalidateQueries({ queryKey: ["scans"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Scan failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Cook's Eye</div>
        <h1 className="font-serif text-3xl gold-text">Scan your kitchen</h1>
        <p className="text-muted-foreground text-sm">The system identifies ingredients and tools from a single photo.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setScanType("ingredients")} className={`quest-panel p-4 text-left ${scanType === "ingredients" ? "gold-glow" : ""}`}>
          <Refrigerator className="text-[var(--gold)] mb-2" size={20} />
          <div className="font-serif gold-text">Fridge / pantry</div>
          <div className="text-xs text-muted-foreground">Detect ingredients</div>
        </button>
        <button onClick={() => setScanType("tools")} className={`quest-panel p-4 text-left ${scanType === "tools" ? "gold-glow" : ""}`}>
          <Utensils className="text-[var(--gold)] mb-2" size={20} />
          <div className="font-serif gold-text">Cutlery / tools</div>
          <div className="text-xs text-muted-foreground">Detect equipment</div>
        </button>
      </div>

      <QuestPanel eyebrow="Action" title={scanType === "ingredients" ? "Photograph the fridge or cupboard" : "Photograph your knives & tools"}>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        <Button onClick={() => fileRef.current?.click()} disabled={busy} size="lg" className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <><Camera className="mr-1" /> Open camera</>}
        </Button>
        {lastItems && (
          <div className="mt-5 space-y-2">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Detected</div>
            <div className="flex flex-wrap gap-1.5">
              {lastItems.map((i, idx) => (
                <span key={idx} className="text-xs px-2 py-1 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/5">
                  {i.name}{typeof i.confidence === "number" && <span className="text-muted-foreground"> · {Math.round(i.confidence * 100)}%</span>}
                </span>
              ))}
              {lastItems.length === 0 && <span className="text-sm text-muted-foreground">Nothing recognized.</span>}
            </div>
          </div>
        )}
      </QuestPanel>

      {scanType === "tools" && (
        <QuestPanel eyebrow="Master's Note" title="Holding a chef's knife">
          <ul className="text-sm space-y-2 text-muted-foreground">
            <li>• Pinch the blade at its base between your thumb and index finger.</li>
            <li>• Wrap the remaining three fingers around the handle.</li>
            <li>• Curl the fingertips of your guiding hand inward — your knuckles guide the blade.</li>
            <li>• Rock the blade through the cut. Never push straight down.</li>
          </ul>
        </QuestPanel>
      )}

      {(recent.data?.scans?.length ?? 0) > 0 && (
        <QuestPanel eyebrow="Archive" title="Recent scans">
          <ul className="text-sm space-y-2">
            {recent.data!.scans.slice(0, 8).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0">
                <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString()} · {s.scan_type}</span>
                <span className="text-xs gold-text">{(s.detected_items as { name: string }[]).length} items</span>
              </li>
            ))}
          </ul>
        </QuestPanel>
      )}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}