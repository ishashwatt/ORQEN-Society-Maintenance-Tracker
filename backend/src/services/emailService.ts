import dotenv from 'dotenv';

dotenv.config();

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  
  if (!resendApiKey) {
    console.warn('[EMAIL SERVICE WARNING] RESEND_API_KEY is not configured in environment variables');
    return { success: false, error: 'RESEND_API_KEY is missing' };
  }

  try {
    const fromAddress = process.env.EMAIL_FROM?.trim() || 'onboarding@resend.dev';
    const formattedFrom = fromAddress.includes('<') ? fromAddress : `ORQEN Operations <${fromAddress}>`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: formattedFrom,
        to: [options.to.trim()],
        subject: options.subject,
        text: options.text,
        html: options.html || options.text.replace(/\n/g, '<br/>'),
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as { id: string };
      console.log(`[RESEND EMAIL SUCCESS] Dispatched to ${options.to} (Message ID: ${data.id})`);
      return { success: true, messageId: data.id };
    } else {
      const errText = await response.text();
      console.error('[RESEND API ERROR]:', errText);
      return { success: false, error: errText };
    }
  } catch (err: any) {
    console.error('[RESEND DISPATCH FAILED]:', err.message || err);
    return { success: false, error: err.message };
  }
}
