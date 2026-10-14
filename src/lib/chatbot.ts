/**
 * Landing-page chatbot brain — deterministic V1 (free, zero-latency, no API key).
 * The message loop lives in the client; this module only decides WHAT the bot
 * says for a given history + input. AI upgrade hook: replace `reply()` with a
 * server call later without touching the UI.
 */

export type ChatLang = "en" | "ur" | "ar";

export interface ChatMessage {
  from: "bot" | "user";
  text: string;
  /** Structured restaurant results (rendered as cards). */
  restaurants?: { id: number; name: string; slug: string; city: string; online?: boolean }[];
}

type Dict = {
  welcome: string;
  askName: string;
  nice: (name: string) => string;
  askCountry: string;
  askCity: string;
  searching: (city: string) => string;
  foundHeading: (city: string, n: number) => string;
  noResults: (city: string) => string;
  viewMenu: string;
  pricing: string;
  trial: string;
  trialReply: string;
  pricingReply: string;
  whatsappReply: string;
  branchesReply: string;
  humanReply: string;
  thanksReply: string;
  fallback: string;
  anotherCity: string;
  countryChips: string[];
  footerChips: string[];
  onlineNow: string;
  onlineTag: string;
  offlineTag: string;
  askIntent: string;
  intentOwnerChip: string;
  intentCustomerChip: string;
  askPhone: string;
  phoneInvalid: string;
  leadThanks: (name: string) => string;
  skipChip: string;
  askRestaurant: string;
  niceRestaurant: (r: string, name: string) => string;
  trialAsk: string;
  trialYesChip: string;
  trialNoChip: string;
  goodbye: (name: string) => string;
  title: string;
  subtitle: string;
  inputPlaceholder: string;
  teaser: string;
};

