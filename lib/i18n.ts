export type Lang = 'ta' | 'en';

export const strings = {
  // ---------- Navigation / common ----------
  dashboard:        { ta: 'டாஷ்போர்டு',      en: 'Dashboard' },
  customers:        { ta: 'வாடிக்கையாளர்கள்', en: 'Customers' },
  addCustomer:      { ta: 'புதிய வாடிக்கையாளர்', en: 'Add Customer' },
  addEntry:         { ta: 'பதிவு சேர்க்க',    en: 'Add Entry' },
  inventory:        { ta: 'கையிருப்பு',       en: 'Inventory' },
  reports:          { ta: 'அறிக்கைகள்',        en: 'Reports' },
  save:             { ta: 'சேமி',              en: 'Save' },
  cancel:           { ta: 'ரத்து',              en: 'Cancel' },
  edit:             { ta: 'திருத்து',          en: 'Edit' },
  delete:           { ta: 'நீக்கு',             en: 'Delete' },
  signOut:          { ta: 'வெளியேறு',          en: 'Sign out' },

  // ---------- Fields ----------
  code:             { ta: 'குறியீடு',          en: 'Code' },
  name:             { ta: 'பெயர்',             en: 'Name' },
  phone:            { ta: 'தொலைபேசி',          en: 'Phone' },
  whatsapp:         { ta: 'வாட்ஸ்அப்',         en: 'WhatsApp' },
  notes:            { ta: 'குறிப்பு',          en: 'Notes' },
  morning:          { ta: 'காலை',              en: 'Morning' },
  evening:          { ta: 'மாலை',              en: 'Evening' },
  litres:           { ta: 'லிட்டர்',           en: 'Litres' },
  advance:          { ta: 'முன்பணம்',          en: 'Advance' },
  biscuit:          { ta: 'பிஸ்கட்',           en: 'Biscuit' },
  thivanam:         { ta: 'தீவனம்',            en: 'Cattle feed' },
  qty:              { ta: 'அளவு',              en: 'Qty' },
  amount:           { ta: 'தொகை',              en: 'Amount' },
  rate:             { ta: 'விலை / லிட்டர்',    en: 'Rate / litre' },

  // ---------- Dashboard tiles ----------
  totalCustomers:   { ta: 'மொத்த வாடிக்கையாளர்கள்', en: 'Total customers' },
  todaysEntries:    { ta: 'இன்றைய பதிவுகள்',    en: "Today's entries" },
  todaysMilk:       { ta: 'இன்றைய மொத்த பால்',  en: "Today's milk total" },
  monthMilk:        { ta: 'இம்மாத பால்',        en: 'Monthly milk' },
  monthBiscuit:     { ta: 'இம்மாத பிஸ்கட்',     en: 'Monthly biscuit' },
  monthThivanam:    { ta: 'இம்மாத தீவனம்',     en: 'Monthly feed' },
  monthAdvance:     { ta: 'இம்மாத முன்பணம்',   en: 'Monthly advance' },

  // ---------- Reports ----------
  dailyReport:      { ta: 'தினசரி அறிக்கை',     en: 'Daily report' },
  monthlyReport:    { ta: 'மாதாந்திர அறிக்கை',  en: 'Monthly report' },
  generatePdf:      { ta: 'PDF உருவாக்கு',      en: 'Generate PDF' },
  generateExcel:    { ta: 'Excel உருவாக்கு',    en: 'Generate Excel' },
  sendWhatsapp:     { ta: 'வாட்ஸ்அப் அனுப்பு', en: 'Send WhatsApp' },
  callAll:          { ta: 'அனைவரையும் அழை',    en: 'Call All' },

  // ---------- Auth ----------
  email:            { ta: 'மின்னஞ்சல்',        en: 'Email' },
  password:         { ta: 'கடவுச்சொல்',        en: 'Password' },
  signIn:           { ta: 'உள்நுழை',            en: 'Sign in' },
  forgotPassword:   { ta: 'கடவுச்சொல் மறந்தீர்களா?', en: 'Forgot password?' },
  resetPassword:    { ta: 'கடவுச்சொல் மீட்டமை', en: 'Reset password' },
  sendResetLink:    { ta: 'மீட்டமை இணைப்பு அனுப்பு', en: 'Send reset link' },
  resetSent:        { ta: 'மீட்டமை இணைப்பு அனுப்பப்பட்டது! மின்னஞ்சல் சரிபாருங்கள்.', en: 'Reset link sent! Check your email.' },
  backToSignIn:     { ta: 'உள்நுழைவுக்கு திரும்பு', en: 'Back to sign in' },
  newPassword:      { ta: 'புதிய கடவுச்சொல்', en: 'New password' },
  updatePassword:   { ta: 'கடவுச்சொல் புதுப்பி', en: 'Update password' },

  // ---------- Profile ----------
  profile:          { ta: 'சுயவிவரம்',          en: 'Profile' },
  shopName:         { ta: 'கடை பெயர் (English)', en: 'Shop name (English)' },
  shopNameTa:       { ta: 'கடை பெயர் (Tamil)',   en: 'Shop name (Tamil)' },
  adminEmail:       { ta: 'நிர்வாக மின்னஞ்சல்',  en: 'Admin email' },
  defaultRate:      { ta: 'இயல்புநிலை விலை ₹/L', en: 'Default rate ₹/L' },
  profileSaved:     { ta: 'சுயவிவரம் சேமிக்கப்பட்டது!', en: 'Profile saved!' },

  // ---------- Voice ----------
  voiceEntry:       { ta: 'குரல் பதிவு',         en: 'Voice entry' },
  listening:        { ta: 'கேட்கிறது…',           en: 'Listening…' },
  voiceError:       { ta: 'குரல் அறியப்படவில்லை', en: 'Voice not recognised' },

  // ---------- Reports actions ----------
  morningSession:   { ta: 'காலை',                en: 'Morning' },
  eveningSession:   { ta: 'மாலை',                en: 'Evening' },
};

export const t = (key: keyof typeof strings, lang: Lang) =>
  strings[key]?.[lang] ?? key;

// ---------- WhatsApp / Voice templates ----------
export const whatsappTemplate = (
  lang: Lang,
  p: { name: string; litres: number; amount: number; balance: number }
) => {
  if (lang === 'ta') {
    return `வணக்கம் ${p.name}, இந்த மாதம் உங்கள் பால் மொத்தம் ${p.litres.toFixed(3)} லிட்டர், தொகை ₹${p.amount.toLocaleString('en-IN')}. உங்கள் மீதம் உள்ள தொகை ₹${p.balance.toLocaleString('en-IN')}. நன்றி – APS MILK CENTER 🥛`;
  }
  return `Hello ${p.name}, your total milk this month is ${p.litres.toFixed(3)} L, amount ₹${p.amount.toLocaleString('en-IN')}. Your remaining balance is ₹${p.balance.toLocaleString('en-IN')}. Thank you – APS MILK CENTER 🥛`;
};

export const voiceTemplate = (
  lang: Lang,
  p: { name: string; session: 'morning'|'evening'; litres: number }
) => {
  const sessionTa = p.session === 'morning' ? 'காலை' : 'மாலை';
  if (lang === 'ta') {
    return `வணக்கம் ${p.name}, இன்று ${sessionTa} உங்கள் பால் அளவு ${p.litres.toFixed(3)} லிட்டர். நன்றி.`;
  }
  return `Hello ${p.name}, today your ${p.session} milk quantity is ${p.litres.toFixed(3)} litres. Thank you.`;
};
