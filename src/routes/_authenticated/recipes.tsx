import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/api/profile.functions";
import { QuestPanel } from "@/components/quest-panel";
import { DIFFICULTY_LABEL } from "@/lib/levels";
import { Lock, BookOpen } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/recipes")({
  head: () => ({ meta: [{ title: "Codex · Cook's Path" }, { name: "description", content: "Browse the full recipe codex. Some pages stay sealed until you level up." }] }),
  component: RecipesIndex,
});

function RecipesIndex() {
  const me = useQuery({ queryKey: ["me"], queryFn: useServerFn(getMyProfile) });
  const [q, setQ] = useState("");
  const recipes = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("recipes").select("id,title,difficulty,required_level,xp_reward,cuisine,image_url,description").eq("is_public", true).order("required_level");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lvl = me.data?.profile.level ?? 1;
  const filtered = (recipes.data ?? []).filter((r) => r.title.toLowerCase().includes(q.toLowerCase()) || (r.cuisine ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Cook's Path</div>
          <h1 className="font-serif text-3xl gold-text">Recipe Codex</h1>
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes or cuisine…" className="w-full md:w-72" />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => {
          const locked = r.required_level > lvl;
          return (
            <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className={`quest-panel overflow-hidden block group ${locked ? "opacity-70" : "hover:gold-glow"} transition-shadow`}>
              <div className="aspect-[16/10] bg-secondary relative overflow-hidden">
                {r.image_url ? <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center"><BookOpen className="text-[var(--gold)]/40" size={32} /></div>
                )}
                {locked && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1">
                    <Lock className="text-[var(--gold)]" />
                    <span className="text-xs gold-text">Sealed · Lv. {r.required_level}</span>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-1">
                <div className="font-serif text-lg gold-text truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">Lv. {r.required_level} · {DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty} · +{r.xp_reward} XP</div>
                {r.description && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.description}</p>}
              </div>
            </Link>
          );
        })}
      </div>
      {recipes.data?.length === 0 && (
        <QuestPanel><p className="text-sm text-muted-foreground">The codex is empty. Admins can seed recipes in the Dev panel.</p></QuestPanel>
      )}
    </div>
  );
}