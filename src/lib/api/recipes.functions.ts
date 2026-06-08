import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RecipeInput = z.object({
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(600).optional(),
  cuisine: z.string().trim().max(40).optional(),
  difficulty: z.enum(["apprentice", "line_cook", "sous_chef", "head_chef", "legendary"]),
  required_level: z.number().int().min(1).max(100),
  xp_reward: z.number().int().min(10).max(500),
  prep_minutes: z.number().int().min(0).max(1440).optional(),
  cook_minutes: z.number().int().min(0).max(1440).optional(),
  servings: z.number().int().min(1).max(40).optional(),
  ingredients: z.array(z.string().min(1).max(200)).min(1).max(60),
  steps: z.array(z.string().min(1).max(800)).min(1).max(40),
  tools: z.array(z.string().min(1).max(80)).max(30).optional(),
  image_url: z.string().url().max(500).optional(),
  is_public: z.boolean().default(true),
  source: z.string().max(120).optional(),
});

export const createRecipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RecipeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase.from("recipes").insert({
      ...data,
      author_id: userId,
      tools: data.tools ?? [],
    }).select().single();
    if (error) throw new Error(error.message);
    return { recipe: row };
  });

export const importRecipeFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ raw: z.string().min(20).max(8000), source: z.string().max(120).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    const sys = `You parse messy recipe text (often from WhatsApp) into structured JSON. Return ONLY JSON matching: {"title":string, "description":string, "cuisine":string, "difficulty":"apprentice"|"line_cook"|"sous_chef"|"head_chef"|"legendary", "required_level":number(1-100), "xp_reward":number(10-500), "prep_minutes":number, "cook_minutes":number, "servings":number, "ingredients":string[], "steps":string[], "tools":string[]}. Infer difficulty from technique complexity. required_level: apprentice=1, line_cook=5, sous_chef=15, head_chef=30, legendary=50. xp_reward scales with difficulty (50/100/175/275/400).`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: data.raw },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Import failed: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(text); } catch { throw new Error("AI returned invalid JSON"); }

    const insert = {
      author_id: userId,
      title: String(parsed.title ?? "Untitled recipe").slice(0, 140),
      description: parsed.description ? String(parsed.description).slice(0, 600) : null,
      cuisine: parsed.cuisine ? String(parsed.cuisine).slice(0, 40) : null,
      difficulty: ["apprentice","line_cook","sous_chef","head_chef","legendary"].includes(String(parsed.difficulty)) ? String(parsed.difficulty) : "apprentice",
      required_level: Math.min(100, Math.max(1, Number(parsed.required_level) || 1)),
      xp_reward: Math.min(500, Math.max(10, Number(parsed.xp_reward) || 50)),
      prep_minutes: parsed.prep_minutes ? Number(parsed.prep_minutes) : null,
      cook_minutes: parsed.cook_minutes ? Number(parsed.cook_minutes) : null,
      servings: parsed.servings ? Number(parsed.servings) : null,
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      is_public: true,
      source: data.source ?? "imported",
    };
    const { data: row, error } = await supabase.from("recipes").insert(insert).select().single();
    if (error) throw new Error(error.message);
    return { recipe: row };
  });