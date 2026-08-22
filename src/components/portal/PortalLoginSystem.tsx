import React, { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Building2, Check, Eye, EyeOff, FileSearch, KeyRound, LockKeyhole, Mail, Network, ScanSearch, ShieldCheck, Sparkles, UserRoundSearch } from "lucide-react";
import { auth, db } from "../../firebase";
import { getOrCreateUserProfile } from "../../services/dbInitService";
import { isAdminRole, normalizeRole } from "../../utils/roleUtils";
import type { UserProfile } from "../../types";

export type PortalRole = "consultancy" | "recruiter" | "admin";

type RoleConfig = {
  label: string;
  badge: string;
  heading: string;
  description: string;
  accent: string;
  accentSoft: string;
  glow: string;
  path: string;
  dashboardPath: string;
  icon: typeof Building2;
};

export const PORTAL_CONFIG: Record<PortalRole, RoleConfig> = {
  consultancy: {
    label: "Consultancy Portal", badge: "Consultancy", heading: "Grow Your Hiring Network",
    description: "Connect verified candidates, recruiters and partner companies from one secure workspace.",
    accent: "#06B6D4", accentSoft: "rgba(6,182,212,.18)", glow: "rgba(6,182,212,.34)",
    path: "/consultancy/login", dashboardPath: "/consultancy/dashboard", icon: Network
  },
  recruiter: {
    label: "Recruiter Portal", badge: "Recruiter", heading: "Hire Smarter. Hire Faster.",
    description: "Access intelligent talent matching, resume insights and your live recruitment pipeline.",
    accent: "#2563EB", accentSoft: "rgba(37,99,235,.18)", glow: "rgba(37,99,235,.38)",
    path: "/recruiter/login", dashboardPath: "/recruiter/dashboard", icon: ScanSearch
  },
  admin: {
    label: "Admin Portal", badge: "Admin / Super Admin", heading: "AIJOBS Control Centre",
    description: "Secure command access for platform operations, analytics and account governance.",
    accent: "#A78BFA", accentSoft: "rgba(139,92,246,.18)", glow: "rgba(245,158,11,.25)",
    path: "/admin/login", dashboardPath: "/admin/dashboard", icon: ShieldCheck
  }
};

function PortalMeta({ role }: { role?: PortalRole }) {
  useEffect(() => {
    const config = role ? PORTAL_CONFIG[role] : null;
    document.title = config ? `${config.label} | AIJOBS` : "Secure Portal Login | AIJOBS";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = config
      ? `${config.heading} — secure ${config.badge} access for the AIJOBS recruitment platform.`
      : "Secure access to AIJOBS Consultancy, Recruiter and Admin portals.";
  }, [role]);
  return null;
}

function AmbientBackground({ accent }: { accent: string }) {
  const particles = useMemo(() => Array.from({ length: 24 }, (_, i) => ({
    id: i, left: `${(i * 37) % 100}%`, top: `${(i * 61) % 100}%`, delay: `${(i % 8) * -.7}s`, size: 2 + (i % 3)
  })), []);
  return <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="portal-aurora absolute -inset-[30%] opacity-35" style={{ background: `radial-gradient(circle at 25% 25%, ${accent}55, transparent 28%), radial-gradient(circle at 75% 65%, #8B5CF644, transparent 30%)` }} />
    <div className="portal-grid absolute inset-0 opacity-20" />
    <div className="portal-beam absolute -left-1/4 top-1/4 h-px w-[150%] rotate-[-12deg]" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
    {particles.map(p => <span key={p.id} className="portal-particle absolute rounded-full" style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, background: accent, boxShadow: `0 0 12px ${accent}` }} />)}
  </div>;
}

