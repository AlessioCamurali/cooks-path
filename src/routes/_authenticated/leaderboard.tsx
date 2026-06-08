import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QuestPanel } from "@/components/quest-panel";
import { rankFor } from "@/lib/levels";
import { Trophy, Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Hall of Chefs · Cook's Path" }, { name: "description", content: "The top chefs of the Cook's Path leaderboard." }] }),
  component: Leaderboard,
});

function Leaderboard() {
  const top = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id,username,level,xp,recipes_completed").order("xp", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-2 text-center">
        <Crown className="mx-auto text-[var(--gold)]" size={28} />
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Cook's Path</div>
        <h1 className="font-serif text-4xl gold-text">Hall of Chefs</h1>
      </header>
      <QuestPanel>
        <ol className="divide-y divide-border/60">
          {top.data?.map((u, i) => {
            const r = rankFor(u.level);
            return (
              <li key={u.id} className="flex items-center gap-4 py-3">
                <span className={`w-8 text-center font-serif text-lg ${i < 3 ? "gold-text" : "text-muted-foreground"}`}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif gold-text truncate">{u.username}</div>
                  <div className="text-xs text-muted-foreground">Lv. {u.level} · {r.tier} · {u.recipes_completed} recipes</div>
                </div>
                <div className="text-right">
                  <div className="font-serif gold-text">{u.xp}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">XP</div>
                </div>
                {i === 0 && <Trophy className="text-[var(--gold)]" size={18} />}
              </li>
            );
          })}
          {top.data?.length === 0 && <p className="text-sm text-muted-foreground py-4">No chefs ranked yet.</p>}
        </ol>
      </QuestPanel>
    </div>
  );
}