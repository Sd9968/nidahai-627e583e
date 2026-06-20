import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  // Nav
  "nav.home": "Home",
  "nav.features": "Features",
  "nav.how": "How It Works",
  "nav.benefits": "Benefits",
  "nav.pricing": "Pricing",
  "nav.contact": "Contact",
  "nav.cta": "Book a Demo",

  // Hero
  "hero.badge": "AI Voice Agent for Appointments",
  "hero.title.a": "AI Voice",
  "hero.title.b": "Scheduling,",
  "hero.title.c": "24/7.",
  "hero.subtitle":
    "Yaran.ai answers calls, understands your customers, and books, reschedules, or cancels appointments — anytime, in English or Arabic.",
  "hero.pill.available": "24/7 Available",
  "hero.pill.latency": "Under 500ms Latency",
  "hero.pill.languages": "English & العربية",
  "hero.pill.notify": "Instant Phone Notifications",
  "hero.cta.demo": "See It In Action",
  "hero.cta.book": "Book a Demo",

  // Phone mockup
  "phone.incoming": "Incoming call",
  "phone.listening": "Listening...",
  "phone.bubble1": "Hello! How can I help you today?",
  "phone.bubble2": "I'd like to book an appointment.",

  // Feature strip
  "fs.1.t": "24/7 Availability",
  "fs.1.d": "Always on, never misses a call.",
  "fs.2.t": "Under 500ms Latency",
  "fs.2.d": "Conversations that feel human.",
  "fs.3.t": "Smart Scheduling",
  "fs.3.d": "Book, modify, reschedule, cancel.",
  "fs.4.t": "Instant Notifications",
  "fs.4.d": "Confirm by phone after every call.",

  // How it works
  "how.eyebrow": "How it works",
  "how.title.a": "One phone line.",
  "how.title.b": "Four simple steps.",
  "how.1.t": "Customer Calls",
  "how.1.d": "A customer dials your number — anytime, any day.",
  "how.2.t": "AI Voice Agent Answers",
  "how.2.d": "Yaran.ai greets and understands them naturally.",
  "how.3.t": "Appointment Handled",
  "how.3.d": "Booked, modified, rescheduled, or cancelled in the call.",
  "how.4.t": "Notification Sent",
  "how.4.d": "Your team and the customer get an instant confirmation.",

  // Benefits
  "ben.eyebrow": "Benefits",
  "ben.title.a": "Save Time. Delight Customers.",
  "ben.title.b": "Grow More.",
  "ben.b1": "Reduce missed calls",
  "ben.b2": "Reduce no-shows with automated reminders",
  "ben.b3": "Improve customer experience",
  "ben.b4": "Scale appointment handling without hiring more staff",
  "ben.b5": "Support customers in English and Arabic",
  "ben.b6": "Customize the agent for your business workflow",
  "ben.m1.v": "24/7",
  "ben.m1.l": "Always Available",
  "ben.m2.v": "<500ms",
  "ben.m2.l": "Ultra-Low Latency",
  "ben.m3.v": "100%",
  "ben.m3.l": "Scheduling Workflow Coverage",
  "ben.m4.v": "∞",
  "ben.m4.l": "Scalable Call Handling",

  // Bilingual
  "bi.eyebrow": "Bilingual by design",
  "bi.title.a": "Built for English &",
  "bi.title.b": "Arabic",
  "bi.title.c": "conversations.",
  "bi.subtitle":
    "Yaran.ai can speak with customers naturally in English and Arabic. More languages can be added as your business grows.",
  "bi.en.quote": "“Book an appointment for tomorrow at 3 PM.”",
  "bi.ar.quote": "”أريد حجز موعد غداً الساعة ٣ مساءً.“",

  // Use cases
  "uc.eyebrow": "Use cases",
  "uc.title.a": "Made for any business",
  "uc.title.b": "that books by phone.",
  "uc.cta": "Don't see yours? Talk to us",
  "uc.1.t": "Clinics",
  "uc.1.d": "Book patient visits, send reminders, and free your front desk for in-person care.",
  "uc.2.t": "Salons",
  "uc.2.d": "Let clients book or change appointments any time without interrupting service.",
  "uc.3.t": "Dental Offices",
  "uc.3.d": "Handle check-ups, cleanings, and rescheduling without phone-tag.",
  "uc.4.t": "Consulting",
  "uc.4.d": "Qualify callers and put discovery calls straight on your calendar.",
  "uc.5.t": "Home Services",
  "uc.5.d": "Take service requests and dispatch slots while your team is on the job.",
  "uc.6.t": "Small Businesses",
  "uc.6.d": "A 24/7 receptionist that scales with your bookings, not your headcount.",

  // Final CTA
  "cta.title.a": "Ready to stop missing",
  "cta.title.b": "customer calls?",
  "cta.subtitle":
    "Let Yaran.ai handle appointment scheduling while your team focuses on the work that matters.",
  "cta.book": "Book a Demo",
  "cta.contact": "Contact Us",

  // Footer
  "footer.tagline": "Your 24/7 AI voice agent for smarter appointments.",
  "footer.col.product": "Product",
  "footer.col.company": "Company",
  "footer.col.support": "Support",
  "footer.l.features": "Features",
  "footer.l.how": "How It Works",
  "footer.l.pricing": "Pricing",
  "footer.l.languages": "Languages",
  "footer.l.about": "About",
  "footer.l.careers": "Careers",
  "footer.l.press": "Press",
  "footer.l.partners": "Partners",
  "footer.l.contact": "Contact",
  "footer.l.help": "Help Center",
  "footer.l.status": "Status",
  "footer.l.privacy": "Privacy",
  "footer.rights": "All rights reserved.",

  // Book a demo dialog
  "book.eyebrow": "Book a Demo",
  "book.title.a": "Let's talk",
  "book.title.b": "scheduling.",
  "book.subtitle": "Tell us about your business and we'll get back to you within one business day.",
  "book.f.name": "Full name",
  "book.f.company": "Company",
  "book.f.email": "Email",
  "book.f.phone": "Phone",
  "book.f.date": "Preferred date",
  "book.f.lang": "Preferred language",
  "book.f.message": "What would you like to discuss?",
  "book.lang.either": "Either",
  "book.cta.submit": "Send request",
  "book.cta.sending": "Sending...",
  "book.privacy": "We only use your details to reply to your request.",
  "book.err.required": "Please fill in all required fields.",
  "book.err.email": "Please enter a valid email address.",
  "book.err.generic": "Something went wrong. Please try again.",
  "book.success.title": "Request received.",
  "book.success.subtitle": "Thanks — we'll be in touch shortly to set up your demo.",
  "book.success.close": "Done",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.features": "المميزات",
  "nav.how": "كيف يعمل",
  "nav.benefits": "الفوائد",
  "nav.pricing": "الأسعار",
  "nav.contact": "تواصل معنا",
  "nav.cta": "احجز عرضاً تجريبياً",

  "hero.badge": "وكيل صوتي بالذكاء الاصطناعي للمواعيد",
  "hero.title.a": "جدولة صوتية",
  "hero.title.b": "بالذكاء الاصطناعي،",
  "hero.title.c": "على مدار الساعة.",
  "hero.subtitle":
    "يردّ Yaran.ai على المكالمات، ويفهم عملاءك، ويحجز أو يعدّل أو يلغي المواعيد في أي وقت، بالإنجليزية أو العربية.",
  "hero.pill.available": "متاح ٢٤/٧",
  "hero.pill.latency": "زمن استجابة أقل من ٥٠٠ مللي ثانية",
  "hero.pill.languages": "English & العربية",
  "hero.pill.notify": "إشعارات فورية عبر الهاتف",
  "hero.cta.demo": "شاهدها أثناء العمل",
  "hero.cta.book": "احجز عرضاً تجريبياً",

  "phone.incoming": "مكالمة واردة",
  "phone.listening": "يستمع...",
  "phone.bubble1": "مرحباً! كيف يمكنني مساعدتك اليوم؟",
  "phone.bubble2": "أود حجز موعد.",

  "fs.1.t": "متاح على مدار الساعة",
  "fs.1.d": "دائماً يعمل، لا يفوّت أي مكالمة.",
  "fs.2.t": "استجابة فورية",
  "fs.2.d": "محادثات بإحساس بشري طبيعي.",
  "fs.3.t": "جدولة ذكية",
  "fs.3.d": "حجز، تعديل، إعادة جدولة، إلغاء.",
  "fs.4.t": "إشعارات فورية",
  "fs.4.d": "تأكيد عبر الهاتف بعد كل مكالمة.",

  "how.eyebrow": "كيف يعمل",
  "how.title.a": "خط هاتف واحد.",
  "how.title.b": "أربع خطوات بسيطة.",
  "how.1.t": "يتصل العميل",
  "how.1.d": "يتصل العميل برقمك في أي وقت وأي يوم.",
  "how.2.t": "يرد الوكيل الصوتي",
  "how.2.d": "يرحب Yaran.ai بالعميل ويفهمه بشكل طبيعي.",
  "how.3.t": "يُعالج الموعد",
  "how.3.d": "يُحجز أو يُعدّل أو يُعاد جدولته أو يُلغى أثناء المكالمة.",
  "how.4.t": "إرسال الإشعار",
  "how.4.d": "يصل فريقك والعميل تأكيد فوري.",

  "ben.eyebrow": "الفوائد",
  "ben.title.a": "وفّر الوقت. أسعد العملاء.",
  "ben.title.b": "وسّع أعمالك.",
  "ben.b1": "تقليل المكالمات الفائتة",
  "ben.b2": "تقليل الغياب عبر التذكير الآلي",
  "ben.b3": "تحسين تجربة العملاء",
  "ben.b4": "توسيع إدارة المواعيد دون توظيف المزيد",
  "ben.b5": "دعم العملاء بالعربية والإنجليزية",
  "ben.b6": "تخصيص الوكيل ليناسب سير عمل شركتك",
  "ben.m1.v": "٢٤/٧",
  "ben.m1.l": "متاح دائماً",
  "ben.m2.v": "<٥٠٠م.ث",
  "ben.m2.l": "زمن استجابة فائق",
  "ben.m3.v": "١٠٠٪",
  "ben.m3.l": "تغطية كاملة لسير الجدولة",
  "ben.m4.v": "∞",
  "ben.m4.l": "قابلية توسع غير محدودة",

  "bi.eyebrow": "ثنائي اللغة بطبيعته",
  "bi.title.a": "مصمم لمحادثات",
  "bi.title.b": "العربية",
  "bi.title.c": "والإنجليزية.",
  "bi.subtitle":
    "يتحدث Yaran.ai مع العملاء بطلاقة بالعربية والإنجليزية. يمكن إضافة المزيد من اللغات مع نمو أعمالك.",
  "bi.en.quote": "“Book an appointment for tomorrow at 3 PM.”",
  "bi.ar.quote": "”أريد حجز موعد غداً الساعة ٣ مساءً.“",

  "uc.eyebrow": "حالات الاستخدام",
  "uc.title.a": "مصمم لأي عمل",
  "uc.title.b": "يعتمد على الحجز الهاتفي.",
  "uc.cta": "لا ترى مجالك؟ تحدث معنا",
  "uc.1.t": "العيادات",
  "uc.1.d": "حجز زيارات المرضى وإرسال التذكيرات وتفريغ موظفي الاستقبال للعناية المباشرة.",
  "uc.2.t": "الصالونات",
  "uc.2.d": "اسمح للعملاء بالحجز أو التغيير في أي وقت دون مقاطعة الخدمة.",
  "uc.3.t": "عيادات الأسنان",
  "uc.3.d": "إدارة الفحوصات والتنظيف وإعادة الجدولة دون عناء.",
  "uc.4.t": "الاستشارات",
  "uc.4.d": "تأهيل المتصلين وحجز مكالمات اكتشاف مباشرةً في تقويمك.",
  "uc.5.t": "الخدمات المنزلية",
  "uc.5.d": "استقبال الطلبات وحجز المواعيد بينما يعمل فريقك في الميدان.",
  "uc.6.t": "الأعمال الصغيرة",
  "uc.6.d": "موظف استقبال على مدار الساعة يتوسع مع حجوزاتك.",

  "cta.title.a": "هل أنت مستعد لإيقاف تفويت",
  "cta.title.b": "مكالمات العملاء؟",
  "cta.subtitle":
    "دع Yaran.ai يتولى جدولة المواعيد بينما يركّز فريقك على الأعمال الأهم.",
  "cta.book": "احجز عرضاً تجريبياً",
  "cta.contact": "تواصل معنا",

  "footer.tagline": "وكيلك الصوتي على مدار الساعة لمواعيد أذكى.",
  "footer.col.product": "المنتج",
  "footer.col.company": "الشركة",
  "footer.col.support": "الدعم",
  "footer.l.features": "المميزات",
  "footer.l.how": "كيف يعمل",
  "footer.l.pricing": "الأسعار",
  "footer.l.languages": "اللغات",
  "footer.l.about": "من نحن",
  "footer.l.careers": "الوظائف",
  "footer.l.press": "الإعلام",
  "footer.l.partners": "الشركاء",
  "footer.l.contact": "تواصل",
  "footer.l.help": "مركز المساعدة",
  "footer.l.status": "الحالة",
  "footer.l.privacy": "الخصوصية",
  "footer.rights": "جميع الحقوق محفوظة.",

  "book.eyebrow": "احجز عرضاً تجريبياً",
  "book.title.a": "لنتحدث عن",
  "book.title.b": "الجدولة.",
  "book.subtitle": "أخبرنا عن عملك وسنعاود التواصل معك خلال يوم عمل واحد.",
  "book.f.name": "الاسم الكامل",
  "book.f.company": "الشركة",
  "book.f.email": "البريد الإلكتروني",
  "book.f.phone": "رقم الهاتف",
  "book.f.date": "التاريخ المفضل",
  "book.f.lang": "اللغة المفضلة",
  "book.f.message": "ما الذي تود مناقشته؟",
  "book.lang.either": "كلاهما",
  "book.cta.submit": "إرسال الطلب",
  "book.cta.sending": "جاري الإرسال...",
  "book.privacy": "نستخدم بياناتك فقط للرد على طلبك.",
  "book.err.required": "يرجى ملء جميع الحقول المطلوبة.",
  "book.err.email": "يرجى إدخال بريد إلكتروني صالح.",
  "book.err.generic": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
  "book.success.title": "تم استلام طلبك.",
  "book.success.subtitle": "شكراً — سنتواصل معك قريباً لترتيب العرض التجريبي.",
  "book.success.close": "تم",
};

const dictionaries: Record<Locale, Dict> = { en, ar };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  isAr: boolean;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "kabsa-locale";

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Load saved preference on mount (client only)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "ar" || saved === "en") setLocaleState(saved);
    } catch {}
  }, []);

  // Sync <html> dir / lang and body font class
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.classList.toggle("font-arabic", locale === "ar");
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale];
    return {
      locale,
      setLocale,
      dir: locale === "ar" ? "rtl" : "ltr",
      isAr: locale === "ar",
      t: (key: string) => dict[key] ?? en[key] ?? key,
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Safe fallback during SSR / outside provider
    return {
      locale: "en" as Locale,
      setLocale: () => {},
      dir: "ltr" as const,
      isAr: false,
      t: (key: string) => en[key] ?? key,
    };
  }
  return ctx;
}