const D: Record<ChatLang, Dict> = {
  en: {
    welcome: "Hi there! 👋",
    askName: "I'm the Kitchen POS assistant. What should I call you?",
    nice: (n) => `Nice to meet you, ${n}! 😊 Which country are you from?`,
    askCountry: "Which country are you from?",
    askCity: "Great! And which city? Type your city name 👇",
    searching: (c) => `Looking up restaurants in ${c}… 🔍`,
    foundHeading: (c, n) => `Awesome — ${n} restaurant${n === 1 ? "" : "s"} on Kitchen POS in ${c}! Tap any to see its live menu 🍔👇`,
    noResults: (c) =>
      `Hmm, no restaurants are listed in ${c} yet 😅 But YOUR restaurant could be the first one there! Want me to show you how?`,
    viewMenu: "View menu",
    onlineTag: "Online",
    offlineTag: "Offline",
    askIntent: "Quick one — are you a restaurant owner or a hungry customer? 😄",
    intentOwnerChip: "I'm a restaurant owner 🏪",
    intentCustomerChip: "I'm a customer 🍔",
    askPhone:
      "Great! Now share your WhatsApp number so our team can help you set up (or type 'skip'):",
    phoneInvalid:
      "Hmm, that doesn't look like a valid number — include your country code, e.g. +92 300 1234567 🙂",
    leadThanks: (n) =>
      `All set, ${n}! 🎉 Our team will WhatsApp you soon. Meanwhile, tap below and start your free trial right now — takes 5 minutes:`,
    skipChip: "Skip",
    askRestaurant: "Awesome! What's your restaurant's name? 🏪",
    niceRestaurant: (r, n) => `"${r}" — great name! 😊 Which city/area is it located in?`,
    trialAsk: "One last thing — want a FREE trial? 🎉",
    trialYesChip: "Yes, start my free trial 🎉",
    trialNoChip: "Not now, thanks",
    goodbye: (n) => `Thank you, ${n}! 🙌 Our team will contact you shortly. Have a great day!`,
    pricing: "Pricing",
    trial: "Start free trial",
    trialReply:
      "🎉 You can start right now — free trial, no card needed. Tap the button below, create your shop and you'll be taking orders in about 5 minutes!",
    pricingReply:
      "💳 Very simple: free trial first, then one affordable monthly plan — NO commission on any order, ever. Menu items, staff accounts and branches grow with you. Full details are on this page under Pricing 👇",
    whatsappReply:
      "💬 Yes! The WhatsApp add-on sends automatic daily sales reports to the owner's WhatsApp AND lets you thank customers with one tap. It's an optional add-on you can switch on from Settings.",
    branchesReply:
      "🏪 Multi-branch is built in! One master account controls every branch — same login, one billing. Each branch gets its own menu, staff and reports.",
    humanReply:
      "🙋 Absolutely — message us any time on Facebook: facebook.com/prokitchenpos — a real human replies, usually the same day.",
    thanksReply: "You're most welcome! 🙌 Anything else you'd like to know?",
    fallback:
      "I can help with: restaurants near you 🍔, pricing 💳, free trial 🎉, WhatsApp add-on 💬 and multi-branch 🏪. What would you like?",
    anotherCity: "Try another city",
    countryChips: ["Pakistan", "UAE", "UK", "USA", "Other"],
    footerChips: ["Pricing", "Start free trial", "Try another city", "Talk to a human"],
    onlineNow: "Online now",
    title: "Kitchen POS Assistant",
    subtitle: "Ask me anything",
    inputPlaceholder: "Type your message…",
    teaser: "Hi! Need help? 👋",
  },
  ur: {
    welcome: "السلام علیکم! 👋",
    askName: "میں کچن POS اسسٹنٹ ہوں۔ آپ کو کیا نام سے پکاروں؟",
    nice: (n) => `${n}، آپ سے مل کر خوشی ہوئی! 😊 آپ کن ملک سے ہیں؟`,
    askCountry: "آپ کن ملک سے ہیں؟",
    askCity: "بہت اچھے! اور کون سا شہر؟ اپنا شہر لکھیں 👇",
    searching: (c) => `${c} میں ریستوران تلاش کیا جا رہا ہے… 🔍`,
    foundHeading: (c, n) => `زبردست — ${c} میں ${n} ریستوران کچن POS پر موجود! مینیو دیکھنے کے لیے کلک کریں 🍔👇`,
    noResults: (c) =>
      `${c} میں ابھی کوئی ریستوران لسٹ نہیں 😅 لیکن آپ کا ریستوران وہاں پہلا ہو سکتا ہے! بتاؤں کیسے؟`,
    viewMenu: "مینیو دیکھیں",
    onlineTag: "آن لائن",
    offlineTag: "آف لائن",
    askIntent: "ایک بات — آپ ریستوران کے مالک ہیں یا گاہک؟ 😄",
    intentOwnerChip: "میں ریستوران کا مالک ہوں 🏪",
    intentCustomerChip: "میں گاہک ہوں 🍔",
    askPhone:
      "بہت اچھے! اب اپنا WhatsApp نمبر بتا دیں تاکہ ہماری ٹیم سیٹ اپ میں مدد کرے (یا 'skip' لکھیں):",
    phoneInvalid:
      "یہ نمبر درست نہیں لگ رہا — کنٹری کوڈ کے ساتھ لکھیں، مثلاً +92 300 1234567 🙂",
    leadThanks: (n) =>
      `${n}، سب تیار! 🎉 ہماری ٹیم جلد WhatsApp کرے گی۔ اس دوران نیچے بٹن دبا کر مفت ٹرائل شروع کریں — صرف 5 منٹ:`,
    skipChip: "چھوڑ دیں",
    askRestaurant: "زبردست! آپ کے ریستوران کا نام کیا ہے؟ 🏪",
    niceRestaurant: (r, n) => `"${r}" — پیارا نام! 😊 یہ کس شہر/علاقے میں واقع ہے؟`,
    trialAsk: "آخری بات — کیا آپ مفت ٹرائل چاہتے ہیں؟ 🎉",
    trialYesChip: "جی ہاں، مفت ٹرائل شروع کریں 🎉",
    trialNoChip: "ابھی نہیں، شکریہ",
    goodbye: (n) => `${n}، شکریہ! 🙌 ہماری ٹیم بہت جلد آپ سے رابطہ کرے گی۔ اپنا خیال رکھیے!`,
    pricing: "قیمتیں",
    trial: "مفت ٹرائل شروع کریں",
    trialReply:
      "🎉 ابھی شروع کریں — مفت ٹرائل، کارڈ کی ضرورت نہیں۔ نیچے بٹن دبائیں، دکان بنائیں اور 5 منٹ میں آرڈر لینا شروع کریں!",
    pricingReply:
      "💳 انتہائی سادہ: پہلے مفت ٹرائل، پھر ایک سستا ماہانہ پلان — کسی بھی آرڈر پر کمیشن نہیں! تفصیل اسی صفحے پر Pricing میں ہے 👇",
    whatsappReply:
      "💬 جی ہاں! WhatsApp ایڈ-آن مالک کو روزانہ سیلز رپورٹ خودکار بھیجتا ہے اور کسٹمر کو THANK YOU میسج ایک ٹیپ میں۔ Settings سے آن کریں۔",
    branchesReply:
      "🏪 ملٹی برانچ بلٹ اِن ہے! ایک ماسٹر اکاؤنٹ ہر برانچ کنٹرول کرتا ہے — ایک لاگ اِن، ایک بلنگ۔",
    humanReply:
      "🙋 بالکل — فیس بک پر میسج کریں: facebook.com/prokitchenpos — انسان ہی جواب دیتا ہے، عام طور پر اسی دن۔",
    thanksReply: "آپ کی خوش آمدید! 🙌 کچھ اور پوچھنا ہے؟",
    fallback:
      "میں یہ بتا سکتا ہوں: قریبی ریستوران 🍔، قیمتیں 💳، مفت ٹرائل 🎉، WhatsApp ایڈ-آن 💬 اور ملٹی برانچ 🏪۔ کیا جاننا چاہیں گے؟",
    anotherCity: "دوسرا شہر دیکھیں",
    countryChips: ["پاکستان", "یو اے ای", "برطانیہ", "امریکہ", "کوئی اور"],
    footerChips: ["قیمتیں", "مفت ٹرائل", "دوسرا شہر", "انسان سے بات"],
    onlineNow: "ابھی آن لائن",
    title: "کچن POS اسسٹنٹ",
    subtitle: "کچھ بھی پوچھیں",
    inputPlaceholder: "پیغام لکھیں…",
    teaser: "سلام! مدد چاہیے؟ 👋",
  },
  ar: {
    welcome: "مرحباً بك! 👋",
    askName: "أنا مساعد مطبخ POS. بأي اسم أناديك؟",
    nice: (n) => `تشرفت بك يا ${n}! 😊 من أي دولة أنت؟`,
    askCountry: "من أي دولة أنت؟",
    askCity: "رائع! وأي مدينة؟ اكتب اسم مدينتك 👇",
    searching: (c) => `جاري البحث عن مطاعم في ${c}… 🔍`,
    foundHeading: (c, n) => `ممتاز — ${n} مطعم على Kitchen POS في ${c}! اضغط على أيٍّ منها لمشاهدة القائمة المباشرة 🍔👇`,
    noResults: (c) =>
      `لا توجد مطاعم مدرجة في ${c} بعد 😅 لكن مطعمك يمكن أن يكون الأول! أتريد أن أريك كيف؟`,
    viewMenu: "عرض القائمة",
    onlineTag: "متصل",
    offlineTag: "غير متصل",
    askIntent: "سؤال سريع — هل أنت صاحب مطعم أم عميل جائع؟ 😄",
    intentOwnerChip: "أنا صاحب مطعم 🏪",
    intentCustomerChip: "أنا عميل 🍔",
    askPhone:
      "رائع! شارك رقم الواتساب الخاص بك ليساعدك فريقنا في الإعداد (أو اكتب 'skip'):",
    phoneInvalid:
      "يبدو أن هذا الرقم غير صحيح — اكتبه مع رمز الدولة، مثل: +92 300 1234567 🙂",
    leadThanks: (n) =>
      `تم كل شيء يا ${n}! 🎉 سيتواصل معك فريقنا عبر واتساب قريباً. وفي هذه الأثناء اضغط الزر وابدأ تجربتك المجانية الآن — 5 دقائق فقط:`,
    skipChip: "تخطّي",
    askRestaurant: "رائع! ما اسم مطعمك؟ 🏪",
    niceRestaurant: (r, n) => `"${r}" — اسم جميل! 😊 في أي مدينة/منطقة يقع؟`,
    trialAsk: "آخر شيء — هل تريد تجربة مجانية؟ 🎉",
    trialYesChip: "نعم، ابدأ التجربة المجانية 🎉",
    trialNoChip: "ليس الآن، شكراً",
    goodbye: (n) => `شكراً لك يا ${n}! 🙌 سيتواصل معك فريقنا قريباً. نتمنى لك يوماً سعيداً!`,
    pricing: "الأسعار",
    trial: "ابدأ التجربة المجانية",
    trialReply:
      "🎉 يمكنك البدء الآن — تجربة مجانية، بدون بطاقة. اضغط الزر أدناه، أنشئ متجرك وستستقبل الطلبات خلال 5 دقائق تقريباً!",
    pricingReply:
      "💳 بكل بساطة: تجربة مجانية أولاً، ثم خطة شهرية واحدة رخيصة — بلا عمولة على أي طلب، أبداً. التفاصيل الكاملة في قسم الأسعار في هذه الصفحة 👇",
    whatsappReply:
      "💬 نعم! إضافة واتساب ترسل تقرير مبيعات يومي تلقائي إلى واتساب المالك، وتتيح شكر العميل بنقرة واحدة. فعّلها من الإعدادات.",
    branchesReply:
      "🏪 الفروع المتعددة مدمجة! حساب رئيسي واحد يتحكم في كل الفروع — دخول واحد، فاتورة واحدة.",
    humanReply:
      "🙋 بالطبع — راسلنا على فيسبوك: facebook.com/prokitchenpos — إنسان حقيقي يرد عادةً في اليوم نفسه.",
    thanksReply: "على الرحب والسعة! 🙌 هل تود معرفة شيء آخر؟",
    fallback:
      "يمكنني المساعدة في: المطاعم القريبة 🍔، الأسعار 💳، التجربة المجانية 🎉، إضافة واتساب 💬 والفروع المتعددة 🏪. ماذا تريد؟",
    anotherCity: "جرب مدينة أخرى",
    countryChips: ["باكستان", "الإمارات", "بريطانيا", "أمريكا", "أخرى"],
    footerChips: ["الأسعار", "التجربة المجانية", "مدينة أخرى", "التحدث إلى شخص"],
    onlineNow: "متصل الآن",
    title: "مساعد Kitchen POS",
    subtitle: "اسألني أي شيء",
    inputPlaceholder: "اكتب رسالتك…",
    teaser: "أهلاً! تحتاج مساعدة؟ 👋",
  },
};

