import { useState, useEffect } from "react";
import { 
  X, ShieldCheck, Mail, Phone, Clock, MessageSquare, AlertCircle, HelpCircle, 
  MapPin, Heart, Compass, Eye, Shield, Users, Trophy, Award, Landmark, 
  Share2, ArrowRight, Star, FileText, Send, Download, BookOpen, Sparkles, 
  Search, CheckCircle, Flame, DollarSign, Upload, Plus, Play, ExternalLink
} from "lucide-react";
import { db, auth } from "../firebase";
import { collection, getDocs, setDoc, doc, addDoc } from "firebase/firestore";

interface CompanySectionProps {
  pageType: string;
  onClose: () => void;
  setActiveCompanyPage?: (page: string) => void;
}

export default function CompanySection({ pageType, onClose, setActiveCompanyPage }: CompanySectionProps) {
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Firestore Data States
  const [companySettings, setCompanySettings] = useState<any>({
    companyName: "AIJobs",
    brandName: "AIJobs",
    address: "AIJobs, Juhi Corp Park, Vasai West, Mumbai, Maharashtra – 401202, India",
    supportEmail: "infoaisoft26@gmail.com",
    salesEmail: "sales@aijobs.in",
    phone: "+91 9324773994",
    whatsapp: "+91 9324773994",
    businessHours: "Monday – Friday: 09:00 AM – 06:00 PM IST",
    aboutTitle: "About AIJobs",
    aboutSubtitle: "India's AI-Powered Recruitment Platform",
    aboutDescription: "AIJobs is an AI-powered recruitment platform connecting talented candidates with trusted recruiters, companies, and consultancies across India. Our mission is to simplify hiring using artificial intelligence, smart job matching, AI interviews, and an easy application process.",
    mission: "To make hiring faster, smarter, and transparent for everyone.",
    vision: "To become India's most trusted AI recruitment platform.",
    values: "Trust, Innovation, Transparency, Speed, Customer Success"
  });

  const [socialLinks, setSocialLinks] = useState<any>({
    facebook: "https://facebook.com/aijobs",
    instagram: "https://instagram.com/aijobs",
    linkedin: "https://linkedin.com/company/aijobs",
    youtube: "https://youtube.com/aijobs",
    twitter: "https://twitter.com/aijobs",
    telegram: "https://t.me/aijobs",
    whatsapp: "https://wa.me/919324773994"
  });

  const [faqList, setFaqList] = useState<any[]>([]);
  const [blogList, setBlogList] = useState<any[]>([]);
  const [activeBlog, setActiveBlog] = useState<any | null>(null);
  const [ticketSearchId, setTicketSearchId] = useState("");
  const [trackedTicket, setTrackedTicket] = useState<any | null>(null);

  // Form States
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [ticketForm, setTicketForm] = useState({ subject: "", category: "Payments", priority: "Medium", description: "" });
  const [careerApplyForm, setCareerApplyForm] = useState({ name: "", email: "", phone: "", resumeUrl: "", coverLetter: "" });

  useEffect(() => {
    fetchCompanyData();
  }, [pageType]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Company Settings
      const settingsSnap = await getDocs(collection(db, "settings"));
      if (!settingsSnap.empty) {
        settingsSnap.forEach(d => {
          if (d.id === "company_info") setCompanySettings(d.data());
        });
      } else {
        await setDoc(doc(db, "settings", "company_info"), companySettings);
      }

      // 2. Fetch Social Links
      const socialsSnap = await getDocs(collection(db, "social_links"));
      if (!socialsSnap.empty) {
        socialsSnap.forEach(d => {
          if (d.id === "global_socials") setSocialLinks(d.data());
        });
      } else {
        await setDoc(doc(db, "social_links", "global_socials"), socialLinks);
      }

      // 3. Fetch FAQs
      const faqsSnap = await getDocs(collection(db, "faqs"));
      const faqs: any[] = [];
      faqsSnap.forEach(d => faqs.push({ id: d.id, ...d.data() }));
      
      if (faqs.length === 0) {
        const seedFaqs = [
          { category: "Candidate", q: "How does the AI Resume Evaluation work?", a: "AIJobs scans your resume using advanced semantic intelligence and matches your skill points with real recruiter parameters to generate an objective ATS score out of 100." },
          { category: "Candidate", q: "Are the AI Mock Interviews graded?", a: "Yes, our interactive interview emulator records and grades your audio transcriptions, providing immediate constructive feedback and verified performance badges." },
          { category: "Recruiter", q: "Can I assign candidates to specific consultancies?", a: "Yes, using our CRM module, enterprises can assign candidate queues to certified recruitment consultancy agencies." },
          { category: "Consultancy", q: "What limits apply to the bulk Excel upload?", a: "You can upload up to 500 candidate rows at once. The validation engine requires a valid email and at least one technical skill per candidate row." },
          { category: "Payments", q: "How are recurring billing subscriptions canceled?", a: "Subscriptions can be canceled on-demand directly from your billing dashboard. Access remains active until the current billing cycle expires." }
        ];
        for (const item of seedFaqs) {
          const id = "faq_" + Math.random().toString(36).substr(2, 9);
          await setDoc(doc(db, "faqs", id), { id, ...item });
          faqs.push({ id, ...item });
        }
      }
      setFaqList(faqs);

      // 4. Fetch Blogs
      const blogsSnap = await getDocs(collection(db, "blogs"));
      const blogs: any[] = [];
      blogsSnap.forEach(d => blogs.push({ id: d.id, ...d.data() }));

      if (blogs.length === 0) {
        const seedBlogs = [
          {
            title: "Scaling Engineering Sourcing with Semantic AI Search",
            category: "AI Hiring",
            summary: "Explore how deep semantic embedding engines eliminate traditional boolean queries for technical recruiters.",
            content: "Boolean search is dead. Traditional matching based solely on exact string matches often fails to identify high-potential candidates who use slightly different keywords. Using semantic AI, recruiters can now search for 'Full Stack SDE with cloud scaling experience' and automatically retrieve profiles containing AWS, Kubernetes, and Next.js. This reduces overall screening time by up to 80% while dramatically improving match quality.",
            createdAt: new Date().toISOString(),
            author: "Dr. Anirudh Sen, Chief AI Architect",
            readTime: "5 min read",
            coverImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80"
          },
          {
            title: "Cracking the AI-Led Technical Interview Arena",
            category: "Career Advice",
            summary: "A comprehensive developer's guide to passing automated semantic coding assessments.",
            content: "Automated interviews can feel intimidating, but they follow highly structured evaluation patterns. To excel, candidate developers should focus on: first, explaining their architectural choices clearly; second, describing edge cases for their algorithms; and third, matching the core job skills explicitly in their spoken explanations. Our AI assessment pipeline is designed to look for these conceptual indicators alongside raw code accuracy.",
            createdAt: new Date().toISOString(),
            author: "Pragati Verma, Senior HR Tech Lead",
            readTime: "4 min read",
            coverImage: "https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=600&q=80"
          }
        ];
        for (const item of seedBlogs) {
          const id = "blog_" + Math.random().toString(36).substr(2, 9);
          await setDoc(doc(db, "blogs", id), { id, ...item });
          blogs.push({ id, ...item });
        }
      }
      setBlogList(blogs);

    } catch (err) {
      console.error("Error fetching company section datasets:", err);
    } finally {
      setLoading(false);
    }
  };

  // Submit Contact Form
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) return;
    try {
      const msgId = "msg_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "contact_messages", msgId), {
        id: msgId,
        ...contactForm,
        createdAt: new Date().toISOString()
      });
      setFeedbackMsg("✓ Your message has been sent successfully. Our support desk will reach out shortly!");
      setContactForm({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to dispatch your contact inquiry.");
    }
  };

  // Submit Support Ticket Form
  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.subject || !ticketForm.description) return;
    try {
      const ticketId = "TIC-" + Math.floor(100000 + Math.random() * 900000);
      const ticketPayload = {
        id: ticketId,
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description,
        status: "OPEN",
        userEmail: auth.currentUser?.email || "guest-support@aijobs.com",
        userName: auth.currentUser?.displayName || "Guest Visitor",
        createdAt: new Date().toISOString(),
        comments: []
      };

      await setDoc(doc(db, "support_tickets", ticketId), ticketPayload);
      
      // Also register into general support collection to make it visible to administrative workspace
      await setDoc(doc(db, "support", ticketId), ticketPayload);

      setFeedbackMsg(`✓ Support Ticket raised successfully! Ticket ID: ${ticketId}. Store this safely to track progress.`);
      setTicketForm({ subject: "", category: "Payments", priority: "Medium", description: "" });
      setTimeout(() => setFeedbackMsg(""), 7000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to raise support ticket.");
    }
  };

  // Track Ticket Status
  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSearchId.trim()) return;
    setTrackedTicket(null);
    setErrorMsg("");
    try {
      const ticketsSnap = await getDocs(collection(db, "support_tickets"));
      let found: any = null;
      ticketsSnap.forEach(d => {
        if (d.id.toLowerCase() === ticketSearchId.trim().toLowerCase()) {
          found = d.data();
        }
      });
      if (found) {
        setTrackedTicket(found);
      } else {
        setErrorMsg("No matching support ticket found. Please verify the ticket ID.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error searching for support ticket.");
    }
  };

  // Career Application Submit
  const handleCareerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerApplyForm.name || !careerApplyForm.email || !careerApplyForm.phone) return;
    try {
      const applyId = "apply_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "career_applications", applyId), {
        id: applyId,
        ...careerApplyForm,
        appliedAt: new Date().toISOString()
      });
      setFeedbackMsg("✓ Application received! Our People Operations team will contact you if your qualifications match.");
      setCareerApplyForm({ name: "", email: "", phone: "", resumeUrl: "", coverLetter: "" });
      setTimeout(() => setFeedbackMsg(""), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#020204]/90 backdrop-blur-md z-[9999] flex items-center justify-center text-xs font-mono text-indigo-400">
        <Sparkles className="w-6 h-6 animate-spin mb-2 text-indigo-500 mr-2" />
        <span>Syncing company content from Firebase...</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#020204]/95 backdrop-blur-lg overflow-y-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-5xl bg-[#09090e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Dynamic Page Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-950/20 to-purple-950/20">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide uppercase font-sans flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <FileText className="w-5 h-5" />
              </span>
              <span>
                {pageType === "about" ? "About Our Company" : 
                 pageType === "contact" ? "Contact Support & Sales" : 
                 pageType === "faq" ? "Knowledge Base & FAQs" : 
                 pageType === "report" ? "Report a Problem & Raises" : 
                 pageType === "blog" ? "Engineering Blogs CMS" : 
                 pageType === "careers" ? "Careers at AIJobs" : 
                 pageType === "press" ? "Press & Brand Assets" : 
                 pageType === "help" ? "Product Help Center" : "Enterprise policy Document"}
              </span>
            </h2>
            <p className="text-[10px] text-gray-400 font-mono tracking-wider mt-1 uppercase">
              {companySettings.brandName} Portal • Secure Ingress Active
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer border border-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Feedback Panel */}
        {feedbackMsg && (
          <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Container */}
        <div className="p-6 md:p-8 overflow-y-auto flex-1 text-xs sm:text-sm text-gray-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent">
          
          {/* ================================== ABOUT US PAGE ================================== */}
          {pageType === "about" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Mission and values banner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start bg-white/5 p-6 rounded-2xl border border-white/5">
                <div className="space-y-3">
                  <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">About Us</span>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">{companySettings.aboutTitle || "About AIJobs"}</h3>
                  <h4 className="text-xs text-indigo-300 font-semibold">{companySettings.aboutSubtitle || "India's AI-Powered Recruitment Platform"}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    {companySettings.aboutDescription || "AIJobs is an AI-powered recruitment platform connecting talented candidates with trusted recruiters, companies, and consultancies across India. Our mission is to simplify hiring using artificial intelligence, smart job matching, AI interviews, and an easy application process."}
                  </p>
                </div>
                
                <div className="space-y-4 font-mono text-xs">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                    <span className="text-indigo-400 font-bold uppercase tracking-wider block text-[10px]">Our Mission</span>
                    <p className="text-gray-300 text-xs font-sans leading-normal">
                      {companySettings.mission || "To make hiring faster, smarter, and transparent for everyone."}
                    </p>
                  </div>
                  
                  <div className="bg-neutral-950 p-4 rounded-xl border border-white/5 space-y-1">
                    <span className="text-pink-400 font-bold uppercase tracking-wider block text-[10px]">Our Vision</span>
                    <p className="text-gray-300 text-xs font-sans leading-normal">
                      {companySettings.vision || "To become India's most trusted AI recruitment platform."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Values */}
              <div className="space-y-3 text-center">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Core Values</span>
                <h4 className="font-extrabold text-base text-white uppercase tracking-wider">The principles guiding AIJobs</h4>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {(companySettings.values || "Trust, Innovation, Transparency, Speed, Customer Success")
                    .split(",")
                    .map((val: string) => val.trim())
                    .filter((val: string) => val.length > 0)
                    .map((value: string, idx: number) => (
                      <span key={idx} className="px-4 py-2 bg-neutral-950 text-indigo-300 border border-white/5 rounded-full font-mono text-xs hover:border-indigo-500/20 transition-all">
                        ✨ {value}
                      </span>
                    ))
                  }
                </div>
              </div>

              {/* Company leadership / team */}
              <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-3 text-center">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Our Team</span>
                <h4 className="font-extrabold text-base text-white uppercase tracking-wider">Passionate Sourcing Pioneers</h4>
                <p className="text-xs text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Our official team dashboard is currently being updated. AIJobs is backed by an exceptional network of machine learning engineers, dedicated recruiters, and technical staffing coordinators committed to optimizing the Indian talent ecosystem.
                </p>
                <div className="pt-2 text-[10px] font-mono text-gray-500">
                  RECRUITER COLLABORATION ENGINE • SECURE GATEWAY
                </div>
              </div>
            </div>
          )}

          {/* ================================== CONTACT US PAGE ================================== */}
          {pageType === "contact" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
              {/* Coordinates Info Card */}
              <div className="lg:col-span-5 space-y-6">
                <div className="glass p-5 rounded-2xl border border-white/5 space-y-4">
                  <h4 className="font-extrabold text-base text-white">Our Office Coordinates</h4>
                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex gap-2.5">
                      <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 text-[10px] block uppercase font-bold">Registered Office Address</span>
                        <p className="text-gray-300 mt-0.5">{companySettings.address}</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 text-[10px] block uppercase font-bold">Support Core Hours</span>
                        <p className="text-gray-300 mt-0.5">{companySettings.businessHours}</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 text-[10px] block uppercase font-bold">SMTP Mail Hubs</span>
                        <p className="text-gray-300 mt-0.5">Support Desk: <strong>{companySettings.supportEmail}</strong></p>
                        <p className="text-gray-300">Enterprise Sales: <strong>{companySettings.salesEmail}</strong></p>
                      </div>
                    </div>

                    <div className="flex gap-2.5">
                      <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <span className="text-gray-500 text-[10px] block uppercase font-bold">Direct Call Coordinates</span>
                        <p className="text-gray-300 mt-0.5">Phone Call: <strong>{companySettings.phone}</strong></p>
                        <p className="text-gray-300">WhatsApp: <strong>{companySettings.whatsapp}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Google Maps Embed (Static/Dynamic placeholder map layout) */}
                <div className="bg-neutral-950 border border-white/5 rounded-2xl overflow-hidden h-44 relative">
                  <iframe 
                    title="Prestige Trade Tower Google Map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m12!1m3!1d3887.653457161642!2d77.59103091526435!3d12.98125801804245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae16790b957e8d%3A0x6d90df8bb03bbfd6!2sPrestige%20Trade%20Tower!5e0!3m2!1sen!2sin!4v1680000000000!5m2!1sen!2sin" 
                    className="w-full h-full border-0 grayscale opacity-75"
                    allowFullScreen={false} 
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              {/* Custom Contact Form */}
              <form onSubmit={handleContactSubmit} className="lg:col-span-7 glass p-6 rounded-2xl border border-white/5 space-y-4">
                <h4 className="font-extrabold text-base text-white">Send Us a Direct Message</h4>
                <p className="text-xs text-gray-400">Have custom agency integration requirements? Fill out our contact grid and a systems officer will be dispatched to coordinate within 4 hours.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="e.g. Anand Sharma"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 block font-mono">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="anand@company.in"
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-gray-400 block font-mono">Subject Matter</label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="e.g. Enterprise Agency Subscription Inquiry"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-gray-400 block font-mono">Description / Message *</label>
                  <textarea
                    required
                    value={contactForm.message}
                    onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Please specify how we can help..."
                    className="w-full h-28 bg-neutral-900 border border-white/10 rounded-lg p-3 text-white font-mono text-xs resize-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Dispatch Message</span>
                </button>
              </form>
            </div>
          )}

          {/* ================================== FAQ PAGE ================================== */}
          {pageType === "faq" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <h4 className="font-bold text-white uppercase text-sm tracking-wide">Category Knowledge Nodes</h4>
                  <p className="text-xs text-gray-400">Select standard inquiries curated by specialized HR coordinators.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["Candidate", "Recruiter", "Consultancy", "Payments"].map((cat) => (
                  <div key={cat} className="space-y-3 p-4 bg-neutral-950 rounded-2xl border border-white/5">
                    <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest px-2 py-0.5 bg-indigo-500/5 border border-indigo-500/10 rounded">
                      {cat} FAQs
                    </span>
                    <div className="space-y-3 pt-1">
                      {faqList.filter(f => f.category === cat).map((faq, idx) => (
                        <div key={idx} className="space-y-1 bg-[#09090f] p-3 rounded-xl border border-white/5">
                          <h5 className="font-extrabold text-white text-xs font-mono">Q: {faq.q}</h5>
                          <p className="text-gray-400 text-[11px] leading-relaxed pt-1">A: {faq.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================== REPORT A PROBLEM / TICKETS ================================== */}
          {pageType === "report" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
              {/* Ticket Raising Form */}
              <form onSubmit={handleTicketSubmit} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-sm text-white">Raise a Customer Support Ticket</h4>
                  <p className="text-[11px] text-gray-400 mt-1">Our technical coordinators respond and deploy fixes for verified tickets in under 6 hours.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono block">Ticket Subject *</label>
                  <input
                    type="text"
                    required
                    value={ticketForm.subject}
                    onChange={e => setTicketForm({ ...ticketForm, subject: e.target.value })}
                    placeholder="e.g. SDE resume score evaluation error"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-mono block">Category *</label>
                    <select
                      value={ticketForm.category}
                      onChange={e => setTicketForm({ ...ticketForm, category: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="Payments">Payments & Billing</option>
                      <option value="Resume Evaluation">Resume Evaluation</option>
                      <option value="AI Interview">AI Mock Assessment</option>
                      <option value="Recruiter Dashboard">Dashboard Workspaces</option>
                      <option value="Other">Miscellaneous</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-gray-400 font-mono block">Priority *</label>
                    <select
                      value={ticketForm.priority}
                      onChange={e => setTicketForm({ ...ticketForm, priority: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2 py-1.5 text-white"
                    >
                      <option value="Low">Low (Non-blocking)</option>
                      <option value="Medium">Medium (Workaround exists)</option>
                      <option value="High">High (Direct system block)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono block">Detailed Description *</label>
                  <textarea
                    required
                    value={ticketForm.description}
                    onChange={e => setTicketForm({ ...ticketForm, description: e.target.value })}
                    placeholder="Provide explicit steps to reproduce the issue..."
                    className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono resize-none"
                  />
                </div>

                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] space-y-1 text-gray-400">
                  <span className="text-[9px] font-mono font-bold text-indigo-400 block">DURABLE CLOUD COMPLIANCE</span>
                  <p>Raising a ticket registers a persistent database entry on Firestore under the `support_tickets` collection, allowing real-time resolution logs.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded-lg transition-all cursor-pointer"
                >
                  Raise Support Ticket
                </button>
              </form>

              {/* Ticket Tracking Panel */}
              <div className="space-y-6">
                <form onSubmit={handleTrackTicket} className="p-5 bg-neutral-950 rounded-2xl border border-white/5 space-y-3">
                  <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Track Live Ticket Progress</h4>
                  <p className="text-[11px] text-gray-400">Enter your dynamic Support Ticket ID (e.g. TIC-318412) to view status trails and replies.</p>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={ticketSearchId}
                      onChange={e => setTicketSearchId(e.target.value)}
                      placeholder="e.g. TIC-829104"
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs uppercase"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg cursor-pointer"
                    >
                      Track
                    </button>
                  </div>
                </form>

                {/* Tracked Ticket Outcome display */}
                {trackedTicket ? (
                  <div className="p-5 bg-white/5 border border-indigo-500/20 rounded-2xl space-y-4 animate-in slide-in-from-bottom-3 duration-300">
                    <div className="flex justify-between items-start border-b border-white/5 pb-2.5 text-xs">
                      <div>
                        <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-extrabold">
                          {trackedTicket.id}
                        </span>
                        <h5 className="font-extrabold text-sm text-white mt-1.5">{trackedTicket.subject}</h5>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        trackedTicket.status === "CLOSED" ? "bg-emerald-500/10 text-emerald-400" : "bg-yellow-500/10 text-yellow-400"
                      }`}>
                        {trackedTicket.status}
                      </span>
                    </div>

                    <div className="space-y-2 font-mono text-[11px] text-gray-400">
                      <p><strong>Category:</strong> {trackedTicket.category}</p>
                      <p><strong>Priority Clearance:</strong> {trackedTicket.priority}</p>
                      <p><strong>Opened Date:</strong> {new Date(trackedTicket.createdAt).toLocaleDateString()}</p>
                      <p className="p-3 bg-neutral-950 rounded-lg border border-white/5 text-gray-300 italic mt-2">
                        "{trackedTicket.description}"
                      </p>
                    </div>

                    {/* Admin comments log */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest block">Resolution Trails</span>
                      {trackedTicket.comments && trackedTicket.comments.length > 0 ? (
                        trackedTicket.comments.map((comm: any, i: number) => (
                          <div key={i} className="p-3 bg-neutral-900 border border-white/5 rounded-xl space-y-1 text-[11px]">
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <strong>{comm.author}</strong>
                              <span>{new Date(comm.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-gray-300 leading-relaxed">{comm.text}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-neutral-900 border border-dashed border-white/5 rounded-xl text-center italic text-gray-500 text-[10px]">
                          Pending technical dispatch agent review.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-[11px] text-gray-500 italic bg-neutral-950/20 border border-dashed border-white/5 rounded-2xl">
                    Search for a support ticket to audit real-time comments.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================== BLOG CMS PAGE ================================== */}
          {pageType === "blog" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {activeBlog ? (
                <div className="space-y-5 animate-in slide-in-from-left duration-300">
                  <button 
                    onClick={() => setActiveBlog(null)} 
                    className="text-xs text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-mono font-bold"
                  >
                    ← Back to Articles list
                  </button>
                  
                  <div className="space-y-2">
                    <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-black">
                      {activeBlog.category}
                    </span>
                    <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">{activeBlog.title}</h3>
                    <p className="text-xs text-gray-500 font-mono">
                      Published by <strong>{activeBlog.author || "Tech Editor"}</strong> • {activeBlog.readTime || "4 min"}
                    </p>
                  </div>

                  <img 
                    src={activeBlog.coverImage} 
                    alt={activeBlog.title} 
                    className="w-full h-64 object-cover rounded-2xl border border-white/10" 
                  />

                  <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                    <p className="text-xs text-indigo-300 italic font-medium">"{activeBlog.summary}"</p>
                  </div>

                  <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm text-left">
                    {activeBlog.content}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-extrabold text-base text-white uppercase tracking-tight">AI Sourcing & Engineering Insights</h4>
                    <p className="text-xs text-gray-400">Technical insights compiled by our developer advocacy teams.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {blogList.map((blog) => (
                      <div 
                        key={blog.id} 
                        onClick={() => setActiveBlog(blog)}
                        className="bg-[#0b0b11] border border-white/5 rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <img src={blog.coverImage} alt={blog.title} className="w-full h-40 object-cover opacity-80" />
                          <div className="p-4 space-y-2">
                            <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-extrabold">
                              {blog.category}
                            </span>
                            <h5 className="font-bold text-white text-xs leading-snug line-clamp-2">{blog.title}</h5>
                            <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-3">{blog.summary}</p>
                          </div>
                        </div>

                        <div className="p-4 pt-0 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>{blog.author.split(",")[0]}</span>
                          <span>{blog.readTime}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================== CAREERS PAGE ================================== */}
          {pageType === "careers" && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="bg-gradient-to-r from-blue-900/10 to-indigo-900/10 p-6 rounded-2xl border border-white/5 space-y-3">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Join our Core Engineering Teams</span>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">Help us build the next generation of algorithmic tech recruitment.</h3>
                <p className="text-xs text-gray-400 max-w-2xl">
                  We are a lean, remote-first team of AI developers, interaction designers, and system architects. We offer competitive salaries, premium medical coverage, and absolute flexibility.
                </p>
              </div>

              {/* Open Positions */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-white uppercase tracking-wider">Open Positions in Bengaluru & Remote</h4>
                <div className="space-y-3">
                  {[
                    { title: "Senior AI Sourcing Scientist", dept: "Machine Learning", type: "Full-time / Remote", ctc: "₹38 - ₹45 LPA" },
                    { title: "Lead React & Canvas Developer", dept: "Frontend Sprints", type: "Full-time / Hybrid (BLR)", ctc: "₹24 - ₹30 LPA" },
                    { title: "Enterprise Database Architect", dept: "Infrastructure", type: "Full-time / Remote", ctc: "₹32 - ₹40 LPA" }
                  ].map((job, idx) => (
                    <div key={idx} className="p-4 bg-neutral-950 border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-indigo-500/20 transition-all">
                      <div>
                        <h5 className="font-bold text-white text-xs">{job.title}</h5>
                        <div className="flex gap-2 text-[10px] text-gray-500 font-mono mt-1">
                          <span>{job.dept}</span>
                          <span>•</span>
                          <span>{job.type}</span>
                        </div>
                      </div>

                      <div className="flex sm:items-center gap-3 justify-between">
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">{job.ctc}</span>
                        <button 
                          onClick={() => {
                            setCareerApplyForm({ ...careerApplyForm, coverLetter: `Applying for: ${job.title}` });
                            setFeedbackMsg(`✓ Target job selected: ${job.title}. Enter details in application grid below.`);
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer font-mono"
                        >
                          APPLY NOW
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply Form */}
              <form onSubmit={handleCareerSubmit} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs max-w-xl mx-auto pt-6 border-t border-indigo-500/10">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider text-center">Submit Your Resume Directly</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-gray-400 font-mono block">Your Name *</label>
                    <input
                      type="text"
                      required
                      value={careerApplyForm.name}
                      onChange={e => setCareerApplyForm({ ...careerApplyForm, name: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-mono block">Email *</label>
                    <input
                      type="email"
                      required
                      value={careerApplyForm.email}
                      onChange={e => setCareerApplyForm({ ...careerApplyForm, email: e.target.value })}
                      className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono block">Resume Google Drive / Dropbox URL *</label>
                  <input
                    type="url"
                    required
                    value={careerApplyForm.resumeUrl}
                    onChange={e => setCareerApplyForm({ ...careerApplyForm, resumeUrl: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 font-mono block">Application Cover Letter</label>
                  <textarea
                    value={careerApplyForm.coverLetter}
                    onChange={e => setCareerApplyForm({ ...careerApplyForm, coverLetter: e.target.value })}
                    placeholder="Tell us about your technical achievements..."
                    className="w-full h-24 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Submit Resume Application
                </button>
              </form>
            </div>
          )}

          {/* ================================== PRESS & MEDIA ================================== */}
          {pageType === "press" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Press releases & Media Assets</span>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">AIJobs Secures INR 25 Crore Series-A Funding to Scale Real-time AI Sourcing Matrices</h3>
                <p className="text-xs text-gray-400">
                  Bengaluru — July 2026. AIJobs announced the closing of a Series-A funding round led by Peak Capital India to further build out its automated semantic scoring engines and expand its SaaS offerings for staffing consultancies.
                </p>
              </div>

              {/* Brand Kit / Downloads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-950 rounded-xl border border-white/5 space-y-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  <h5 className="font-bold text-white text-xs">Official Media Assets Kit</h5>
                  <p className="text-gray-400 text-[11px]">Download our logo vectors, PNG assets, corporate profiles, and co-founder bio documentation.</p>
                  <button 
                    onClick={() => alert("Media Assets Kit downloaded (simulated ZIP export)")}
                    className="mt-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-[10px] text-white font-mono cursor-pointer"
                  >
                    DOWNLOAD ZIP BRANDKIT
                  </button>
                </div>

                <div className="p-4 bg-neutral-950 rounded-xl border border-white/5 space-y-2">
                  <FileText className="w-5 h-5 text-pink-400" />
                  <h5 className="font-bold text-white text-xs">Press Contact Coordinates</h5>
                  <p className="text-gray-400 text-[11px]">Coordinate official interview loops or request custom comments on AI tech recruitment landscapes.</p>
                  <p className="text-gray-300 text-[11px] font-mono mt-1">SMTP: <strong>media@aijobs.global</strong></p>
                </div>
              </div>
            </div>
          )}

          {/* ================================== PRODUCT HELP CENTER ================================== */}
          {pageType === "help" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-6 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">Enterprise Integration Docs</h3>
                  <p className="text-xs text-gray-400">Deploy semantic AI evaluation hubs safely inside your corporate HR workflows.</p>
                </div>
                <button 
                  onClick={() => alert("Product documentation PDF download dispatched.")}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  DOWNLOAD DOCUMENTATION (PDF)
                </button>
              </div>

              {/* Guides / Tutorials */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h5 className="font-bold text-white text-xs font-mono">1. Resume Ingress API</h5>
                  <p className="text-gray-400 text-[11px]">Integrate custom resume file inputs with our REST API endpoints to receive parsed JSON schemas with skill-badges in real-time.</p>
                </div>

                <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-2">
                  <Play className="w-5 h-5 text-pink-400" />
                  <h5 className="font-bold text-white text-xs font-mono">2. Video assessments</h5>
                  <p className="text-gray-400 text-[11px]">Coordinate live grading parameters for audio mock sessions. Configure latency thresholds and required skills check items.</p>
                </div>

                <div className="p-4 bg-neutral-950 border border-white/5 rounded-xl space-y-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h5 className="font-bold text-white text-xs font-mono">3. ABAC configurations</h5>
                  <p className="text-gray-400 text-[11px]">Secure corporate pipelines by specifying matching recruiter attributes (Location, Team clearance, Role scope hierarchies).</p>
                </div>
              </div>
            </div>
          )}

          {/* ================================== POLICIES ================================== */}
          {["privacy", "terms", "cookie", "refund", "cancellation", "disclaimer"].includes(pageType) && (
            <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto text-left">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 rounded">
                  Regulatory Compliance Document
                </span>
                <h3 className="text-lg font-bold text-white uppercase mt-3">
                  {pageType === "privacy" && "Privacy & Data Protection Policy"}
                  {pageType === "terms" && "Terms & Conditions of Service"}
                  {pageType === "cookie" && "Cookie & Local Storage Policy"}
                  {pageType === "refund" && "Subscription Refund Policy"}
                  {pageType === "cancellation" && "Subscription Cancellation Rules"}
                  {pageType === "disclaimer" && "AI Evaluation Disclaimer"}
                </h3>
                <p className="text-[10px] text-gray-500 font-mono mt-1">
                  Effective Date: July 16, 2026 • Document ID: #POL-{pageType.toUpperCase()}-2026
                </p>
              </div>

              <div className="space-y-4 text-xs text-gray-400 leading-relaxed font-sans">
                {pageType === "privacy" && (
                  <>
                    <p>We take candidate data privacy seriously. All parsed resume indices, audio mock transcriptions, and recruiter communication feeds are encrypted in transit and at rest within secure Cloud SQL and Firestore systems.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. Information We Collect</h5>
                    <p>When you create an account, register as a candidate, or apply via consultancies, we store your profile parameters (Name, Email, Phone, Experience, Skills list, expected CTC) and any custom notes or tags attached by authorized recruiters.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">2. How We Use Data</h5>
                    <p>We use state-of-the-art semantic AI evaluation pipelines to rank candidates. Recruiter notes are collaborative subcollections accessed only by authorized recruitment workspace agents associated with the designated target consultancy or corporate employer.</p>
                  </>
                )}
                {pageType === "terms" && (
                  <>
                    <p>Welcome to AIJobs. By accessing our mock interview simulators, ATS grading modules, and consultancy dashboards, you agree to be bound by these legal terms.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. Account Security</h5>
                    <p>You must maintain active secure keys and session profiles. Any actions taken using your authenticated Firebase identity are your responsibility.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">2. Accurate Data Declarations</h5>
                    <p>Consultancies bulk-uploading candidate datasets verify that they have obtained consent to share the candidates' information and technical skills in our hiring network pools.</p>
                  </>
                )}
                {pageType === "cookie" && (
                  <>
                    <p>AIJobs uses cookies and standard local storage tokens to preserve your dark/light theme choices, session states, and workspace permissions.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. Required Cookies</h5>
                    <p>We use essential cookies for Firebase authentication. These cannot be disabled as they are required to verify access to dashboards.</p>
                  </>
                )}
                {pageType === "refund" && (
                  <>
                    <p>We offer absolute transparency. Subscriptions for our Pro Agency and Enterprise recruiter licenses have a 14-day money-back guarantee.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. Refund Eligibility</h5>
                    <p>If you are unsatisfied with our semantic evaluation matching limits, submit a support ticket under the "Payments" category with your payment transaction ID within 14 days of purchase to claim a full refund.</p>
                  </>
                )}
                {pageType === "cancellation" && (
                  <>
                    <p>You can cancel your recurring active workspace billing cycles at any time directly from the settings menu.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. Retained Access</h5>
                    <p>Upon cancellation, your Pro features remain fully unlocked until the last day of the current billing cycle, after which your account reverts to standard workspace limits.</p>
                  </>
                )}
                {pageType === "disclaimer" && (
                  <>
                    <p>Our automated resume grading systems and mock voice assessments provide directional guidance to help speed up hiring pipelines.</p>
                    <h5 className="font-bold text-white text-xs mt-2 uppercase font-mono">1. No Guarantee of Employment</h5>
                    <p>While our algorithms achieve high matching compatibility metrics, they do not guarantee final job offers. All hiring decisions are ultimately made by individual employers.</p>
                  </>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Page Footer */}
        <div className="p-4 border-t border-white/5 bg-[#010103] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-center">
          <span className="text-[10px] text-gray-500 font-mono">
            &copy; 2026 {companySettings.companyName}. All Rights Reserved • GSTIN: {companySettings.gstNumber}
          </span>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.keys(socialLinks).map((soc) => (
              <a 
                key={soc} 
                href={socialLinks[soc]} 
                target="_blank" 
                rel="noreferrer" 
                className="text-[10px] uppercase font-mono text-indigo-400 hover:text-white transition-colors"
              >
                {soc}
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
