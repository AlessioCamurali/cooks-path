import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/api/profile.functions";
import { SiteNav } from "@/components/site-nav";
import { useEffect } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const fetchProfile = useServerFn(getMyProfile);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fetchProfile() });
  const navigate = useNavigate();
  const loc = useLocation();
  const onboarded = data?.profile?.onboarded;
  const isAdmin = (data?.roles ?? []).includes("admin");

  useEffect(() => {
    if (data && !onboarded && loc.pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [data, onboarded, loc.pathname, navigate]);

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      {onboarded && <SiteNav isAdmin={isAdmin} />}
      <main className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10">
        <Outlet />
      </main>
    </div>
  );
}