function RoleVisual({ role }: { role: PortalRole }) {
  const c = PORTAL_CONFIG[role];
  if (role === "consultancy") return <div className="relative h-64" aria-hidden="true">
    <Network className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ color: c.accent }} />
    {[{x:18,y:20,I:Building2},{x:68,y:16,I:UserRoundSearch},{x:14,y:68,I:FileSearch},{x:72,y:66,I:Building2}].map(({x,y,I},i)=><motion.div key={i} className="absolute rounded-2xl border bg-[#07152F]/80 p-3 backdrop-blur-xl" style={{left:`${x}%`,top:`${y}%`,borderColor:`${c.accent}55`,color:c.accent}} animate={{y:[0,-8,0]}} transition={{duration:3+i*.35,repeat:Infinity,ease:"easeInOut"}}><I className="h-6 w-6" /></motion.div>)}
  </div>;
  if (role === "recruiter") return <div className="relative mx-auto h-64 max-w-sm" aria-hidden="true">
    <motion.div className="absolute inset-x-10 top-8 rounded-2xl border border-blue-400/30 bg-[#091a38]/85 p-5" animate={{y:[0,-5,0]}} transition={{duration:3,repeat:Infinity}}>
      <div className="mb-4 flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-400/20"/><div className="space-y-2"><div className="h-2 w-28 rounded bg-white/30"/><div className="h-2 w-20 rounded bg-white/10"/></div></div>
      {[78,92,85].map((w,i)=><div key={i} className="mb-2 h-2 rounded bg-blue-300/15" style={{width:`${w}%`}} />)}
      <motion.div className="absolute inset-x-3 h-px bg-cyan-300 shadow-[0_0_14px_#06B6D4]" animate={{top:[18,190,18]}} transition={{duration:2.6,repeat:Infinity,ease:"easeInOut"}} />
    </motion.div><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-xs text-blue-200"><Sparkles className="h-4 w-4"/>AI Match 96%</div>
  </div>;
  return <div className="relative flex h-64 items-center justify-center" aria-hidden="true">
    <motion.div className="absolute h-48 w-48 rounded-full border border-purple-400/20" animate={{rotate:360}} transition={{duration:14,repeat:Infinity,ease:"linear"}}><span className="absolute -top-2 left-1/2 h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_18px_#FCD34D]"/></motion.div>
    <motion.div className="relative rounded-[2rem] border border-purple-400/40 bg-purple-500/10 p-8 shadow-[0_0_50px_rgba(139,92,246,.3)]" animate={{scale:[1,1.04,1]}} transition={{duration:2.8,repeat:Infinity}}><ShieldCheck className="h-20 w-20 text-purple-300"/></motion.div>
    <BarChart3 className="absolute bottom-5 right-12 h-12 w-12 text-amber-300/60" />
  </div>;
}

function AuthLayout({ role, children }: { role: PortalRole; children: ReactNode }) {
  const c = PORTAL_CONFIG[role];
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(my, { stiffness: 80, damping: 20 }), ry = useSpring(mx, { stiffness: 80, damping: 20 });
  return <main className="relative min-h-screen overflow-hidden bg-[#07152F] px-4 py-8 text-white" onMouseMove={e=>{mx.set((e.clientX/window.innerWidth-.5)*8);my.set((.5-e.clientY/window.innerHeight)*8)}}>
    <PortalMeta role={role}/><AmbientBackground accent={c.accent}/>
    <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
      <section className="hidden p-8 lg:block"><div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold" style={{borderColor:`${c.accent}55`,background:c.accentSoft,color:c.accent}}><Sparkles className="h-3.5 w-3.5"/>AI-POWERED SECURE ACCESS</div><h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight">{c.heading}</h1><p className="mt-4 max-w-lg text-base leading-7 text-slate-300">{c.description}</p><RoleVisual role={role}/></section>
      <motion.section style={{rotateX:rx,rotateY:ry,transformPerspective:1200}} className="mx-auto w-full max-w-md">{children}</motion.section>
    </div>
    <style>{`@keyframes portalFloat{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(-24px);opacity:1}}@keyframes portalDrift{0%{transform:translate3d(-2%,0,0) rotate(0)}50%{transform:translate3d(3%,2%,0) rotate(4deg)}100%{transform:translate3d(-2%,0,0) rotate(0)}}@keyframes portalBeam{0%,100%{opacity:.08;transform:translateY(-70px) rotate(-12deg)}50%{opacity:.55;transform:translateY(220px) rotate(-12deg)}}.portal-particle{animation:portalFloat 5s ease-in-out infinite}.portal-aurora{animation:portalDrift 14s ease-in-out infinite}.portal-beam{animation:portalBeam 8s ease-in-out infinite}.portal-grid{background-image:linear-gradient(rgba(37,99,235,.13) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.1) 1px,transparent 1px);background-size:44px 44px;mask-image:linear-gradient(to bottom,transparent,black 20%,black 80%,transparent)}@media(prefers-reduced-motion:reduce){.portal-particle,.portal-aurora,.portal-beam{animation:none!important}}`}</style>
  </main>;
}

function firebaseErrorMessage(code?: string) {
  if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(code || "")) return "Email or password is incorrect. Please try again.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/too-many-requests") return "Too many attempts. Please wait a few minutes and try again.";
  if (code === "auth/network-request-failed") return "Network connection failed. Please check your internet connection.";
  if (code === "auth/user-disabled") return "This account is currently disabled. Please contact AIJOBS support.";
  return "Login could not be completed. Please try again.";
}

