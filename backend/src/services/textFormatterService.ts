const COMMON_CORRECTIONS: Record<string, string> = {
  plz: 'please',
  pls: 'please',
  watr: 'water',
  wtr: 'water',
  leek: 'leak',
  leeking: 'leaking',
  leakingg: 'leaking',
  bthroom: 'bathroom',
  washrom: 'washroom',
  kitchn: 'kitchen',
  kitchin: 'kitchen',
  elec: 'electrical',
  electrc: 'electric',
  electrcity: 'electricity',
  maintanance: 'maintenance',
  maintanence: 'maintenance',
  maintenence: 'maintenance',
  urgnt: 'urgent',
  urgntly: 'urgently',
  asap: 'as soon as possible',
  immedatly: 'immediately',
  imediately: 'immediately',
  wrking: 'working',
  notwrking: 'not working',
  cloged: 'clogged',
  drane: 'drain',
  drainge: 'drainage',
  seprate: 'separate',
  damge: 'damage',
  damagd: 'damaged',
  brkn: 'broken',
  brokn: 'broken',
  gargbage: 'garbage',
  garbg: 'garbage',
  soceity: 'society',
  secrity: 'security',
  securty: 'security',
  mornng: 'morning',
  evng: 'evening',
  tomorow: 'tomorrow',
  tommorow: 'tomorrow',
  yestday: 'yesterday',
  yestrday: 'yesterday',
  prob: 'problem',
  problm: 'problem',
  issuee: 'issue',
  pipelin: 'pipeline',
  swtch: 'switch',
  swtchboard: 'switchboard',
  geysr: 'geyser',
  gyser: 'geyser',
};

const PRESERVED_ACRONYMS = new Set([
  'AC',
  'CCTV',
  'MCB',
  'LED',
  'UPS',
  'STP',
  'WTP',
  'DG',
  'AGM',
  'SLA',
  'RO',
  'BHK',
  'WiFi',
  'WIFI',
  'SMS',
  'OTP',
  'ID',
  'AM',
  'PM',
  'RWA',
  'EV',
]);

export function formatSmartText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText.trim();
  if (!cleaned) return '';

  cleaned = cleaned.replace(/[\r\t]+/g, ' ');
  cleaned = cleaned.replace(/ {2,}/g, ' ');

  cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1');
  cleaned = cleaned.replace(/([.,!?;:])(?=[^\s0-9.,!?;:])/g, '$1 ');

  cleaned = cleaned.replace(/!{2,}/g, '!');
  cleaned = cleaned.replace(/\?{2,}/g, '?');
  cleaned = cleaned.replace(/\.{4,}/g, '...');

  const words = cleaned.split(/\s+/);
  const correctedWords = words.map(word => {
    const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
    if (!match) return word;

    const prefix = match[1];
    const core = match[2];
    const suffix = match[3];

    const upperCore = core.toUpperCase();
    if (PRESERVED_ACRONYMS.has(upperCore)) {
      return prefix + upperCore + suffix;
    }

    const lowerCore = core.toLowerCase();
    if (COMMON_CORRECTIONS[lowerCore]) {
      const replacement = COMMON_CORRECTIONS[lowerCore];
      return prefix + replacement + suffix;
    }

    if (core.length > 1 && core === core.toUpperCase() && !PRESERVED_ACRONYMS.has(upperCore)) {
      return prefix + core.toLowerCase() + suffix;
    }

    if (!PRESERVED_ACRONYMS.has(upperCore)) {
      const mixedUpperCount = (core.match(/[A-Z]/g) || []).length;
      if (mixedUpperCount > 0 && mixedUpperCount < core.length) {
        return prefix + core.toLowerCase() + suffix;
      }
    }

    return word;
  });

  let reconstructed = correctedWords.join(' ');

  reconstructed = reconstructed.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_match, sep, char) => {
    return sep + char.toUpperCase();
  });

  if (!/[.!?]$/.test(reconstructed) && reconstructed.length > 5) {
    reconstructed += '.';
  }

  return reconstructed;
}

export function formatSmartTitle(rawTitle: string): string {
  if (!rawTitle || typeof rawTitle !== 'string') return '';

  let cleaned = formatSmartText(rawTitle);
  if (cleaned.endsWith('.')) {
    cleaned = cleaned.slice(0, -1);
  }

  const minorWords = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of']);
  const words = cleaned.split(/\s+/);

  const titleCased = words.map((w, idx) => {
    const match = w.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9'-]+)([^a-zA-Z0-9]*)$/);
    if (!match) return w;

    const prefix = match[1];
    const core = match[2];
    const suffix = match[3];

    const upperCore = core.toUpperCase();
    if (PRESERVED_ACRONYMS.has(upperCore)) {
      return prefix + upperCore + suffix;
    }

    const lowerCore = core.toLowerCase();
    if (idx !== 0 && idx !== words.length - 1 && minorWords.has(lowerCore)) {
      return prefix + lowerCore + suffix;
    }

    return prefix + lowerCore.charAt(0).toUpperCase() + lowerCore.slice(1) + suffix;
  });

  return titleCased.join(' ');
}
