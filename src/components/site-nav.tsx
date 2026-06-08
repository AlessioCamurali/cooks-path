import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChefHat, BookOpen, Camera, Trophy, ShieldCheck, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function SiteNav({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const router = useRouter();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex sticky top-0 z-40 items-center justify-between px-6 py-4 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <Link to="/dashboard" className="flex items-center gap-2 font-serif text-lg gold-text">
          <ChefHat size={20} /> Cook's Path
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/dashboard" icon={<ChefHat size={16} />} label="Quest" />
          <NavLink to="/recipes" icon={<BookOpen size={16} />} label="Codex" />
          <NavLink to="/scan" icon={<Camera size={16} />} label="Scan" />
          <NavLink to="/leaderboard" icon={<Trophy size={16} />} label="Hall" />
          {isAdmin && <NavLink to="/dev" icon={<ShieldCheck size={16} />} label="Dev" />}
          <button onClick={signOut} className="ml-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer">
            <LogOut size={16} /> Exit
          </button>
        </nav>
      </header>
      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        <MobileLink to="/dashboard" icon={<ChefHat size={18} />} label="Quest" />
        <MobileLink to="/recipes" icon={<BookOpen size={18} />} label="Codex" />
        <MobileLink to="/scan" icon={<Camera size={18} />} label="Scan" />
        <MobileLink to="/leaderboard" icon={<Trophy size={18} />} label="Hall" />
        {isAdmin
          ? <MobileLink to="/dev" icon={<ShieldCheck size={18} />} label="Dev" />
          : <button onClick={signOut} className="flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-muted-foreground cursor-pointer"><LogOut size={18} /><span>Exit</span></button>}
      </nav>
    </>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5" activeProps={{ className: "text-foreground gold-text" }}>
      {icon} {label}
    </Link>
  );
}
function MobileLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] text-muted-foreground" activeProps={{ className: "gold-text" }}>
      {icon}<span>{label}</span>
    </Link>
  );
}