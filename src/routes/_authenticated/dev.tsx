import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/api/profile.functions";
import { importRecipeFromText, createRecipe } from "@/lib/api/recipes.functions";
import { supabase } from "@/integrations/supabase/client";
import { QuestPanel } from "@/components/quest-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dev")({
  component: DevSession,
});

function DevSession() {
  const me = useQuery({ queryKey: ["me"], queryFn: useServerFn(getMyProfile) });
  const isAdmin = (me.data?.roles ?? []).includes("admin");

  if (!me.data) return null;
  if (!isAdmin) {
    return (
      <QuestPanel eyebrow="Restricted" title="Developer Session">
        <div className="flex items-start gap-3 text-sm">
          <ShieldAlert className="text-[var(--gold)] shrink-0" />
          <div className="space-y-1">
            <p>This area is for admins only.</p>
            <p className="text-muted-foreground">To grant yourself access, run this SQL in the backend (one time):</p>
            <pre className="bg-secondary p-3 rounded text-xs mt-2 overflow-x-auto">{`INSERT INTO public.user_roles (user_id, role)
VALUES ('${me.data.profile.id}', 'admin')
ON CONFLICT DO NOTHING;`}</pre>
          </div>
        </div>
      </QuestPanel>
    );
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const importFn = useServerFn(importRecipeFromText);
  const createFn = useServerFn(createRecipe);
  const qc = useQueryClient();

  const [raw, setRaw] = useState("");
  const [source, setSource] = useState("WhatsApp channel");
  const [importing, setImporting] = useState(false);

  const [title, setTitle] = useState("");
  const [ing, setIng] = useState("");
  const [steps, setSteps] = useState("");
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(50);
  const [creating, setCreating] = useState(false);

  const recipes = useQuery({
    queryKey: ["all-recipes"],
    queryFn: async () => {
      const { data } = await supabase.from("recipes").select("id,title,required_level,difficulty,xp_reward,source").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  async function doImport() {
    if (raw.length < 20) { toast.error("Paste a longer recipe"); return; }
    setImporting(true);
    try {
      const res = await importFn({ data: { raw, source } });
      toast.success(`Imported: ${res.recipe.title}`);
      setRaw("");
      qc.invalidateQueries({ queryKey: ["all-recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Import failed"); }
    finally { setImporting(false); }
  }

  async function doCreate() {
    if (!title || !ing || !steps) { toast.error("Fill title, ingredients, steps"); return; }
    setCreating(true);
    try {
      const diffMap = ["apprentice","line_cook","sous_chef","head_chef","legendary"] as const;
      const difficulty = diffMap[Math.min(4, Math.floor(level / 12))];
      await createFn({ data: {
        title, difficulty, required_level: level, xp_reward: xp,
        ingredients: ing.split("\n").map(s => s.trim()).filter(Boolean),
        steps: steps.split("\n").map(s => s.trim()).filter(Boolean),
        is_public: true, source: "developer",
      } });
      toast.success("Recipe added");
      setTitle(""); setIng(""); setSteps("");
      qc.invalidateQueries({ queryKey: ["all-recipes"] });
      qc.invalidateQueries({ queryKey: ["recipes"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCreating(false); }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Hidden Quest</div>
        <h1 className="font-serif text-3xl gold-text">Developer Session</h1>
      </header>

      <QuestPanel eyebrow="AI Importer" title="Paste a WhatsApp recipe">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="WhatsApp channel name" />
          </div>
          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={10} placeholder="Paste the full message — title, ingredients, steps, anything. AI parses it." />
          <Button onClick={doImport} disabled={importing} className="w-full">
            {importing ? <Loader2 className="animate-spin" /> : <><Sparkles className="mr-1" /> Parse & save</>}
          </Button>
        </div>
      </QuestPanel>

      <QuestPanel eyebrow="Manual" title="Add a recipe by hand">
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Required level</Label><Input type="number" min={1} max={100} value={level} onChange={(e) => setLevel(+e.target.value)} /></div>
            <div className="space-y-1.5"><Label>XP reward</Label><Input type="number" min={10} max={500} value={xp} onChange={(e) => setXp(+e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Ingredients (one per line)</Label><Textarea rows={5} value={ing} onChange={(e) => setIng(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Steps (one per line)</Label><Textarea rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} /></div>
          <Button onClick={doCreate} disabled={creating}>{creating ? <Loader2 className="animate-spin" /> : "Save recipe"}</Button>
        </div>
      </QuestPanel>

      <QuestPanel eyebrow="Catalog" title="All recipes">
        <ul className="text-sm divide-y divide-border/40">
          {recipes.data?.map((r) => (
            <li key={r.id} className="py-2 flex justify-between gap-3">
              <span className="truncate">{r.title}</span>
              <span className="text-xs text-muted-foreground shrink-0">Lv. {r.required_level} · +{r.xp_reward} XP · {r.source ?? "—"}</span>
            </li>
          ))}
        </ul>
      </QuestPanel>
    </div>
  );
}