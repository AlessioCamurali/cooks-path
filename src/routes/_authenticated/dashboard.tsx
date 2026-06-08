import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/api/profile.functions";
import { supabase } from "@/integrations/supabase/client";
import { ChefStats } from "@/components/chef-stats";
import { QuestPanel } from "@/components/quest-panel";
import { Camera, BookOpen, Trophy, Lock, ChevronRight } from "lucide-react";
import { rankFor, DIFFICULTY_LABEL } from "@/lib/levels";
import grimoireImg from "@/assets/grimoire-hero.jpg";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Quest · Cook's Path" }, { name: "description", content: "Your active culinary quest, XP, and next recipes." }] }),
  component: Dashboard,
});

function Dashboard() {
  const fetchMe = useServerFn(getMyProfile);
  const me = useQuery({ queryKey: ["me"], queryFn: () => fetchMe() });

  const recipes = useQuery({
    queryKey: ["recipes-next", me.data?.profile?.level],
    enabled: !!me.data,
    queryFn: async () => {
      const lvl = me.data!.profile.level;
      const { data, error } = await supabase.from("recipes").select("id,title,difficulty,required_level,xp_reward,cuisine,image_url").eq("is_public", true).order("required_level", { ascending: true }).limit(6);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, locked: r.required_level > lvl }));
    },
  });

  if (!me.data) return <div className="text-muted-foreground text-sm">Awakening quest panel…</div>;
  const p = me.data.profile;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-[1.1fr_1fr] gap-6">
        <ChefStats username={p.username} level={p.level} xp={p.xp} recipesCompleted={p.recipes_completed} />
        <div className="quest-panel overflow-hidden relative min-h-[200px]">
          <img src={grimoireImg} alt="The Grimoire of Cooking" className="absolute inset-0 w-full h-full object-cover opacity-50" width={1536} height={1024} />
          <div className="relative p-6 h-full flex flex-col justify-end">
            <div className="text-[10px] tracking-[0.3em] uppercase text-[var(--gold-soft)]">Today's Calling</div>
            <div className="font-serif text-2xl gold-text">{rankFor(p.level).tier}'s Trial</div>
            <p className="text-sm text-muted-foreground mt-1">Cook a new recipe. Earn XP. Ascend the ranks.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ActionCard to="/scan" icon={<Camera size={18} />} title="Scan" sub="Fridge / cutlery" />
        <ActionCard to="/recipes" icon={<BookOpen size={18} />} title="Codex" sub="Browse recipes" />
        <ActionCard to="/leaderboard" icon={<Trophy size={18} />} title="Hall" sub="Top chefs" />
      </div>

      <QuestPanel eyebrow="Cook's Path · Available Quests" title="Recipes near your level">
        <div className="grid sm:grid-cols-2 gap-3">
          {recipes.data?.map((r) => (
            <Link key={r.id} to="/recipes/$id" params={{ id: r.id }} className={`group flex items-center gap-3 p-3 rounded-md border transition-colors ${r.locked ? "border-border/50 opacity-60" : "border-border hover:border-[var(--gold)]/60"}`}>
              <div className="w-14 h-14 rounded bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <BookOpen size={18} className="text-[var(--gold)]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-sm gold-text truncate">{r.title}</div>
                <div className="text-xs text-muted-foreground">Lv. {r.required_level} · {DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty} · +{r.xp_reward} XP</div>
              </div>
              {r.locked ? <Lock size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground group-hover:text-[var(--gold)]" />}
            </Link>
          ))}
          {recipes.data?.length === 0 && <p className="text-sm text-muted-foreground sm:col-span-2">No recipes yet. Open the Codex to add one.</p>}
        </div>
      </QuestPanel>
    </div>
  );
}

function ActionCard({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="quest-panel p-4 flex flex-col items-start gap-1.5 hover:gold-glow transition-shadow">
      <span className="text-[var(--gold)]">{icon}</span>
      <span className="font-serif gold-text">{title}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </Link>
  );
}