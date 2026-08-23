export interface SendSmsOptions {
  to: string;
  message: string;
}

export async function sendSms(options: SendSmsOptions): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const params = new URLSearchParams();
      params.append('To', options.to);
      params.append('From', twilioFromNumber);
      params.append('Body', options.message);

      const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = (await res.json()) as any;
      if (res.ok) {
        return { success: true, sid: data.sid };
      }
      return { success: false, error: data.message || 'Twilio SMS failed' };
    }

    const fast2SmsKey = process.env.FAST2SMS_API_KEY;
    if (fast2SmsKey) {
      const cleanPhone = options.to.replace(/[^0-9]/g, '').slice(-10);
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'v3',
          sender_id: 'TXTIND',
          message: options.message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone,
        }),
      });

      const data = (await res.json()) as any;
      if (data.return) {
        return { success: true, sid: data.request_id };
      }
      return { success: false, error: data.message || 'Fast2SMS failed' };
    }

    return { success: true, sid: 'mock-sms-sent' };
  } catch (err: any) {
    return { success: false, error: err.message || 'SMS delivery failed' };
  }
}
