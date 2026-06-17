// Translate product label texts (INCO ingredients HTML, allergens, traces,
// storage & thawing instructions) from French to a target language using
// Lovable AI. Returns the translated fields without modifying the source FT.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LANG_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  es: "Spanish",
  it: "Italian",
  fr: "French",
};

interface Payload {
  language: string;
  product_name?: string | null;
  ingredients_html?: string | null;
  allergen_statement?: string | null;
  traces_statement?: string | null;
  storage_instructions?: string | null;
  thawing_instructions?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const payload: Payload = await req.json();
    const targetName = LANG_NAMES[payload.language] ?? payload.language;
    if (!payload.language || payload.language === "fr") {
      return new Response(JSON.stringify({ error: "Target language required (not fr)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = {
      ingredients_html: payload.ingredients_html ?? "",
      allergen_statement: payload.allergen_statement ?? "",
      traces_statement: payload.traces_statement ?? "",
      storage_instructions: payload.storage_instructions ?? "",
      thawing_instructions: payload.thawing_instructions ?? "",
    };

    const system = `You translate food label texts from French to ${targetName} for EU INCO regulation 1169/2011 compliant labels.
Rules:
- Preserve HTML tags exactly (do not add/remove tags, attributes, or whitespace structure).
- Keep allergens in the same emphasis (e.g. <strong> stays <strong>) and translated.
- Keep percentages, numbers, units (g, kg, °C, %), and proper nouns.
- Use the standard ${targetName} food-label terminology.
- Do not add commentary. Output JSON only.`;

    const user = `Translate each field below to ${targetName}. Return JSON with exactly the same keys.
If a field is empty, return an empty string.

${JSON.stringify(fields, null, 2)}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway ${res.status}: ${text}` }), {
        status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, string> = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    return new Response(JSON.stringify({
      ingredients_html: parsed.ingredients_html ?? "",
      allergen_statement: parsed.allergen_statement ?? "",
      traces_statement: parsed.traces_statement ?? "",
      storage_instructions: parsed.storage_instructions ?? "",
      thawing_instructions: parsed.thawing_instructions ?? "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