function SuccessOverlay({ role, name }: { role: PortalRole; name: string }) {
  const c=PORTAL_CONFIG[role];
  return <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#030A18]/95 px-4 backdrop-blur-xl" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} role="status" aria-live="polite">
    <div className="text-center"><motion.div className="relative mx-auto mb-7 flex h-28 w-28 items-center justify-center rounded-full border-2" style={{borderColor:c.accent,boxShadow:`0 0 55px ${c.glow}`}} initial={{scale:.65}} animate={{scale:1,rotate:[0,4,0]}}><div className="absolute inset-2 animate-ping rounded-full border opacity-25" style={{borderColor:c.accent}}/><span className="text-2xl font-black tracking-tight">AI<span style={{color:c.accent}}>JOBS</span></span><motion.span className="absolute -bottom-2 -right-1 flex h-9 w-9 items-center justify-center rounded-full" style={{background:c.accent}} initial={{scale:0}} animate={{scale:1}} transition={{delay:.45,type:"spring"}}><Check className="h-5 w-5 text-white"/></motion.span></motion.div><motion.h2 className="text-3xl font-black" initial={{y:12,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.25}}>Access Verified</motion.h2><p className="mt-2 text-slate-300">Welcome back, {name}</p><div className="mx-auto mt-6 h-1 w-52 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full" style={{background:c.accent}} initial={{width:0}} animate={{width:"100%"}} transition={{duration:1.6,ease:"easeInOut"}}/></div></div>
  </motion.div>;
}

async function resolveAuthorizedProfile(fbUser: any, role: PortalRole): Promise<UserProfile> {
  let profile = await getOrCreateUserProfile(fbUser, undefined, "internal");
  let resolvedRole = normalizeRole(profile.role);
  if (role === "admin") {
    let adminData: any = null;
    try { const snap=await getDoc(doc(db,"admins",fbUser.uid)); if(snap.exists()) adminData=snap.data(); } catch (e) { console.warn("[PortalAuth] Admin record check failed",e); }
    let claimRole=""; let hasAdminClaim=false;
    try { const token=await fbUser.getIdTokenResult(); claimRole=String(token.claims?.role||""); hasAdminClaim=Boolean(token.claims?.admin)||isAdminRole(claimRole); } catch {}
    const activeAdminDoc=Boolean(adminData && adminData.status!=="suspended" && adminData.status!=="disabled" && adminData.isActive!==false);
    if (!isAdminRole(profile.role) && !activeAdminDoc && !hasAdminClaim) throw new Error("ROLE_MISMATCH");
    if (!isAdminRole(profile.role)) profile={...profile,...adminData,role:isAdminRole(claimRole)?claimRole:(adminData?.role||"admin")};
    resolvedRole=normalizeRole(profile.role);
    if (!isAdminRole(resolvedRole)) throw new Error("ROLE_MISMATCH");
  } else if (resolvedRole !== role) throw new Error("ROLE_MISMATCH");
  return profile;
}

