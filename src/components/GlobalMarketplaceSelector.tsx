import {
  DollarSign,
  Globe,
  MapPin,
  ShieldCheck
} from "lucide-react";
import { useLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from "../context/LanguageContext";
import { useGlobalMarketplace, GLOBAL_COUNTRIES } from "../context/GlobalMarketplaceContext";

export function LanguageSelector() {
  const { language, setLanguage, currentLangInfo } = useLanguage();

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center space-x-1.5 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 font-mono">
        <Globe className="w-3.5 h-3.5 text-blue-400" />
        <span className="hidden sm:inline">{currentLangInfo.flag}</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
          className="bg-transparent text-white focus:outline-none cursor-pointer text-xs font-sans"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-neutral-900 text-white">
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function GlobalMarketplaceFilterBar() {
  const { filters, setFilters } = useGlobalMarketplace();
  const { t } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-3 bg-neutral-900/90 border border-white/10 rounded-xl p-3 shadow-lg backdrop-blur-md">
      {/* Country Selector */}
      <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <span className="font-semibold">{t("common.country", "Country")}:</span>
        <select
          value={filters.selectedCountry}
          onChange={(e) => {
            const countryCode = e.target.value;
            const countryObj = GLOBAL_COUNTRIES.find((c) => c.code === countryCode);
            setFilters((prev) => ({
              ...prev,
              selectedCountry: countryCode,
              targetCurrency: countryObj ? countryObj.currencyCode : prev.targetCurrency,
            }));
          }}
          className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
        >
          {GLOBAL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Currency Selector */}
      <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200">
        <DollarSign className="w-4 h-4 text-cyan-400" />
        <span className="font-semibold">{t("common.currency", "Currency")}:</span>
        <select
          value={filters.targetCurrency}
          onChange={(e) => setFilters((prev) => ({ ...prev, targetCurrency: e.target.value }))}
          className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
        >
          {GLOBAL_COUNTRIES.map((c) => (
            <option key={c.currencyCode} value={c.currencyCode} className="bg-neutral-900 text-white">
              {c.currencySymbol} ({c.currencyCode})
            </option>
          ))}
        </select>
      </div>

      {/* Work Mode Filter */}
      <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200">
        <span className="font-semibold">Work Mode:</span>
        <select
          value={filters.workMode}
          onChange={(e) => setFilters((prev) => ({ ...prev, workMode: e.target.value as any }))}
          className="bg-transparent text-white focus:outline-none cursor-pointer font-mono"
        >
          <option value="ALL" className="bg-neutral-900">All Modes</option>
          <option value="Remote" className="bg-neutral-900">🌐 Remote</option>
          <option value="Hybrid" className="bg-neutral-900">🏢 Hybrid</option>
          <option value="Onsite" className="bg-neutral-900">📍 Onsite</option>
        </select>
      </div>

      {/* Visa Sponsorship Toggle */}
      <label className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-200 cursor-pointer hover:bg-white/5 transition-colors">
        <input
          type="checkbox"
          checked={filters.visaSponsorshipOnly}
          onChange={(e) => setFilters((prev) => ({ ...prev, visaSponsorshipOnly: e.target.checked }))}
          className="rounded border-gray-600 bg-neutral-800 text-blue-500 focus:ring-blue-500"
        />
        <ShieldCheck className="w-4 h-4 text-indigo-400" />
        <span className="font-semibold">{t("common.visa_sponsorship", "Visa Sponsorship Only")}</span>
      </label>
    </div>
  );
}
