import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChefHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in · Cook's Path" },
    { name: "description", content: "Begin your culinary quest. Sign in or create your chef profile." },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/dashboard", replace: true }); });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        if (username.length < 2 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
          toast.error("Username: 2+ chars, letters/numbers/_-");
          return;
        }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { username } },
        });
        if (error) throw error;
        toast.success("Welcome, chef. Your quest begins.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally { setLoading(false); }
  }

  async function googleSignIn() {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) { toast.error("Google sign-in failed"); setLoading(false); return; }
    if (res.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md quest-panel p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-[var(--gold)]/40 gold-glow">
            <ChefHat className="text-[var(--gold)]" />
          </div>
          <h1 className="font-serif text-3xl gold-text">Cook's Path</h1>
          <p className="text-sm text-muted-foreground">{mode === "signin" ? "Resume your quest" : "Forge your chef"}</p>
        </div>

        <Button type="button" variant="outline" className="w-full" onClick={googleSignIn} disabled={loading}>
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Chef name</Label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Kang_SeongJae" maxLength={32} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : mode === "signin" ? "Enter the kitchen" : "Begin the quest"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already a chef?"}{" "}
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="gold-text font-medium cursor-pointer">
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
        <p className="text-center text-xs"><Link to="/" className="text-muted-foreground hover:text-foreground">← Back to home</Link></p>
      </div>
    </div>
  );
}