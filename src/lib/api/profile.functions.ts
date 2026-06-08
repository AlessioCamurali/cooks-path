import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SkillSchema = z.object({
  skill_level: z.enum(["novice", "home_cook", "enthusiast", "advanced"]),
  username: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SkillSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const starterXp = { novice: 0, home_cook: 50, enthusiast: 150, advanced: 400 }[data.skill_level];
    const { error } = await supabase.from("profiles").update({
      skill_level: data.skill_level,
      onboarded: true,
      xp: starterXp,
      level: Math.max(1, 1 + Math.floor(starterXp / 100)),
      ...(data.username ? { username: data.username } : {}),
    }).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw new Error(error.message);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return { profile: data, roles: (roles ?? []).map((r) => r.role) };
  });

export const completeRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ recipe_id: z.string().uuid(), notes: z.string().max(500).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("recipe_completions").insert({ user_id: userId, recipe_id: data.recipe_id, notes: data.notes });
    if (error) throw new Error(error.message);
    return { ok: true };
  });