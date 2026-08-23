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
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });
  }

  return transporter;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@orqen.com';
    const emailTransporter = getTransporter();

    if (emailTransporter) {
      const info = await emailTransporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br/>'),
      });
      return { success: true, messageId: info.messageId };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html || options.text.replace(/\n/g, '<br/>'),
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        return { success: true, messageId: data.id };
      }
    }

    return { success: true, messageId: 'mock-sent' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Email delivery failed' };
  }
}
