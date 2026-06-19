// Re-translates all non-French labels (product_sheet_packagings) of a given
// product sheet. Called after a FT update to keep stored translations in sync
// with the source. Source of truth = product_sheets fields.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  en: "English", de: "German", es: "Spanish", it: "Italian", fr: "French",
};

async function translate(language: string, fields: Record<string, string>, apiKey: string) {
  const targetName = LANG_NAMES[language] ?? language;
  const system = `You translate food label texts from French to ${targetName} for EU INCO regulation 1169/2011 compliant labels.
Rules:
- Preserve HTML tags exactly (do not add/remove tags, attributes, or whitespace structure).
- Keep allergens in the same emphasis (e.g. <strong> stays <strong>) and translated.
- Keep percentages, numbers, units (g, kg, °C, %), and proper nouns.
- Use the standard ${targetName} food-label terminology.
- For "product_name": translate the FULL commercial name literally, preserving every token (weight like 90G, state like CONGELE/FROZEN, descriptors, pack info). Do NOT shorten or summarize. Reorder tokens to natural ${targetName} word order. Keep the original case style. Fix obvious French spellings of English loanwords (POTATOE → POTATO).
- Do not add commentary. Output JSON only.`;
  const user = `Translate each field below to ${targetName}. Return JSON with exactly the same keys.
If a field is empty, return an empty string.

${JSON.stringify(fields, null, 2)}`;
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  try { return JSON.parse(data?.choices?.[0]?.message?.content ?? "{}"); } catch { return {}; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { sheet_id } = await req.json();
    if (!sheet_id) {
      return new Response(JSON.stringify({ error: "sheet_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sheet, error: sErr } = await supabase
      .from("product_sheets")
      .select("product_name, inco_html, allergen_statement, snapshot_allergens, storage_instructions, thawing_instructions")
      .eq("id", sheet_id)
      .single();
    if (sErr) throw sErr;

    const traces = (sheet as any)?.snapshot_allergens?.secondary?.join(", ") ?? "";
    const source = {
      product_name: (sheet as any)?.product_name ?? "",
      ingredients_html: (sheet as any)?.inco_html ?? "",
      allergen_statement: (sheet as any)?.allergen_statement ?? "",
      traces_statement: traces,
      storage_instructions: (sheet as any)?.storage_instructions ?? "",
      thawing_instructions: (sheet as any)?.thawing_instructions ?? "",
    };

    const { data: packs, error: pErr } = await supabase
      .from("product_sheet_packagings")
      .select("id, language")
      .eq("product_sheet_id", sheet_id)
      .neq("language", "fr");
    if (pErr) throw pErr;

    const langs = Array.from(new Set((packs ?? []).map((p: any) => p.language)));
    const translationsByLang: Record<string, any> = {};
    for (const lang of langs) {
      translationsByLang[lang] = await translate(lang, source, apiKey);
    }

    let updated = 0;
    for (const p of packs ?? []) {
      const tr = translationsByLang[(p as any).language] ?? {};
      const { error: uErr } = await supabase
        .from("product_sheet_packagings")
        .update({
          translated_product_name: tr.product_name ?? null,
          translated_ingredients_html: tr.ingredients_html ?? null,
          translated_allergen_statement: tr.allergen_statement ?? null,
          translated_traces_statement: tr.traces_statement ?? null,
          translated_storage_instructions: tr.storage_instructions ?? null,
          translated_thawing_instructions: tr.thawing_instructions ?? null,
          translated_at: new Date().toISOString(),
        })
        .eq("id", (p as any).id);
      if (!uErr) updated++;
    }

    return new Response(JSON.stringify({ updated, languages: langs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
