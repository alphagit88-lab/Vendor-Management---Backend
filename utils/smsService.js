const { toSmsDestination } = require('./phoneUtils');

const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_BASE_URL = (process.env.INFOBIP_BASE_URL || 'https://api.infobip.com').replace(/\/$/, '');
const INFOBIP_SENDER = process.env.INFOBIP_SENDER || 'SuperVendor';

async function sendSms(to, text) {
  if (!INFOBIP_API_KEY) {
    throw new Error('INFOBIP_API_KEY is not configured');
  }

  const destination = toSmsDestination(to);
  if (!destination) {
    throw new Error('Invalid phone number for SMS');
  }

  if (process.env.SMS_LOG_ONLY === 'true') {
    console.log(`[SMS LOG ONLY] To: ${destination} | Message: ${text}`);
    return { success: true, logOnly: true };
  }

  const response = await fetch(`${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
    method: 'POST',
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to: destination }],
          from: INFOBIP_SENDER,
          text,
        },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (process.env.NODE_ENV === 'development') {
    console.log(`[SMS] HTTP ${response.status}\n${JSON.stringify(data, null, 2)}`);
  }

  if (!response.ok) {
    const detail = data?.requestError?.serviceException?.text
      || data?.message
      || `Infobip SMS failed (${response.status})`;
    throw new Error(detail);
  }

  const status = data?.messages?.[0]?.status;
  if (status?.groupId && status.groupId > 3) {
    throw new Error(status.description || 'SMS delivery rejected');
  }

  return data;
}

async function sendPasswordResetOtp(phone, otp) {
  const text = `Your SuperVendor password reset code is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 10} minutes. Do not share this code.`;
  return sendSms(phone, text);
}

module.exports = {
  sendSms,
  sendPasswordResetOtp,
};