export function PortalLogin({ role, onSuccess, onBack }: { role: PortalRole; onSuccess:(profile:UserProfile,path:string)=>void; onBack:()=>void }) {
  const c=PORTAL_CONFIG[role]; const Icon=c.icon;
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [showPassword,setShowPassword]=useState(false); const [remember,setRemember]=useState(true); const [loading,setLoading]=useState(false); const [error,setError]=useState(""); const [shake,setShake]=useState(0); const [success,setSuccess]=useState<UserProfile|null>(null); const [resetStatus,setResetStatus]=useState("");
  const fail=(message:string)=>{setError(message);setShake(v=>v+1)};
  const submit=async(e:FormEvent)=>{e.preventDefault();setError("");setResetStatus("");if(!email.trim()||!password){fail("Email and password are required.");return;}setLoading(true);try{await setPersistence(auth,remember?browserLocalPersistence:browserSessionPersistence);const credential=await signInWithEmailAndPassword(auth,email.trim(),password);let profile:UserProfile;try{profile=await resolveAuthorizedProfile(credential.user,role);}catch(authErr:any){await signOut(auth);if(authErr?.message==="ROLE_MISMATCH")fail("This account does not have access to this portal.");else fail("Your account profile could not be verified. Please contact AIJOBS support.");return;}setSuccess(profile);window.setTimeout(()=>onSuccess(profile,c.dashboardPath),1750);}catch(err:any){fail(firebaseErrorMessage(err?.code));}finally{setLoading(false)}};
  const reset=async()=>{setError("");if(!email.trim()){fail("Enter your registered email first.");return;}try{await sendPasswordResetEmail(auth,email.trim());setResetStatus("Password reset link has been sent to your registered email.");}catch(err:any){fail(firebaseErrorMessage(err?.code));}};
  return <AuthLayout role={role}><AnimatePresence>{success&&<SuccessOverlay role={role} name={success.name||success.email?.split("@")[0]||"User"}/>}</AnimatePresence><motion.div key={shake} animate={error?{x:[0,-7,7,-5,5,0]}:{x:0}} transition={{duration:.38}} className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#081426]/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8" style={{boxShadow:`0 28px 90px ${c.glow}`}}>
    <div className="absolute inset-x-8 top-0 h-px" style={{background:`linear-gradient(90deg,transparent,${c.accent},transparent)`}}/><button type="button" onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-xs text-slate-400 transition hover:text-white" aria-label="Back to portal selection"><ArrowLeft className="h-4 w-4"/>Portal selection</button>
    <div className="mb-7"><div className="mb-5 flex items-center justify-between"><div className="text-xl font-black tracking-tight">AI<span style={{color:c.accent}}>JOBS</span></div><span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest" style={{borderColor:`${c.accent}66`,background:c.accentSoft,color:c.accent}}><Icon className="h-3.5 w-3.5"/>{c.badge}</span></div><h2 className="text-2xl font-black tracking-tight">{c.heading}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Sign in with your registered AIJOBS email and password.</p></div>
    {error&&<div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">{error}</div>}{resetStatus&&<div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" role="status">{resetStatus}</div>}
    <form onSubmit={submit} noValidate className="space-y-4"><div><label htmlFor={`${role}-email`} className="mb-1.5 block text-xs font-semibold text-slate-300">Email address</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input id={`${role}-email`} type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className={`w-full rounded-xl border bg-black/25 py-3 pl-10 pr-4 text-sm outline-none transition ${error?'border-red-400/60':'border-white/10 focus:border-white/30'}`} placeholder="name@company.com"/></div></div>
    <div><div className="mb-1.5 flex items-center justify-between"><label htmlFor={`${role}-password`} className="text-xs font-semibold text-slate-300">Password</label><button type="button" onClick={reset} className="text-xs font-medium hover:underline" style={{color:c.accent}}>Forgot password?</button></div><div className="relative"><LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"/><input id={`${role}-password`} type={showPassword?"text":"password"} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className={`w-full rounded-xl border bg-black/25 py-3 pl-10 pr-11 text-sm outline-none transition ${error?'border-red-400/60':'border-white/10 focus:border-white/30'}`} placeholder="Enter your password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white" aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}</button></div></div>
    <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} className="h-4 w-4 rounded" style={{accentColor:c.accent}}/>Remember me on this device</label>
    <button type="submit" disabled={loading||!!success} className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60" style={{background:`linear-gradient(110deg,${c.accent},#8B5CF6)`,boxShadow:`0 12px 32px ${c.glow}`}}>{loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white"/>Verifying secure access...</>:<>Access {c.label}<ArrowRight className="h-4 w-4"/></>}</button></form>
    <a href="/" className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 transition hover:text-white"><ArrowLeft className="h-3.5 w-3.5"/>Back to main website</a>
  </motion.div></AuthLayout>;
}

export function PortalSelection({ onSelect, onBack }: { onSelect:(role:PortalRole)=>void; onBack:()=>void }) {
  return <main className="relative min-h-screen overflow-hidden bg-[#07152F] px-4 py-10 text-white"><PortalMeta/><AmbientBackground accent="#2563EB"/><div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-center"><button type="button" onClick={onBack} className="mb-10 inline-flex w-fit items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4"/>Back to AIJOBS</button><div className="mb-10 text-center"><div className="text-2xl font-black">AI<span className="text-blue-400">JOBS</span></div><h1 className="mt-4 text-3xl font-black sm:text-5xl">Choose your secure portal</h1><p className="mx-auto mt-3 max-w-xl text-slate-400">Authorized access for hiring partners and platform administrators.</p></div><div className="grid gap-5 md:grid-cols-3">{(Object.keys(PORTAL_CONFIG) as PortalRole[]).map((role,i)=>{const c=PORTAL_CONFIG[role],Icon=c.icon;return <motion.button key={role} type="button" onClick={()=>onSelect(role)} initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{delay:i*.1}} whileHover={{y:-8,scale:1.015}} className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#081426]/80 p-7 text-left shadow-2xl backdrop-blur-xl focus:outline-none focus:ring-2" style={{boxShadow:`0 20px 60px ${c.glow}`}}><div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl border" style={{background:c.accentSoft,borderColor:`${c.accent}66`,color:c.accent}}><Icon className="h-7 w-7"/></div><span className="text-[10px] font-bold uppercase tracking-[.2em]" style={{color:c.accent}}>{c.badge}</span><h2 className="mt-2 text-xl font-black">{c.label}</h2><p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">{c.description}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-bold" style={{color:c.accent}}>Open secure login<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1"/></span><div className="absolute -right-12 -top-12 h-36 w-36 rounded-full blur-3xl" style={{background:c.accentSoft}}/></motion.button>})}</div><p className="mt-8 text-center text-xs text-slate-500">Candidate login is available only from the main AIJOBS website.</p></div></main>;
}
