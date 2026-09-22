import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { name, email, message, subject } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const resend = getResendClient();
    if (!resend) {
      return res.status(503).json({
        success: false,
        error: 'Resend API key is not configured in settings. Please add RESEND_API_KEY to your environment variables to receive contact messages.'
      });
    }

    let fromEmail = (process.env.RESEND_FROM_EMAIL || '').trim();
    const isPublicWebmail = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol)\.com$/i.test(fromEmail);
    if (!fromEmail || isPublicWebmail) {
      fromEmail = 'Haus of Zen <onboarding@resend.dev>';
    }

    let toEmail = (process.env.RESEND_TO_EMAIL || 'info@myhausofzen.com').trim();
    const sanitizedName = name.trim();
    const sanitizedEmail = email.trim();
    const sanitizedMessage = message.trim();
    const emailSubject = subject || `New Sanctuary Inquiry from ${sanitizedName}`;

    const buildHtml = (deliveryNote?: string) => `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; color: #1c1917;">
        <div style="background: #1c1917; color: #f5f5f4; padding: 28px 24px; text-align: center;">
          <h1 style="font-size: 26px; margin: 0; font-style: italic; letter-spacing: 0.04em;">Haus of Zen</h1>
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.25em; color: #d6d3d1; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Apothecary & Womb Wellness Sanctuary</p>
        </div>
        <div style="padding: 32px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6;">
          <p style="color: #78716c; margin-top: 0; margin-bottom: 24px;">You have received a new message through the sanctuary contact portal:</p>
          
          <div style="background: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; width: 80px; color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Sender:</td>
                <td style="padding: 6px 0; color: #1c1917; font-weight: 600;">${sanitizedName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${sanitizedEmail}" style="color: #d97706; text-decoration: none; font-weight: 500;">${sanitizedEmail}</a></td>
              </tr>
            </table>
            <div style="border-top: 1px solid #f5f5f4; margin: 16px 0 12px 0;"></div>
            <div style="color: #a8a29e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message:</div>
            <div style="white-space: pre-wrap; color: #292524; background: #fafaf9; border: 1px solid #f0eeec; padding: 16px; border-radius: 6px; font-family: Georgia, serif; font-size: 15px; line-height: 1.65;">${sanitizedMessage}</div>
          </div>

          <p style="font-size: 13px; color: #78716c; text-align: center; margin: 28px 0 0 0;">
            Tip: Click <em>Reply</em> in your email client to respond directly to <strong>${sanitizedEmail}</strong>.
          </p>
          ${deliveryNote ? `<div style="margin-top: 20px; padding: 12px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; color: #92400e; text-align: center;">${deliveryNote}</div>` : ''}
        </div>
      </div>
    `;

    const textContent = `Haus of Zen - New Sanctuary Inquiry\n\nFrom: ${sanitizedName} (${sanitizedEmail})\n\nMessage:\n${sanitizedMessage}\n\nReply directly to this email to respond to ${sanitizedEmail}.`;

    let result = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: sanitizedEmail,
      subject: emailSubject,
      html: buildHtml(),
      text: textContent
    });

    if (result.error && typeof result.error.message === 'string' && result.error.message.includes('only send testing emails to your own email address')) {
      const match = result.error.message.match(/\(([^)]+@resend\.dev|[^)]+@gmail\.com|[^)]+@[^)]+)\)/i);
      const ownerEmail = match ? match[1] : 'bantuantstravelclub@gmail.com';
      console.warn(`Resend domain not yet verified. Falling back to account owner email: ${ownerEmail}`);
      
      result = await resend.emails.send({
        from: 'Haus of Zen <onboarding@resend.dev>',
        to: ownerEmail,
        replyTo: sanitizedEmail,
        subject: `${emailSubject} [Via Sanctuary Portal]`,
        html: buildHtml(`Delivered to your Resend account email (<strong>${ownerEmail}</strong>) while domain verification for <em>myhausofzen.com</em> is pending on <a href="https://resend.com/domains">resend.com/domains</a>.`),
        text: textContent
      });
    }

    if (result.error) {
      console.error('Resend delivery error:', result.error);
      return res.status(502).json({
        success: false,
        error: result.error.message || 'Failed to dispatch email via Resend'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully.',
      id: result.data?.id
    });
  } catch (err: any) {
    console.error('Error handling /api/contact:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error while dispatching contact message'
    });
  }
}
