import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import grimoireImg from "@/assets/grimoire-hero.jpg";
import { ChefHat, Camera, Trophy, Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cook's Path — Become a Legendary Chef" },
      { name: "description", content: "An RPG-style cookbook. Photograph your fridge, unlock sealed recipes, level up, and climb the Hall of Chefs." },
      { property: "og:title", content: "Cook's Path — Become a Legendary Chef" },
      { property: "og:description", content: "An RPG-style cookbook. Photograph your fridge, unlock sealed recipes, level up, and climb the Hall of Chefs." },
      { property: "og:image", content: "/og-image.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <header className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-serif text-lg gold-text">
          <ChefHat size={20} /> Cook's Path
        </div>
        <Link to="/auth"><Button variant="outline" size="sm">Sign in</Button></Link>
      </header>

      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <img src={grimoireImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-35" width={1536} height={1024} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="relative mx-auto max-w-3xl px-6 text-center space-y-6 py-24">
          <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-[var(--gold-soft)] border border-[var(--gold)]/30 rounded-full px-3 py-1">
            <Sparkles size={12} /> The Cook's Path System
          </div>
          <h1 className="font-serif text-5xl md:text-7xl gold-text leading-[1.05]">Awaken your inner chef</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
            A holographic recipe codex inspired by <em>The Legend of the Kitchen Soldier</em>. Photograph your fridge, complete quests, break sealed scrolls, and rise from Apprentice to Legendary.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/auth"><Button size="lg" className="gold-glow">Begin your quest</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">I already have a chef</Button></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20 grid md:grid-cols-3 gap-5">
        <Feature icon={<Camera />} title="Cook's Eye" body="Photograph what's in your fridge and on your knife rack. The system identifies every ingredient and tool." />
        <Feature icon={<Lock />} title="Sealed Scrolls" body="Recipes above your level remain sealed. Master simpler quests to break the seal on legendary dishes." />
        <Feature icon={<Trophy />} title="Hall of Chefs" body="Earn XP, climb 5 ranks from Apprentice to Legendary, and stake your name on the leaderboard." />
      </section>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        Cook's Path · A culinary RPG
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="quest-panel p-6 space-y-2">
      <div className="text-[var(--gold)]">{icon}</div>
      <h3 className="font-serif text-lg gold-text">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
