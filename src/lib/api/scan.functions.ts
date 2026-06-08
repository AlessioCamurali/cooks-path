import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Schema = z.object({
  scan_type: z.enum(["ingredients", "tools"]),
  image_base64: z.string().min(100).max(8_000_000),
  mime_type: z.string().regex(/^image\/(png|jpe?g|webp|heic)$/),
});

export const scanInventory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI not configured");

    // Upload to private bucket
    const ext = data.mime_type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/${Date.now()}.${ext}`;
    const bytes = Uint8Array.from(atob(data.image_base64), (c) => c.charCodeAt(0));
    const { error: upErr } = await supabase.storage.from("scan-photos").upload(path, bytes, { contentType: data.mime_type });
    if (upErr) throw new Error(upErr.message);

    // Vision call via Lovable AI Gateway (OpenAI-compatible chat completions)
    const prompt = data.scan_type === "ingredients"
      ? "You are a chef's assistant. Identify every food ingredient visible (vegetables, meats, dairy, pantry items, packaged goods). Return ONLY a JSON object: {\"items\":[{\"name\":\"string\",\"confidence\":0-1}]}. No prose."
      : "You are a chef's assistant. Identify every kitchen tool/cutlery visible (knives by type, pans, pots, utensils, appliances). Return ONLY a JSON object: {\"items\":[{\"name\":\"string\",\"confidence\":0-1}]}. No prose.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${data.mime_type};base64,${data.image_base64}` } },
          ],
        }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`Vision failed: ${errText.slice(0, 200)}`);
    }
    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: { items?: Array<{ name: string; confidence?: number }> } = {};
    try { parsed = JSON.parse(text); } catch { parsed = { items: [] }; }
    const items = parsed.items ?? [];

    const { data: row, error: insErr } = await supabase.from("inventory_scans")
      .insert({ user_id: userId, scan_type: data.scan_type, image_path: path, detected_items: items })
      .select().single();
    if (insErr) throw new Error(insErr.message);
    return { scan: row, items };
  });

export const listMyScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("inventory_scans").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw new Error(error.message);
    return { scans: data ?? [] };
  });