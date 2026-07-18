import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Briefcase, SlidersHorizontal, ChevronDown, Check, X, Building2 } from "lucide-react";

interface JobSearchEngineProps {
  onSearchChange: (filters: {
    query: string;
    locations: string[];
    industries: string[];
    jobTypes: string[];
  }) => void;
  availableLocations?: string[];
  availableIndustries?: string[];
  availableJobTypes?: string[];
}

export default function JobSearchEngine({
  onSearchChange,
  availableLocations = ["Bengaluru", "Remote", "Delhi NCR", "Pune", "Mumbai", "Hyderabad", "Chennai", "San Francisco"],
  availableIndustries = ["IT & Software", "FinTech", "Healthcare", "EdTech", "E-commerce", "DeepTech", "AI Services"],
  availableJobTypes = ["Full-time", "Part-time", "Contract", "Internship"]
}: JobSearchEngineProps) {
  const [query, setQuery] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);

  // Dropdown open states
  const [locOpen, setLocOpen] = useState(false);
  const [indOpen, setIndOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);

  // Refs for outside click cleanups
  const locRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locRef.current && !locRef.current.contains(event.target as Node)) {
        setLocOpen(false);
      }
      if (indRef.current && !indRef.current.contains(event.target as Node)) {
        setIndOpen(false);
      }
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setTypeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debouncing effect for real-time Firestore queries
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      onSearchChange({
        query: query.trim(),
        locations: selectedLocations,
        industries: selectedIndustries,
        jobTypes: selectedJobTypes
      });
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [query, selectedLocations, selectedIndustries, selectedJobTypes, onSearchChange]);

  const toggleLocation = (loc: string) => {
    setSelectedLocations(prev =>
      prev.includes(loc) ? prev.filter(l => l !== loc) : [...prev, loc]
    );
  };

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const toggleJobType = (type: string) => {
    setSelectedJobTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearAllFilters = () => {
    setQuery("");
    setSelectedLocations([]);
    setSelectedIndustries([]);
    setSelectedJobTypes([]);
  };

  const hasActiveFilters = query.trim() !== "" || selectedLocations.length > 0 || selectedIndustries.length > 0 || selectedJobTypes.length > 0;

  return (
    <div className="glass p-5 rounded-2xl border border-white/5 bg-[#07070c] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-bold font-mono">
          <SlidersHorizontal className="w-4 h-4" />
          <span>REAL-TIME AI SEARCH INDEXER</span>
        </div>
        {hasActiveFilters && (
          <button 
            onClick={clearAllFilters}
            className="text-[10px] text-gray-400 hover:text-indigo-400 underline cursor-pointer"
          >
            Clear Search & Filters
          </button>
        )}
      </div>

      {/* Real-time search query input */}
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query jobs by title, company name, required skills, or key specifications..."
          className="w-full bg-[#101018] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Multi-Select Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Multi-Select 1: Location */}
        <div className="relative" ref={locRef}>
          <button
            type="button"
            onClick={() => setLocOpen(!locOpen)}
            className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-left text-white flex items-center justify-between hover:border-white/20 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                {selectedLocations.length === 0
                  ? "Select Locations"
                  : `${selectedLocations.length} Locations Selected`}
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${locOpen ? "rotate-180" : ""}`} />
          </button>

          {locOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-[#0e0e16] border border-white/10 rounded-xl py-1 shadow-2xl animate-in fade-in slide-in-from-top-1">
              <div className="max-h-52 overflow-y-auto">
                {availableLocations.map((loc) => {
                  const isChecked = selectedLocations.includes(loc);
                  return (
                    <label
                      key={loc}
                      onClick={() => toggleLocation(loc)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-indigo-600 border-indigo-600 text-white" 
                          : "border-white/10 bg-black/40"
                      }`}>
                        {isChecked && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>{loc}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Select 2: Industry */}
        <div className="relative" ref={indRef}>
          <button
            type="button"
            onClick={() => setIndOpen(!indOpen)}
            className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-left text-white flex items-center justify-between hover:border-white/20 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <span>
                {selectedIndustries.length === 0
                  ? "Select Industries"
                  : `${selectedIndustries.length} Industries Selected`}
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${indOpen ? "rotate-180" : ""}`} />
          </button>

          {indOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-[#0e0e16] border border-white/10 rounded-xl py-1 shadow-2xl animate-in fade-in slide-in-from-top-1">
              <div className="max-h-52 overflow-y-auto">
                {availableIndustries.map((ind) => {
                  const isChecked = selectedIndustries.includes(ind);
                  return (
                    <label
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-purple-600 border-purple-600 text-white" 
                          : "border-white/10 bg-black/40"
                      }`}>
                        {isChecked && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>{ind}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Multi-Select 3: Job Type */}
        <div className="relative" ref={typeRef}>
          <button
            type="button"
            onClick={() => setTypeOpen(!typeOpen)}
            className="w-full bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-left text-white flex items-center justify-between hover:border-white/20 transition-all cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Briefcase className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>
                {selectedJobTypes.length === 0
                  ? "Select Job Types"
                  : `${selectedJobTypes.length} Types Selected`}
              </span>
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
          </button>

          {typeOpen && (
            <div className="absolute z-30 mt-1.5 w-full bg-[#0e0e16] border border-white/10 rounded-xl py-1 shadow-2xl animate-in fade-in slide-in-from-top-1">
              <div className="max-h-52 overflow-y-auto">
                {availableJobTypes.map((type) => {
                  const isChecked = selectedJobTypes.includes(type);
                  return (
                    <label
                      key={type}
                      onClick={() => toggleJobType(type)}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-pink-600 border-pink-600 text-white" 
                          : "border-white/10 bg-black/40"
                      }`}>
                        {isChecked && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>{type}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Filter Tags/Pills Container */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5 text-[10px]">
          {selectedLocations.map(loc => (
            <span key={loc} className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/15 rounded-lg px-2 py-0.5 flex items-center gap-1">
              <span>📍 {loc}</span>
              <button onClick={() => toggleLocation(loc)} className="hover:text-white font-black">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {selectedIndustries.map(ind => (
            <span key={ind} className="bg-purple-500/10 text-purple-300 border border-purple-500/15 rounded-lg px-2 py-0.5 flex items-center gap-1">
              <span>🏢 {ind}</span>
              <button onClick={() => toggleIndustry(ind)} className="hover:text-white font-black">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {selectedJobTypes.map(type => (
            <span key={type} className="bg-pink-500/10 text-pink-300 border border-pink-500/15 rounded-lg px-2 py-0.5 flex items-center gap-1">
              <span>💼 {type}</span>
              <button onClick={() => toggleJobType(type)} className="hover:text-white font-black">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
