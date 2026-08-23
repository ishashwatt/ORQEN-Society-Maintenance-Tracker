import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function getTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER?.trim();
  const rawPass = process.env.SMTP_PASS?.trim();
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (!user || !pass) return null;

  if (host === 'smtp.gmail.com' || user.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress.includes('<') ? fromAddress : `ORQEN Society <${fromAddress}>`,
          to: [options.to.trim()],
          subject: options.subject,
          text: options.text,
          html: options.html || options.text.replace(/\n/g, '<br/>'),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        console.log(`[RESEND EMAIL SUCCESS] to ${options.to} id: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        const errText = await response.text();
        console.error('[RESEND API ERROR]:', errText);
      }
    }

    const emailTransporter = getTransporter();
    if (emailTransporter && process.env.SMTP_USER) {
      const senderUser = process.env.SMTP_USER.trim();
      const info = await emailTransporter.sendMail({
        from: `"ORQEN Society" <${senderUser}>`,
        to: options.to.trim(),
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br/>'),
      });
      console.log(`[GMAIL SMTP SUCCESS] to ${options.to} messageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    }

    console.warn('[EMAIL NOT CONFIGURED] No active SMTP_USER/SMTP_PASS or RESEND_API_KEY found in environment');
    return { success: true, messageId: 'mock-sent' };
  } catch (err: any) {
    console.error('[EMAIL SEND FAILED]:', err.message || err);
    return { success: false, error: err.message };
  }
}
