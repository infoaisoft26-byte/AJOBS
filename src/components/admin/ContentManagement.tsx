import { useState, useEffect } from "react";
import { 
  FileText, Search, Filter, Plus, Edit, Trash2, CheckCircle, 
  Eye, Mail, Globe, Settings, FileSpreadsheet, Sparkles, Save
} from "lucide-react";
import { CMSContent, EmailTemplate } from "./AdminTypes";
import { doc, setDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

interface ContentManagementProps {
  cmsContents: CMSContent[];
  emailTemplates: EmailTemplate[];
  onRefresh: () => void;
}

export default function ContentManagement({
  cmsContents,
  emailTemplates,
  onRefresh
}: ContentManagementProps) {
  const [activeTab, setActiveTab] = useState<"cms" | "emails">("cms");
  const [cmsType, setCmsType] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for CMS Content
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSContent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<"blog" | "faq" | "testimonial" | "banner" | "page">("faq");
  const [formCategory, setFormCategory] = useState("General");
  const [formContent, setFormContent] = useState("");
  const [formStatus, setFormStatus] = useState<"draft" | "published">("published");

  // Email template editing
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormType("blog");
    setFormCategory("Career Growth");
    setFormContent("");
    setFormStatus("published");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: CMSContent) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormType(item.type);
    setFormCategory(item.category || "General");
    setFormContent(item.content);
    setFormStatus(item.status);
    setIsFormOpen(true);
  };

  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formContent) return;
    setIsSubmitting(true);

    try {
      const itemId = editingItem?.id || `cms_${Math.random().toString(36).substr(2, 9)}`;
      const payload: CMSContent = {
        id: itemId,
        title: formTitle,
        type: formType,
        category: formCategory,
        content: formContent,
        status: formStatus,
        createdAt: editingItem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, "cms", itemId), payload);

      // Audit Log
      const logId = "log_" + Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, "audit_logs", logId), {
        id: logId,
        userId: "system_admin",
        userName: "Super Admin",
        userEmail: "admin@aijobs.global",
        role: "Super Admin",
        action: "UPDATE",
        category: "Content",
        description: `Modified CMS component: '${formTitle}' marked as ${formStatus.toUpperCase()}.`,
        ipAddress: "157.45.18.221",
        deviceInfo: "Chrome 124.0",
        createdAt: new Date().toISOString()
      });

      alert(`🎉 CMS item saved successfully!`);
      setIsFormOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCMS = async (item: CMSContent) => {
    if (!confirm(`Are you sure you want to delete CMS asset "${item.title}"?`)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "cms", item.id));
      alert("Successfully deleted CMS block.");
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEmailTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setIsSubmitting(true);

    try {
      await setDoc(doc(db, "email_templates", selectedTemplate.id), {
        subject: emailSubject,
        body: emailBody,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      alert("🎉 Automated Client Email template updated successfully.");
      setSelectedTemplate(null);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter content
  const filteredCMS = cmsContents.filter(c => cmsType === "all" || c.type === cmsType);

  return (
    <div className="space-y-6" id="cms-control-panel">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            <span>Content Management System (CMS) & Emails</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Write technical articles, handle baseline system FAQs, configure terms, and manage active system communication email logs.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveTab("cms")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "cms" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            SaaS CMS Blocks
          </button>
          <button
            onClick={() => setActiveTab("emails")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === "emails" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Email Templates
          </button>
        </div>
      </div>

      {activeTab === "cms" ? (
        <div className="space-y-4">
          
          {/* CMS selector row */}
          <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
            <div className="flex gap-1.5 text-xs">
              {[
                { id: "all", label: "All CMS Block" },
                { id: "blog", label: "Technical Blogs" },
                { id: "faq", label: "FAQs" },
                { id: "testimonial", label: "Client Testimonials" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCmsType(t.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    cmsType === t.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
            >
              <Plus className="w-4 h-4 inline mr-1" />
              <span>Create CMS block</span>
            </button>
          </div>

          {/* CMS Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {filteredCMS.length > 0 ? (
              filteredCMS.map((item) => (
                <div key={item.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-3 hover:border-indigo-500/20 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] font-mono bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded uppercase font-black">
                          {item.type}
                        </span>
                        <h4 className="font-extrabold text-sm text-white mt-1.5">{item.title}</h4>
                      </div>

                      <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                        item.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-500/10 text-neutral-400"
                      }`}>{item.status}</span>
                    </div>

                    <p className="text-gray-400 leading-relaxed line-clamp-3 text-[11px]">{item.content}</p>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-white/5 font-mono text-[9px] text-gray-500">
                    <span>Category: <strong className="text-gray-300">{item.category || "General"}</strong></span>
                    
                    <div className="space-x-1.5">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="text-indigo-400 hover:underline font-bold cursor-pointer"
                      >
                        Edit Asset
                      </button>
                      <button
                        onClick={() => handleDeleteCMS(item)}
                        className="text-rose-400 hover:underline font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-16 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-2xl">
                No CMS blocks currently registered. Select "Create CMS block" to append templates.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Email Template Selection Panel */}
          <div className="lg:col-span-1 glass p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
            <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider block px-2 pb-2">
              Auto-Mailer Directives
            </span>

            {emailTemplates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => {
                  setSelectedTemplate(tpl);
                  setEmailSubject(tpl.subject);
                  setEmailBody(tpl.body);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl font-bold text-left transition-all cursor-pointer ${
                  selectedTemplate?.id === tpl.id 
                    ? "bg-indigo-600 text-white" 
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
                }`}
              >
                <div>
                  <h5 className="text-xs">{tpl.name}</h5>
                  <span className="text-[9px] text-gray-400 font-mono font-normal block mt-1">Group: {tpl.category}</span>
                </div>
                <Mail className="w-4 h-4 shrink-0 opacity-40" />
              </button>
            ))}
          </div>

          {/* Core template body editor */}
          <div className="lg:col-span-2">
            {selectedTemplate ? (
              <form onSubmit={handleSaveEmailTemplate} className="glass p-5 rounded-2xl border border-white/5 space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">Modify Auto-mailer Blueprint</h4>
                    <span className="text-[10px] text-gray-400 font-mono">Category: {selectedTemplate.category}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Save Mailer Template
                  </button>
                </div>

                <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-2">
                  <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Authorized Interpolation Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.variables.map(v => (
                      <span key={v} className="text-[9px] font-mono bg-neutral-950 px-2 py-0.5 rounded text-gray-300">
                        {"{{"}{v}{"}}"}
                      </span>
                    ))}
                  </div>
                  <p className="text-[8px] text-gray-500">Inject these precise tags into subject/body fields to contextually insert candidate or job values on delivery.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono">Brodcast Email Subject Line</label>
                  <input
                    type="text"
                    required
                    value={emailSubject}
                    onChange={e => setEmailSubject(e.target.value)}
                    placeholder="e.g. Verification Alert: {{company_name}}!"
                    className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block font-mono font-bold">SMTP Mail Body Blueprint</label>
                  <textarea
                    required
                    value={emailBody}
                    onChange={e => setEmailBody(e.target.value)}
                    placeholder="Dear Candidate..."
                    className="w-full h-44 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono text-[10px] leading-relaxed resize-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </form>
            ) : (
              <div className="text-center py-28 text-[11px] text-gray-500 italic bg-neutral-950/20 border border-white/5 rounded-2xl">
                Choose an auto-mailer blueprint to edit the subject layout or insert merge tags.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Form Overlay Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCMS} className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-2xl p-6 space-y-4 text-xs text-gray-300">
            <div className="border-b border-white/5 pb-3 flex justify-between items-center">
              <h4 className="font-extrabold text-sm text-white">
                {editingItem ? "Edit CMS Block" : "Publish CMS Block"}
              </h4>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">X</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-gray-400 block">CMS Type *</label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value as any)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="blog">Technical Blog</option>
                  <option value="faq">FAQ Node</option>
                  <option value="testimonial">Client Testimonial</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block">Category *</label>
                <input
                  type="text"
                  required
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  placeholder="e.g. Billing, Engineering..."
                  className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Title Header *</label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Top 10 SDE Sourcing Guidelines"
                className="w-full bg-neutral-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 block">Content String *</label>
              <textarea
                required
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Write full article / response content..."
                className="w-full h-36 bg-neutral-900 border border-white/10 rounded-lg p-2.5 text-white font-mono leading-relaxed"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={formStatus === "published"}
                    onChange={() => setFormStatus("published")}
                    className="accent-indigo-500"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={formStatus === "draft"}
                    onChange={() => setFormStatus("draft")}
                    className="accent-indigo-500"
                  />
                  <span>Draft</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg cursor-pointer"
              >
                Save Block
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
