import React, { Dispatch, FC, ReactNode, SetStateAction, createContext, useContext, useState } from "react";
export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  rateToUSD: number; // exchange rate relative to 1 USD
  timezones: string[];
}

export const GLOBAL_COUNTRIES: CountryOption[] = [
  { code: "ALL", name: "Global (All Countries)", flag: "🌐", currencyCode: "USD", currencySymbol: "$", rateToUSD: 1.0, timezones: ["UTC"] },
  { code: "US", name: "United States", flag: "🇺🇸", currencyCode: "USD", currencySymbol: "$", rateToUSD: 1.0, timezones: ["EST", "CST", "PST"] },
  { code: "IN", name: "India", flag: "🇮🇳", currencyCode: "INR", currencySymbol: "₹", rateToUSD: 86.5, timezones: ["IST"] },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪", currencyCode: "AED", currencySymbol: "AED ", rateToUSD: 3.67, timezones: ["GST"] },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧", currencyCode: "GBP", currencySymbol: "£", rateToUSD: 0.78, timezones: ["GMT", "BST"] },
  { code: "EU", name: "European Union (Germany/France/Spain)", flag: "🇪🇺", currencyCode: "EUR", currencySymbol: "€", rateToUSD: 0.92, timezones: ["CET"] },
  { code: "CA", name: "Canada", flag: "🇨🇦", currencyCode: "CAD", currencySymbol: "CA$", rateToUSD: 1.38, timezones: ["EST", "PST"] },
  { code: "SG", name: "Singapore", flag: "🇸🇬", currencyCode: "SGD", currencySymbol: "S$", rateToUSD: 1.34, timezones: ["SGT"] },
  { code: "AU", name: "Australia", flag: "🇦🇺", currencyCode: "AUD", currencySymbol: "A$", rateToUSD: 1.52, timezones: ["AEST"] },
];

export interface MarketplaceFilters {
  selectedCountry: string; // country code or ALL
  targetCurrency: string; // USD, INR, EUR, etc.
  visaSponsorshipOnly: boolean;
  workMode: "ALL" | "Remote" | "Hybrid" | "Onsite";
}

interface GlobalMarketplaceContextType {
  filters: MarketplaceFilters;
  setFilters: React.Dispatch<React.SetStateAction<MarketplaceFilters>>;
  formatCurrency: (amountInUSD: number | string, customCurrency?: string) => string;
  convertFromUSD: (amountInUSD: number, customCurrency?: string) => number;
  currentCountry: CountryOption;
}

const GlobalMarketplaceContext = createContext<GlobalMarketplaceContextType>({
  filters: {
    selectedCountry: "ALL",
    targetCurrency: "USD",
    visaSponsorshipOnly: false,
    workMode: "ALL",
  },
  setFilters: () => {},
  formatCurrency: (amount) => `$${amount}`,
  convertFromUSD: (amount) => Number(amount),
  currentCountry: GLOBAL_COUNTRIES[0],
});

export const GlobalMarketplaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    selectedCountry: "ALL",
    targetCurrency: "USD",
    visaSponsorshipOnly: false,
    workMode: "ALL",
  });

  const currentCountry = GLOBAL_COUNTRIES.find((c) => c.code === filters.selectedCountry) || GLOBAL_COUNTRIES[0];

  const convertFromUSD = (amountInUSD: number, customCurrency?: string): number => {
    const currency = customCurrency || filters.targetCurrency;
    const country = GLOBAL_COUNTRIES.find((c) => c.currencyCode === currency) || GLOBAL_COUNTRIES[0];
    return Math.round(amountInUSD * country.rateToUSD);
  };

  const formatCurrency = (amountInUSD: number | string, customCurrency?: string): string => {
    const numericUSD = typeof amountInUSD === "string" ? parseFloat(amountInUSD.replace(/[^0-9.]/g, "")) : amountInUSD;
    if (isNaN(numericUSD)) return String(amountInUSD);

    const currency = customCurrency || filters.targetCurrency;
    const country = GLOBAL_COUNTRIES.find((c) => c.currencyCode === currency) || GLOBAL_COUNTRIES[0];
    const converted = Math.round(numericUSD * country.rateToUSD);

    return `${country.currencySymbol}${converted.toLocaleString("en-US")} ${country.currencyCode}`;
  };

  return (
    <GlobalMarketplaceContext.Provider
      value={{
        filters,
        setFilters,
        formatCurrency,
        convertFromUSD,
        currentCountry,
      }}
    >
      {children}
    </GlobalMarketplaceContext.Provider>
  );
};

export const useGlobalMarketplace = () => useContext(GlobalMarketplaceContext);
