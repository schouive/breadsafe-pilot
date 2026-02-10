import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OrderEmailRequest {
  orderId: string;
  recipientEmail: string;
  senderName?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const resend = new Resend(RESEND_API_KEY);

    const { orderId, recipientEmail, senderName } = (await req.json()) as OrderEmailRequest;

    if (!orderId || !recipientEmail) {
      throw new Error("orderId and recipientEmail are required");
    }

    // Fetch order with supplier and lines
    const { data: order, error: orderError } = await supabase
      .from("supplier_orders")
      .select(`
        *,
        suppliers ( id, name, order_email, email, email2 ),
        supplier_order_lines (
          *,
          raw_materials ( id, name, unit, purchase_unit )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error(`Order not found: ${orderError?.message || "unknown"}`);
    }

    // Build HTML table of order lines
    const linesHtml = order.supplier_order_lines
      .map(
        (line: any) =>
          `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${line.raw_materials?.name || "—"}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${line.quantity_ordered}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:center;">${line.unit}</td>
          </tr>`
      )
      .join("");

    const expectedDate = order.expected_delivery_date
      ? new Date(order.expected_delivery_date).toLocaleDateString("fr-FR")
      : "Non spécifiée";

    const clientCode = order.suppliers?.client_code || "—";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#333;">Commande ${order.order_number}</h2>
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-dessous le détail de notre commande :</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          <tbody>
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Référence client</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${clientCode}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Numéro de commande</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${order.order_number}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;">Date de livraison</td>
              <td style="padding:6px 12px;border:1px solid #ddd;">${expectedDate}</td>
            </tr>
          </tbody>
        </table>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Matière première</th>
              <th style="padding:8px;border:1px solid #ddd;">Quantité</th>
              <th style="padding:8px;border:1px solid #ddd;">Unité</th>
            </tr>
          </thead>
          <tbody>${linesHtml}</tbody>
        </table>
        ${order.comment ? `<p><strong>Commentaire :</strong> ${order.comment}</p>` : ""}
        <p>Cordialement,<br/>${senderName || "L'équipe"}</p>
      </div>
    `;

    // Primary recipients: explicit recipient + supplier main email
    const toRecipients = new Set<string>();
    toRecipients.add(recipientEmail);
    if (order.suppliers?.email) toRecipients.add(order.suppliers.email);

    // CC: email2
    const ccRecipients: string[] = [];
    if (order.suppliers?.email2) ccRecipients.push(order.suppliers.email2);

    const emailResponse = await resend.emails.send({
      from: "Bread Shop – Commandes <commandes@breadshop.fr>",
      to: Array.from(toRecipients),
      ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
      subject: `Commande ${order.order_number} — ${order.suppliers?.name || ""}`,
      html,
    });

    console.log("Order email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-order-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
