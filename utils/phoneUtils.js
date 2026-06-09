const DEFAULT_COUNTRY_CODE = process.env.INFOBIP_DEFAULT_COUNTRY_CODE || '1';

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function normalizePhoneForLookup(phone) {
  return digitsOnly(phone);
}

function toSmsDestination(phone) {
  const digits = digitsOnly(phone);
  if (!digits) return null;

  if (String(phone).trim().startsWith('+')) {
    return digits;
  }

  if (digits.length === 10) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length === 11 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return digits;
  }

  return digits;
}

function maskPhone(phone) {
  const digits = digitsOnly(phone);
  if (digits.length < 4) return '****';
  return `***${digits.slice(-4)}`;
}

module.exports = {
  digitsOnly,
  normalizePhoneForLookup,
  toSmsDestination,
  maskPhone,
};
