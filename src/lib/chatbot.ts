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
export type ChatStep = "name" | "country" | "city" | "free";

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
): { messages: ChatMessage[]; next: ChatStep; wantCity?: string; doneSearch?: boolean } {
  const d = D[lang];
  const text = userText.trim();
  const low = text.toLowerCase();

  if (step === "name") {
    const n = sanitizeName(text);
    return { messages: [{ from: "bot", text: d.nice(n) }], next: "country" };
  }
  if (step === "country") {
    return { messages: [{ from: "bot", text: D[lang].askCity }], next: "city" };
  }
  if (step === "city") {
    return { messages: [{ from: "bot", text: d.searching(text) }], next: "free", wantCity: text };
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
