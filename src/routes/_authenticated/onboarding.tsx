import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { completeOnboarding } from "@/lib/api/profile.functions";
import { Button } from "@/components/ui/button";
import { QuestPanel } from "@/components/quest-panel";
import { Sparkles, Flame, ChefHat, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

const TIERS = [
  { key: "novice",     label: "Novice",      icon: Sparkles, desc: "I rarely cook. Start me from the very beginning.", startXp: 0 },
  { key: "home_cook",  label: "Home Cook",   icon: Flame,    desc: "I cook a few times a week. Skip the basics.",    startXp: 50 },
  { key: "enthusiast", label: "Enthusiast",  icon: ChefHat,  desc: "I love cooking and try new techniques.",         startXp: 150 },
  { key: "advanced",   label: "Advanced",    icon: Crown,    desc: "I'm comfortable with most techniques.",          startXp: 400 },
] as const;

function Onboarding() {
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(completeOnboarding);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function start() {
    if (!picked) return;
    setLoading(true);
    try {
      await fn({ data: { skill_level: picked as "novice" | "home_cook" | "enthusiast" | "advanced" } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Cook's Path activated.");
      navigate({ to: "/dashboard", replace: true });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to start"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-8">
      <header className="text-center space-y-2">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">System Initialization</div>
        <h1 className="font-serif text-4xl md:text-5xl gold-text">Choose your starting rank</h1>
        <p className="text-muted-foreground max-w-md mx-auto">Only the chosen may see this quest panel. Tell the system how skilled you already are.</p>
      </header>
      <div className="grid sm:grid-cols-2 gap-4">
        {TIERS.map((t) => {
          const Icon = t.icon;
          const active = picked === t.key;
          return (
            <button key={t.key} onClick={() => setPicked(t.key)} className={`text-left p-5 rounded-lg border transition-all cursor-pointer ${active ? "border-[var(--gold)] bg-[var(--gold)]/5 gold-glow" : "border-border hover:border-[var(--gold)]/50"}`}>
              <Icon className="text-[var(--gold)] mb-3" size={22} />
              <div className="font-serif text-xl gold-text">{t.label}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
              <div className="text-xs mt-3 text-[var(--gold-soft)]">Starting XP: {t.startXp}</div>
            </button>
          );
        })}
      </div>
      <QuestPanel eyebrow="Quest #001" title="Awaken the Cook's Path">
        <p className="text-sm text-muted-foreground mb-4">Once activated, the system will track your XP, level, and rank. Recipes above your level remain sealed until you grow.</p>
        <Button onClick={start} disabled={!picked || loading} className="w-full" size="lg">
          {loading ? <Loader2 className="animate-spin" /> : "Activate"}
        </Button>
      </QuestPanel>
    </div>
  );
}