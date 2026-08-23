import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config();

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

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

  if (!user || !pass) return null;

  if (host === 'smtp.gmail.com' || user.endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      family: 4,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4,
    auth: { user, pass },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
  });
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailTransporter = getTransporter();
  if (emailTransporter && process.env.SMTP_USER) {
    try {
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
    } catch (smtpErr: any) {
      console.warn('[GMAIL SMTP FAILED, TRYING REST FALLBACK]:', smtpErr.message);
    }
  }

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (brevoKey) {
    try {
      const senderEmail = process.env.SMTP_USER || 'testingrequiredapp@gmail.com';
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'ORQEN Society', email: senderEmail },
          to: [{ email: options.to.trim() }],
          subject: options.subject,
          htmlContent: options.html || options.text.replace(/\n/g, '<br/>'),
          textContent: options.text,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        console.log(`[BREVO API SUCCESS] to ${options.to} messageId: ${data.messageId}`);
        return { success: true, messageId: data.messageId };
      } else {
        const errText = await response.text();
        console.error('[BREVO API ERROR]:', errText);
      }
    } catch (e: any) {
      console.error('[BREVO ERROR]:', e.message);
    }
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'onboarding@resend.dev',
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
        console.warn('[RESEND API NOTICE]:', errText);
      }
    } catch (e: any) {
      console.warn('[RESEND ERROR]:', e.message);
    }
  }

  return { success: false, error: 'All email transports exhausted' };
}