export const chatDict = D;

/** Where in the conversation we are (kept client-side, derived from history). */
export type ChatStep = "name" | "intent" | "restaurant" | "country" | "city" | "phone" | "trial" | "free";

const OWNER_RE = /(owner|business|restaurant|cafe|hotel|مالک|صاحب|مالك|مطعم|دکان|ریستوران)/i;
const CUSTOMER_RE = /(customer|hungry|eat|گاہک|خریدار|عميل|جائع|کھانا)/i;
const SKIP_RE = /^(skip|چھوڑ دیں|تخطّي|no|نہیں|لا)$/i;
const NO_RE = /^(no|nope|not now|نہیں|لا|ابھی نہیں|ليس الآن)/i;
const YES_RE = /(yes|yeah|yup|sure|ok|han|haan|جی|ہاں|نعم|ايوه|start|trial|ٹریل|تجربة)/i;
const PHONEISH = /^[+()\d][\d\s().-]{5,22}$/;

const PRICEISH = /(price|pricing|cost|fee|payment|plan|قیمت|قیمتیں|سست|پلان|رس|سعر|أسعار|خطة)/i;
const TRIALISH = /(trial|start|signup|sign ?up|free|ٹریل|شروع|تجربة|مجان)/i;
const WHATSAPPI = /(whatsapp|وٹس|واٹس|واتساب)/i;
const BRANCHI = /(branch|branches|برانچ|شاخ|فرع)/i;
const HUMANI = /(human|contact|support|help|رابط|مدد سے|انسان|دعم|شخص)/i;
const THANKS = /(thank|شکریہ|thx|شكرًا|شكرا)/i;
const ANOTHER_CITY = /(another city|دوسرا شہر|مدينة أخرى)/i;

