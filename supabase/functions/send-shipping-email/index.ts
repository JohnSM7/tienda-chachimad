// =====================================================
// send-shipping-email
// =====================================================
// Disparada desde el panel admin cuando Susana marca un pedido
// como "shipped". Envia al cliente un email con el tracking.
// =====================================================

import { Resend } from 'https://esm.sh/resend@4.0.1';
import { requireAdmin, adminClient } from '../_shared/admin-auth.ts';
import { handleCors, jsonResponse } from '../_shared/cors.ts';
import {
  renderEmail,
  renderDetailRows,
  escapeHtml,
} from '../_shared/email-template.ts';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'info@madcry.com';
const SHOP_URL = Deno.env.get('SHOP_URL') ?? 'https://madcry.com';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    await requireAdmin(req);
  } catch (e) {
    if (e instanceof Response) return e;
    return jsonResponse({ error: 'Auth fallo' }, 401);
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) return jsonResponse({ error: 'Falta order_id' }, 400);

    const supabase = adminClient();
    const { data: order } = await supabase
      .from('orders')
      .select('*, products(name, slug)')
      .eq('id', order_id)
      .single();

    if (!order) return jsonResponse({ error: 'Pedido no encontrado' }, 404);
    if (!order.tracking_number) {
      return jsonResponse({ error: 'El pedido no tiene tracking' }, 400);
    }

    const productName = (order as any).products?.name ?? 'Tu obra';
    const orderShortId = order.stripe_session_id?.slice(-8).toUpperCase() ?? order.id.slice(0, 8);
    const trackingUrl = order.tracking_url ?? buildTrackingUrl(order.carrier, order.tracking_number);

    const detailRows: Array<{ label: string; value: string }> = [
      { label: 'Pieza', value: escapeHtml(productName) },
      { label: 'Pedido', value: `#${orderShortId}` },
      { label: 'Empresa', value: escapeHtml(order.carrier ?? '—') },
      { label: 'Seguimiento', value: `<strong>${escapeHtml(order.tracking_number)}</strong>` },
    ];

    const body = `
      <p style="margin:0 0 16px 0;color:#bcbcbc;">Tu obra <strong style="color:#ffffff;">${escapeHtml(productName)}</strong> ya esta en camino.</p>
      <p style="margin:0 0 24px 0;color:#bcbcbc;">Aqui tienes los detalles del envio para que puedas seguir su trazado:</p>

      ${renderDetailRows(detailRows)}

      <p style="margin:24px 0 0 0;font-size:13px;color:#bcbcbc;line-height:1.7;">
        Entrega estimada: <strong style="color:#ffffff;">3-5 dias laborables</strong> en Espana, 5-10 dias en el resto de la UE.
      </p>
    `;

    const result = await resend.emails.send({
      from: 'Madcry Studio <pedidos@madcry.com>',
      to: order.customer_email,
      replyTo: ADMIN_EMAIL,
      subject: `Tu obra esta en camino · ${productName}`,
      html: renderEmail({
        preheader: `Seguimiento: ${order.tracking_number}`,
        eyebrow: `Pedido #${orderShortId}`,
        heading: 'Tu obra esta en camino',
        bodyHtml: body,
        cta: trackingUrl
          ? { label: 'Seguir el envio', url: trackingUrl }
          : undefined,
        footerNote: `Si tienes cualquier problema con la recepcion, contesta a este email y lo resolvemos.`,
      }),
    });

    return jsonResponse({ ok: true, email_id: (result as any)?.data?.id ?? null });
  } catch (err) {
    console.error('send-shipping-email error:', err);
    const message = err instanceof Error ? err.message : 'Error interno';
    return jsonResponse({ error: message }, 500);
  }
});

function buildTrackingUrl(carrier: string | null, tracking: string): string | undefined {
  if (!carrier) return undefined;
  const c = carrier.toLowerCase();
  if (c.includes('correos')) return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?codigoEnvio=${encodeURIComponent(tracking)}`;
  if (c.includes('seur')) return `https://www.seur.com/livetracking/?segOnlineIdentifier=${encodeURIComponent(tracking)}`;
  if (c.includes('mrw')) return `https://www.mrw.es/seguimiento_envios/MRW_seguimiento.asp?numero=${encodeURIComponent(tracking)}`;
  if (c.includes('dhl')) return `https://www.dhl.com/es-es/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(tracking)}`;
  if (c.includes('gls')) return `https://gls-group.com/ES/es/seguimiento?match=${encodeURIComponent(tracking)}`;
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${encodeURIComponent(tracking)}`;
  return undefined;
}
