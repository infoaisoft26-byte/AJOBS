export type SupportedLanguage = "en" | "hi" | "mr";

export const candidateTranslations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    // Nav
    home: "Home",
    findJobs: "Find Jobs",
    myApplications: "My Applications",
    resume: "Resume",
    interviews: "Interviews",
    savedJobs: "Saved Jobs",
    notifications: "Notifications",
    profile: "Profile",
    help: "Help",
    logout: "Logout",
    
    // Safety
    safetyNotice: "AIJobs does not charge candidates for job applications or placement.",

    // Dashboard & Search
    welcome: "Welcome",
    searchPlaceholderTitle: "Job title or skill (e.g., Software Engineer, React)",
    searchPlaceholderLocation: "Location (e.g., Mumbai, Remote)",
    searchBtn: "Search Jobs",
    
    // Quick Filters
    freshers: "Freshers",
    wfh: "Work From Home",
    remote: "Remote",
    fullTime: "Full Time",
    partTime: "Part Time",

    // Home Sections
    recommendedJobs: "Recommended Jobs",
    latestJobs: "Latest Jobs",
    recentlyPosted: "Recently Posted Jobs",
    applicationStatus: "Application Status",
    upcomingInterviews: "Upcoming Interviews",
    profileCompletion: "Profile Completion",
    resumeStatus: "Resume Status",

    // Card Actions
    viewJob: "View Job",
    applyNow: "Apply Now",
    saveJob: "Save",
    saved: "Saved",

    // Apply Modal
    confirmApplyTitle: "Confirm Job Application",
    resumeBeingUsed: "Resume being used",
    mobileNumber: "Mobile Number",
    email: "Email",
    confirmAndApply: "Confirm & Apply",
    missingResumeMsg: "Please upload your resume to apply.",
    uploadResume: "Upload Resume",
    applicationSubmitted: "Application submitted successfully.",
    viewAppStatus: "View Application Status",
    findMoreJobs: "Find More Jobs",

    // Simplified AI Terminology
    profileSuggestions: "Profile Suggestions",
    careerSuggestions: "Career Suggestions",
    jobMatch: "Job Match",
    resumeScore: "Resume Score",
    applicationReview: "Application Review",

    // Application Statuses
    applied: "Applied",
    underReview: "Under Review",
    shortlisted: "Shortlisted",
    interview: "Interview",
    selected: "Selected",
    offer: "Offer",
    joined: "Joined",
    rejected: "Rejected",

    // General
    saveChanges: "Save Changes",
    contactSupport: "Contact Support",
    faq: "Frequently Asked Questions",
    lastUpdated: "Last Updated"
  },
  hi: {
    // Nav
    home: "होम",
    findJobs: "नौकरी खोजें",
    myApplications: "मेरे आवेदन",
    resume: "रेज़्युमे",
    interviews: "साक्षात्कार",
    savedJobs: "सेव की गई नौकरियां",
    notifications: "सूचनाएं",
    profile: "प्रोफाइल",
    help: "सहायता",
    logout: "लॉगआउट",

    // Safety
    safetyNotice: "AIJobs नौकरी आवेदन या प्लेसमेंट के लिए उम्मीदवारों से कोई शुल्क नहीं लेता है।",

    // Dashboard & Search
    welcome: "स्वागत है",
    searchPlaceholderTitle: "नौकरी का पद या कौशल (उदा. सॉफ्टवेयर डेवलपर)",
    searchPlaceholderLocation: "स्थान (उदा. मुंबई, वर्क फ्रॉम होम)",
    searchBtn: "नौकरी खोजें",

    // Quick Filters
    freshers: "फ्रेशर्स",
    wfh: "वर्क फ्रॉम होम",
    remote: "रिमोट",
    fullTime: "फुल टाइम",
    partTime: "पार्ट टाइम",

    // Home Sections
    recommendedJobs: "अनुशंसित नौकरियां",
    latestJobs: "नवीनतम नौकरियां",
    recentlyPosted: "हाल ही में पोस्ट की गई नौकरियां",
    applicationStatus: "आवेदन की स्थिति",
    upcomingInterviews: "आगामी साक्षात्कार",
    profileCompletion: "प्रोफाइल पूर्णता",
    resumeStatus: "रेज़्युमे की स्थिति",

    // Card Actions
    viewJob: "विवरण देखें",
    applyNow: "आवेदन करें",
    saveJob: "सेव करें",
    saved: "सेव किया गया",

    // Apply Modal
    confirmApplyTitle: "नौकरी आवेदन की पुष्टि करें",
    resumeBeingUsed: "उपयोग किया जा रहा रेज़्युमे",
    mobileNumber: "मोबाइल नंबर",
    email: "ईमेल",
    confirmAndApply: "पुष्टि करें और आवेदन करें",
    missingResumeMsg: "आवेदन करने के लिए कृपया अपना रेज़्युमे अपलोड करें।",
    uploadResume: "रेज़्युमे अपलोड करें",
    applicationSubmitted: "आवेदन सफलतापूर्वक जमा कर दिया गया है।",
    viewAppStatus: "आवेदन स्थिति देखें",
    findMoreJobs: "और नौकरियां खोजें",

    // Simplified AI Terminology
    profileSuggestions: "प्रोफाइल सुझाव",
    careerSuggestions: "करियर सुझाव",
    jobMatch: "नौकरी मिलान",
    resumeScore: "रेज़्युमे स्कोर",
    applicationReview: "आवेदन समीक्षा",

    // Application Statuses
    applied: "आवेदन किया गया",
    underReview: "समीक्षा के अधीन",
    shortlisted: "शॉर्टलिस्ट किया गया",
    interview: "साक्षात्कार",
    selected: "चयनित",
    offer: "ऑफर",
    joined: "शामिल हुए",
    rejected: "अस्वीकृत",

    // General
    saveChanges: "बदलाव सहेजें",
    contactSupport: "सहायता संपर्क",
    faq: "अक्सर पूछे जाने वाले प्रश्न",
    lastUpdated: "अंतिम बार अपडेट किया गया"
  },
  mr: {
    // Nav
    home: "होम",
    findJobs: "नोकरी शोधा",
    myApplications: "माझे अर्ज",
    resume: "रेझ्युमे",
    interviews: "मुलाखती",
    savedJobs: "जतन केलेल्या नोकऱ्या",
    notifications: "सूचना",
    profile: "प्रोफाईल",
    help: "मदत",
    logout: "लॉगआउट",

    // Safety
    safetyNotice: "AIJobs नोकरीचे अर्ज किंवा प्लेसमेंटसाठी उमेदवारांकडून कोणतेही शुल्क घेत नाही.",

    // Dashboard & Search
    welcome: "स्वागत आहे",
    searchPlaceholderTitle: "नोकरीचे नाव किंवा कौशल्य (उदा. सॉफ्टवेअर इंजिनिअर)",
    searchPlaceholderLocation: "ठिकाण (उदा. मुंबई, वर्क फ्रॉम होम)",
    searchBtn: "नोकरी शोधा",

    // Quick Filters
    freshers: "फ्रेशर्स",
    wfh: "वर्क फ्रॉम होम",
    remote: "रिमोट",
    fullTime: "फुल टाईम",
    partTime: "पार्ट टाईम",

    // Home Sections
    recommendedJobs: "शिफारस केलेल्या नोकऱ्या",
    latestJobs: "नवीनतम नोकऱ्या",
    recentlyPosted: "अलीकडेच पोस्ट केलेल्या नोकऱ्या",
    applicationStatus: "अर्जाची स्थिती",
    upcomingInterviews: "येणाऱ्या मुलाखती",
    profileCompletion: "प्रोफाईल पूर्णता",
    resumeStatus: "रेझ्युमे स्थिती",

    // Card Actions
    viewJob: "तपशील पहा",
    applyNow: "अर्ज करा",
    saveJob: "जतन करा",
    saved: "जतन केले",

    // Apply Modal
    confirmApplyTitle: "नोकरी अर्जाची पुष्टी करा",
    resumeBeingUsed: "वापरला जाणारा रेझ्युमे",
    mobileNumber: "मोबाईल नंबर",
    email: "ईमेल",
    confirmAndApply: "पुष्टी करा आणि अर्ज करा",
    missingResumeMsg: "अर्ज करण्यासाठी कृपया तुमचा रेझ्युमे अपलोड करा.",
    uploadResume: "रेझ्युमे अपलोड करा",
    applicationSubmitted: "अर्ज यशस्वीरीत्या सबमिट झाला आहे.",
    viewAppStatus: "अर्जाची स्थिती पहा",
    findMoreJobs: "अणखी नोकऱ्या शोधा",

    // Simplified AI Terminology
    profileSuggestions: "प्रोफाईल सूचना",
    careerSuggestions: "करिअर सूचना",
    jobMatch: "नोकरी मॅच",
    resumeScore: "रेझ्युमे स्कोर",
    applicationReview: "अर्ज पुनरावलोकन",

    // Application Statuses
    applied: "अर्ज केला",
    underReview: "पुनरावलोकनाधीन",
    shortlisted: "शॉर्टलिस्ट केले",
    interview: "मुलाखत",
    selected: "निवड झाली",
    offer: "ऑफर",
    joined: "रुजू झाले",
    rejected: "नाकारले",

    // General
    saveChanges: "बदल जतन करा",
    contactSupport: "मदत केंद्र",
    faq: "सतत विचारले जाणारे प्रश्न",
    lastUpdated: "शेवटचे अपडेट"
  }
};

export function getTranslation(lang: SupportedLanguage, key: string): string {
  return candidateTranslations[lang]?.[key] || candidateTranslations.en[key] || key;
}
