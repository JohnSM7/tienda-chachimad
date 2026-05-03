// =====================================================
// Plantilla HTML base con diseno Madcry Studio
// =====================================================
// Estetica: fondo negro, tipografia Oswald, mayusculas con tracking,
// minimalista. Compatible con Gmail/Outlook/Apple Mail (uso solo
// inline styles, tablas, sin flexbox/grid avanzado).
// =====================================================

export interface EmailTemplateOptions {
  /** Pre-header (texto que se ve en la bandeja antes de abrir) */
  preheader?: string;
  /** Titulo grande arriba */
  heading: string;
  /** Subtitulo/eyebrow encima del heading (ej "PEDIDO #1234") */
  eyebrow?: string;
  /** HTML interior — ya escapado por el caller */
  bodyHtml: string;
  /** CTA opcional al final */
  cta?: { label: string; url: string };
  /** Texto de footer extra (legales, soporte) */
  footerNote?: string;
}

const SHOP_URL = Deno.env.get('SHOP_URL') ?? 'https://madcry.com';
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'info@madcry.com';
const LOGO_URL = `${SHOP_URL}/images/logo.png`;

export function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatPriceCents(cents: number, currency = 'eur'): string {
  return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

export function renderEmail(opts: EmailTemplateOptions): string {
  const {
    preheader = '',
    eyebrow = '',
    heading,
    bodyHtml,
    cta,
    footerNote = '',
  } = opts;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(heading)}</title>
<style>
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px-mobile { padding-left: 24px !important; padding-right: 24px !important; }
    .heading { font-size: 28px !important; line-height: 1.1 !important; }
  }
  body { margin: 0; padding: 0; }
  a { color: #ffffff; text-decoration: underline; }
</style>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e5e5e5;">

<!-- Pre-header oculto -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#000;opacity:0;">${escapeHtml(preheader)}</div>

<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#000000;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" class="container" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background:#0a0a0a;border:1px solid #1f1f1f;">

        <!-- HEADER con logo -->
        <tr>
          <td align="center" style="padding:32px 24px 16px 24px;border-bottom:1px solid #1f1f1f;">
            <img src="${LOGO_URL}" width="56" height="56" alt="MADCRY" style="display:block;border:0;outline:none;text-decoration:none;height:56px;width:auto;">
            <p style="margin:12px 0 0 0;font-size:11px;letter-spacing:0.4em;color:#ffffff;text-transform:uppercase;font-weight:700;">MADCRY · STUDIO</p>
          </td>
        </tr>

        <!-- TITULO -->
        <tr>
          <td class="px-mobile" style="padding:48px 48px 16px 48px;">
            ${eyebrow ? `<p style="margin:0 0 12px 0;font-size:10px;letter-spacing:0.3em;color:#888888;text-transform:uppercase;font-weight:700;">${escapeHtml(eyebrow)}</p>` : ''}
            <h1 class="heading" style="margin:0;font-size:36px;line-height:1;color:#ffffff;font-weight:700;text-transform:uppercase;letter-spacing:-0.02em;">
              ${escapeHtml(heading)}
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td class="px-mobile" style="padding:24px 48px 32px 48px;font-size:14px;line-height:1.7;color:#bcbcbc;">
            ${bodyHtml}
          </td>
        </tr>

        ${
          cta
            ? `
        <!-- CTA -->
        <tr>
          <td class="px-mobile" align="center" style="padding:0 48px 48px 48px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#ffffff;">
                  <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:16px 40px;font-size:11px;letter-spacing:0.3em;color:#000000;text-decoration:none;text-transform:uppercase;font-weight:700;">${escapeHtml(cta.label)} →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        `
            : ''
        }

        <!-- FOOTER -->
        <tr>
          <td class="px-mobile" style="padding:32px 48px;border-top:1px solid #1f1f1f;">
            ${footerNote ? `<p style="margin:0 0 16px 0;font-size:11px;line-height:1.6;color:#666666;">${footerNote}</p>` : ''}
            <p style="margin:0;font-size:10px;letter-spacing:0.2em;color:#444444;text-transform:uppercase;">
              <a href="${SHOP_URL}" style="color:#666666;text-decoration:none;">madcry.com</a>
              &nbsp;·&nbsp;
              <a href="mailto:${ADMIN_EMAIL}" style="color:#666666;text-decoration:none;">${ADMIN_EMAIL}</a>
              &nbsp;·&nbsp;
              Madrid, ES
            </p>
          </td>
        </tr>

      </table>

      <!-- Signature -->
      <table role="presentation" class="container" width="600" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr>
          <td align="center" style="padding:24px 24px 16px 24px;font-size:9px;letter-spacing:0.3em;color:#333333;text-transform:uppercase;">
            Designed with tears.
          </td>
        </tr>
      </table>

    </td>
  </tr>
</table>

</body>
</html>`;
}

/**
 * Helper para renderizar tablas de detalles (key/value) con estetica MADCRY.
 */
export function renderDetailRows(
  rows: Array<{ label: string; value: string }>
): string {
  return `<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin:8px 0;border-top:1px solid #1f1f1f;">
${rows
  .map(
    ({ label, value }) => `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid #1f1f1f;font-size:10px;letter-spacing:0.2em;color:#666666;text-transform:uppercase;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:14px 0;border-bottom:1px solid #1f1f1f;font-size:14px;color:#ffffff;text-align:right;vertical-align:top;">${value}</td>
  </tr>`
  )
  .join('')}
</table>`;
}