const CITY_TO_COUNTRY_CHIP: Record<string, string> = {
  Pakistan: "PK", "UAE": "AE", "UK": "GB", "GB": "GB", "USA": "US", "US": "US",
  "Saudi Arabia": "SA", "Saudi": "SA", "India": "IN", "Bangladesh": "BD",
  "پاکستان": "PK", "یو اے ای": "AE", "برطانیہ": "GB", "امریکہ": "US",
  "باكستان": "PK", "الإمارات": "AE", "بريطانيا": "GB", "أمريكا": "US",
};

export function countryToIso(input: string): string | "" {
  const t = input.trim();
  if (CITY_TO_COUNTRY_CHIP[t]) return CITY_TO_COUNTRY_CHIP[t];
  for (const [k, v] of Object.entries(CITY_TO_COUNTRY_CHIP)) {
    if (t.toLowerCase().startsWith(k.toLowerCase()) || k.toLowerCase().startsWith(t.toLowerCase())) return v;
  }
  return "";
}

export function sanitizeName(raw: string, maxLen = 24): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}\s.'-]/gu, "").trim().slice(0, maxLen);
  return cleaned || "friend";
}

/** Returns the assistant message(s) for a user message + step. */
export function botReply(
  lang: ChatLang,
  step: ChatStep,
  userText: string,
  name: string,
  kind: "owner" | "customer" | null = null,
): { messages: ChatMessage[]; next: ChatStep; wantCity?: string; doneSearch?: boolean; validPhone?: string; restaurant?: string } {
  const d = D[lang];
  const text = userText.trim();
  const low = text.toLowerCase();

  if (step === "name") {
    const n = sanitizeName(text);
    return {
      messages: [{ from: "bot", text: d.nice(n) }, { from: "bot", text: d.askIntent }],
      next: "intent",
    };
  }
  if (step === "intent") {
    if (OWNER_RE.test(text) && !CUSTOMER_RE.test(text)) {
      return { messages: [{ from: "bot", text: d.askRestaurant }], next: "restaurant" };
    }
    return { messages: [{ from: "bot", text: d.askCountry }], next: "country" };
  }
  if (step === "restaurant") {
    const r = text.slice(0, 40);
    return { messages: [{ from: "bot", text: d.niceRestaurant(r, name || "friend") }], next: "city", restaurant: r };
  }
  if (step === "phone") {
    if (SKIP_RE.test(low)) return { messages: [{ from: "bot", text: d.goodbye(name || "friend") }], next: "free" };
    if (!PHONEISH.test(text)) return { messages: [{ from: "bot", text: d.phoneInvalid }], next: "phone" };
    // Valid number — stored as the lead. Ask about the free trial next; the
    // conversation ENDS right after their answer (no customer-style chips).
    return { messages: [{ from: "bot", text: d.leadThanks(name || "friend") }, { from: "bot", text: d.trialAsk }], next: "trial", validPhone: text };
  }
  if (step === "trial") {
    if (YES_RE.test(low) && !NO_RE.test(low)) {
      return { messages: [{ from: "bot", text: d.trialReply }], next: "free" };
    }
    return { messages: [{ from: "bot", text: d.goodbye(name || "friend") }], next: "free" };
  }
  if (step === "country") {
    return { messages: [{ from: "bot", text: D[lang].askCity }], next: "city" };
  }
  if (step === "city") {
    if (kind === "owner") {
      return { messages: [{ from: "bot", text: d.askPhone }], next: "phone" };
    }
    return {
      messages: [{ from: "bot", text: d.searching(text) }],
      next: "free",
      wantCity: text,
    };
  }

  // free-talk intents
  if (ANOTHER_CITY.test(low)) return { messages: [{ from: "bot", text: d.askCity }], next: "city" };
  if (PRICEISH.test(low)) return { messages: [{ from: "bot", text: d.pricingReply }], next: "free" };
  if (WHATSAPPI.test(low)) return { messages: [{ from: "bot", text: d.whatsappReply }], next: "free" };
  if (BRANCHI.test(low)) return { messages: [{ from: "bot", text: d.branchesReply }], next: "free" };
  if (TRIALISH.test(low)) return { messages: [{ from: "bot", text: d.trialReply }], next: "free" };
  if (HUMANI.test(low)) return { messages: [{ from: "bot", text: d.humanReply }], next: "free" };
  if (THANKS.test(low)) return { messages: [{ from: "bot", text: d.thanksReply }], next: "free" };
  if (/^(hi|hello|salam|assalam|hey)/i.test(low) && name) {
    return { messages: [{ from: "bot", text: `${d.welcome} ${name}!` }, { from: "bot", text: d.fallback }], next: "free" };
  }
  return { messages: [{ from: "bot", text: d.fallback }], next: "free" };
}

/** Opening sequence for first open. */
export function openingMessages(lang: ChatLang): ChatMessage[] {
  return [
    { from: "bot", text: D[lang].welcome },
    { from: "bot", text: D[lang].askName },
  ];
}

/** After restaurant results, proactively offer the phone step too. */
export function afterResultsMessages(lang: ChatLang): ChatMessage[] {
  return [{ from: "bot", text: D[lang].askPhone }];
}
