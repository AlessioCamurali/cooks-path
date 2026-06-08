import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, completeRecipe } from "@/lib/api/profile.functions";
import { QuestPanel } from "@/components/quest-panel";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_LABEL } from "@/lib/levels";
import { Lock, ChefHat, Clock, Users, Loader2, CheckCircle2, Utensils, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/recipes/$id")({
  component: RecipeDetail,
});

function RecipeDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: useServerFn(getMyProfile) });
  const completeFn = useServerFn(completeRecipe);
  const [completing, setCompleting] = useState(false);

  const recipe = useQuery({
    queryKey: ["recipe", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const done = useQuery({
    queryKey: ["done", id],
    queryFn: async () => {
      const { data } = await supabase.from("recipe_completions").select("id").eq("recipe_id", id).maybeSingle();
      return !!data;
    },
  });

  if (!recipe.data || !me.data) return <div className="text-muted-foreground text-sm">Unsealing scroll…</div>;
  const r = recipe.data;
  const ing = (r.ingredients as string[]) ?? [];
  const steps = (r.steps as string[]) ?? [];
  const tools = (r.tools as string[]) ?? [];
  const locked = r.required_level > me.data.profile.level;

  if (locked) {
    return (
      <QuestPanel eyebrow="Sealed Scroll" title={r.title}>
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <Lock className="text-[var(--gold)]" size={36} />
          <p className="text-sm text-muted-foreground max-w-sm">This recipe is sealed by the Cook's Path. Reach <span className="gold-text font-semibold">Level {r.required_level}</span> to break the seal.</p>
          <p className="text-xs text-muted-foreground">You are currently Level {me.data.profile.level}.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/recipes" })}>Back to Codex</Button>
        </div>
      </QuestPanel>
    );
  }

  async function markComplete() {
    setCompleting(true);
    try {
      await completeFn({ data: { recipe_id: id } });
      toast.success(`+${r.xp_reward} XP earned!`);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["done", id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not complete"); }
    finally { setCompleting(false); }
  }

  return (
    <div className="space-y-6">
      {r.image_url && (
        <div className="quest-panel overflow-hidden aspect-[21/9]">
          <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" />
        </div>
      )}
      <header className="space-y-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{r.cuisine ?? "Recipe"} · {DIFFICULTY_LABEL[r.difficulty]}</div>
        <h1 className="font-serif text-4xl gold-text">{r.title}</h1>
        {r.description && <p className="text-muted-foreground max-w-2xl">{r.description}</p>}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2">
          <span className="inline-flex items-center gap-1"><ChefHat size={14} /> Lv. {r.required_level}</span>
          {r.prep_minutes && <span className="inline-flex items-center gap-1"><Clock size={14} /> {r.prep_minutes + (r.cook_minutes ?? 0)} min</span>}
          {r.servings && <span className="inline-flex items-center gap-1"><Users size={14} /> {r.servings}</span>}
          <span className="inline-flex items-center gap-1 gold-text"><Sparkles size={14} /> +{r.xp_reward} XP</span>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_2fr] gap-6">
        <div className="space-y-6">
          <QuestPanel eyebrow="Items" title="Ingredients">
            <ul className="space-y-1.5 text-sm">
              {ing.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-[var(--gold)]">◆</span> {i}</li>)}
            </ul>
          </QuestPanel>
          {tools.length > 0 && (
            <QuestPanel eyebrow="Equipment" title="Tools">
              <ul className="space-y-1.5 text-sm">
                {tools.map((t, idx) => <li key={idx} className="flex gap-2 items-center"><Utensils size={14} className="text-[var(--gold)]" /> {t}</li>)}
              </ul>
            </QuestPanel>
          )}
        </div>
        <QuestPanel eyebrow="Quest Steps" title="Method">
          <ol className="space-y-4">
            {steps.map((s, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full border border-[var(--gold)]/50 flex items-center justify-center text-xs gold-text font-serif">{idx + 1}</span>
                <p className="text-sm leading-relaxed pt-0.5">{s}</p>
              </li>
            ))}
          </ol>
          <div className="pt-6 mt-6 border-t border-border">
            {done.data ? (
              <div className="inline-flex items-center gap-2 text-sm gold-text"><CheckCircle2 size={18} /> Quest complete</div>
            ) : (
              <Button onClick={markComplete} disabled={completing} size="lg" className="w-full">
                {completing ? <Loader2 className="animate-spin" /> : `Complete quest · +${r.xp_reward} XP`}
              </Button>
            )}
          </div>
        </QuestPanel>
      </div>
    </div>
  );
}