import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '') : undefined;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (user && pass) {
    if (host === 'smtp.gmail.com' || user.endsWith('@gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    } else if (host) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
      });
    }
  }

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const fromAddress = process.env.EMAIL_FROM || 'onboarding@resend.dev';
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey.trim()}`,
        },
        body: JSON.stringify({
          from: fromAddress.includes('<') ? fromAddress : `ORQEN Society <${fromAddress}>`,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html || options.text.replace(/\n/g, '<br/>'),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        return { success: true, messageId: data.id };
      } else {
        const errText = await response.text();
        console.error('[RESEND API ERROR]:', errText);
      }
    }

    const emailTransporter = getTransporter();
    if (emailTransporter) {
      const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@orqen.com';
      const info = await emailTransporter.sendMail({
        from: fromAddress.includes('<') ? fromAddress : `ORQEN Operations <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br/>'),
      });
      return { success: true, messageId: info.messageId };
    }

    return { success: true, messageId: 'mock-sent' };
  } catch (err: any) {
    console.error('[EMAIL SEND ERROR]:', err.message);
    return { success: false, error: err.message };
  }
}
