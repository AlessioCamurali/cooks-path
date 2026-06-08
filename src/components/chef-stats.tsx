import { rankFor, xpProgress } from "@/lib/levels";
import { Star } from "lucide-react";

export function ChefStats({ username, level, xp, recipesCompleted }: { username: string; level: number; xp: number; recipesCompleted: number }) {
  const rank = rankFor(level);
  const prog = xpProgress(xp, level);
  return (
    <div className="quest-panel p-5 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Cook's Path</div>
          <div className="font-serif text-2xl md:text-3xl gold-text">{username}</div>
          <div className="text-sm text-muted-foreground mt-1">Lv. {level} · {rank.tier}</div>
        </div>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={16} className={i < rank.stars ? "fill-[var(--gold)] text-[var(--gold)]" : "text-muted-foreground/40"} />
          ))}
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>XP</span><span>{prog.into} / {prog.needed}</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden border border-border">
          <div className="h-full" style={{ width: `${prog.pct}%`, background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60">
        <Stat label="Recipes" value={recipesCompleted} />
        <Stat label="Total XP" value={xp} />
        <Stat label="Rank" value={rank.tier} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-serif text-lg gold-text truncate">{value}</div>
    </div>
  );
}