import React, { FC, ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Currency, Filter, Home, Search, Video } from "lucide-react";
export type SupportedLanguage = "en" | "hi" | "ar" | "fr" | "de" | "es";

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "hi", name: "हिंदी (Hindi)", flag: "🇮🇳", dir: "ltr" },
  { code: "ar", name: "العربية (Arabic)", flag: "🇦🇪", dir: "rtl" },
  { code: "fr", name: "Français (French)", flag: "🇫🇷", dir: "ltr" },
  { code: "de", name: "Deutsch (German)", flag: "🇩🇪", dir: "ltr" },
  { code: "es", name: "Español (Spanish)", flag: "🇪🇸", dir: "ltr" },
];

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    "nav.home": "Home",
    "nav.jobs": "Find Jobs",
    "nav.ai_interview": "AI Interview",
    "nav.companies": "Companies",
    "nav.pricing": "Pricing",
    "nav.dashboard": "Dashboard",
    "nav.career_coach": "Career Coach",
    "nav.hiring_agent": "AI Hiring Agent",
    "nav.documents": "HR Documents",
    "nav.video_interview": "Video Center",
    "nav.compliance": "Compliance & GDPR",
    "nav.analytics": "Analytics & BI",
    "nav.jd_generator": "JD Generator",
    "common.login": "Sign In",
    "common.register": "Get Started",
    "common.logout": "Logout",
    "common.apply": "Apply Now",
    "common.search": "Search Jobs",
    "common.filter": "Filters",
    "common.currency": "Currency",
    "common.country": "Country",
    "common.visa_sponsorship": "Visa Sponsorship",
    "common.remote": "Remote",
    "common.hybrid": "Hybrid",
    "common.onsite": "Onsite",
    "dashboard.welcome": "Welcome back",
    "dashboard.ai_matches": "AI Candidate Matches",
    "dashboard.posted_jobs": "Active Job Postings",
  },
  hi: {
    "nav.home": "मुख्य पृष्ठ",
    "nav.jobs": "नौकरियां खोजें",
    "nav.ai_interview": "एआई साक्षात्कार",
    "nav.companies": "कंपनियां",
    "nav.pricing": "मूल्य निर्धारण",
    "nav.dashboard": "डैशबोर्ड",
    "nav.career_coach": "करियर कोच",
    "nav.hiring_agent": "एआई हायरिंग एजेंट",
    "nav.documents": "एचआर दस्तावेज",
    "nav.video_interview": "वीडियो साक्षात्कार",
    "nav.compliance": "अनुपालन (GDPR)",
    "nav.analytics": "विश्लेषण और बीआई",
    "nav.jd_generator": "जेडी जनरेटर",
    "common.login": "साइन इन",
    "common.register": "शुरू करें",
    "common.logout": "लॉग आउट",
    "common.apply": "आवेदन करें",
    "common.search": "खोजें",
    "common.filter": "फिल्टर",
    "common.currency": "मुद्रा",
    "common.country": "देश",
    "common.visa_sponsorship": "वीजा प्रायोजन",
    "common.remote": "रिमोट",
    "common.hybrid": "हाइब्रिड",
    "common.onsite": "ऑनसाइट",
    "dashboard.welcome": "वापसी पर आपका स्वागत है",
    "dashboard.ai_matches": "एआई उम्मीदवार मैच",
    "dashboard.posted_jobs": "सक्रिय नौकरी पोस्टिंग",
  },
  ar: {
    "nav.home": "الرئيسية",
    "nav.jobs": "البحث عن وظائف",
    "nav.ai_interview": "مقابلة الذكاء الاصطناعي",
    "nav.companies": "الشركات",
    "nav.pricing": "الأسعار",
    "nav.dashboard": "لوحة التحكم",
    "nav.career_coach": "مدرب المهنة",
    "nav.hiring_agent": "وكيل التوظيف الذكي",
    "nav.documents": "وثائق الموارد البشرية",
    "nav.video_interview": "مركز الفيديو",
    "nav.compliance": "الامتثال والخصوصية",
    "nav.analytics": "التحليلات وذكاء الأعمال",
    "nav.jd_generator": "مولد الوصف الوظيفي",
    "common.login": "تسجيل الدخول",
    "common.register": "ابدأ الآن",
    "common.logout": "تسجيل الخروج",
    "common.apply": "قدّم الآن",
    "common.search": "بحث عن وظائف",
    "common.filter": "تصفية",
    "common.currency": "العملة",
    "common.country": "الدولة",
    "common.visa_sponsorship": "رعاية التأشيرة",
    "common.remote": "عن بُعد",
    "common.hybrid": "هجين",
    "common.onsite": "في الموقع",
    "dashboard.welcome": "مرحباً بك مجدداً",
    "dashboard.ai_matches": "مطابقات المترشحين",
    "dashboard.posted_jobs": "الوظائف المعروضة",
  },
  fr: {
    "nav.home": "Accueil",
    "nav.jobs": "Trouver des emplois",
    "nav.ai_interview": "Entretien IA",
    "nav.companies": "Entreprises",
    "nav.pricing": "Tarifs",
    "nav.dashboard": "Tableau de bord",
    "nav.career_coach": "Coach de carrière",
    "nav.hiring_agent": "Agent de recrutement IA",
    "nav.documents": "Documents RH",
    "nav.video_interview": "Centre vidéo",
    "nav.compliance": "Conformité RGPD",
    "nav.analytics": "Analytique & BI",
    "nav.jd_generator": "Générateur de fiche de poste",
    "common.login": "Se connecter",
    "common.register": "Commencer",
    "common.logout": "Déconnexion",
    "common.apply": "Postuler",
    "common.search": "Rechercher",
    "common.filter": "Filtres",
    "common.currency": "Devise",
    "common.country": "Pays",
    "common.visa_sponsorship": "Sponsor de visa",
    "common.remote": "Télétravail",
    "common.hybrid": "Hybride",
    "common.onsite": "Sur site",
    "dashboard.welcome": "Bienvenue",
    "dashboard.ai_matches": "Candidats correspondants IA",
    "dashboard.posted_jobs": "Offres d'emploi actives",
  },
  de: {
    "nav.home": "Startseite",
    "nav.jobs": "Jobs finden",
    "nav.ai_interview": "KI-Interview",
    "nav.companies": "Unternehmen",
    "nav.pricing": "Preise",
    "nav.dashboard": "Dashboard",
    "nav.career_coach": "Karriere-Coach",
    "nav.hiring_agent": "KI-Rekrutierungsagent",
    "nav.documents": "HR-Dokumente",
    "nav.video_interview": "Video-Zentrum",
    "nav.compliance": "Compliance & DSGVO",
    "nav.analytics": "Analytik & BI",
    "nav.jd_generator": "Stellenbeschreibungs-Generator",
    "common.login": "Anmelden",
    "common.register": "Jetzt starten",
    "common.logout": "Abmelden",
    "common.apply": "Jetzt bewerben",
    "common.search": "Suchen",
    "common.filter": "Filter",
    "common.currency": "Währung",
    "common.country": "Land",
    "common.visa_sponsorship": "Visum-Sponsoring",
    "common.remote": "Remote",
    "common.hybrid": "Hybrid",
    "common.onsite": "Vor Ort",
    "dashboard.welcome": "Willkommen zurück",
    "dashboard.ai_matches": "KI-Kandidaten-Treffer",
    "dashboard.posted_jobs": "Aktive Stellenangebote",
  },
  es: {
    "nav.home": "Inicio",
    "nav.jobs": "Buscar empleos",
    "nav.ai_interview": "Entrevista IA",
    "nav.companies": "Empresas",
    "nav.pricing": "Precios",
    "nav.dashboard": "Panel de control",
    "nav.career_coach": "Coach de carrera",
    "nav.hiring_agent": "Agente de selección IA",
    "nav.documents": "Documentos RRHH",
    "nav.video_interview": "Centro de video",
    "nav.compliance": "Cumplimiento RGPD",
    "nav.analytics": "Analítica y BI",
    "nav.jd_generator": "Generador de descripción",
    "common.login": "Iniciar sesión",
    "common.register": "Comenzar",
    "common.logout": "Cerrar sesión",
    "common.apply": "Postularme",
    "common.search": "Buscar empleos",
    "common.filter": "Filtros",
    "common.currency": "Moneda",
    "common.country": "País",
    "common.visa_sponsorship": "Patrocinio de visa",
    "common.remote": "Remoto",
    "common.hybrid": "Híbrido",
    "common.onsite": "Presencial",
    "dashboard.welcome": "Bienvenido de nuevo",
    "dashboard.ai_matches": "Coincidencias de candidatos IA",
    "dashboard.posted_jobs": "Ofertas laborales activas",
  },
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
  currentLangInfo: LanguageInfo;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key, fallback) => fallback || key,
  currentLangInfo: SUPPORTED_LANGUAGES[0],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const saved = localStorage.getItem("aijobs_lang");
    return (saved as SupportedLanguage) || "en";
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem("aijobs_lang", lang);
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
    document.documentElement.dir = langInfo.dir;
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    const langInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];
    document.documentElement.dir = langInfo.dir;
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS["en"]?.[key] || fallback || key;
  };

  const currentLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentLangInfo }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
