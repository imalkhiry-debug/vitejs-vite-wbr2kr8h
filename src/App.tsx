import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://tutxrpfvxengypzfuyaa.supabase.co";
const SUPABASE_KEY = "sb_publishable_gycYwpzlXb_ffXErJ78xBQ_Qe7A7-xY";
const ADMIN_WA = "966501277870";
const SITE_NAME = "زواجات الخيرة";
const SITE_SUB = "الصفحة الرسمية لتسجيل مناسبات قبيلة الخيرة بقرى مركز دوقة";

const DAYS = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
const HIJRI_MONTHS = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const HIJRI_YEARS = Array.from({length:15},(_,i)=>1445+i);

interface Event { id:string; name:string; hijriDate:string; day:string; phone:string; venue:string; mapLink:string; notes:string; status:"pending"|"approved"; createdAt:number; }
interface FormData { name:string; hijriYear:string; hijriMonth:string; hijriDay:string; day:string; phone:string; venue:string; mapLink:string; notes:string; }
interface AdminAccount { id:string; label:string; password:string; }
const initialForm:FormData = { name:"",hijriYear:"",hijriMonth:"",hijriDay:"",day:"",phone:"",venue:"",mapLink:"",notes:"" };

const api = async (method:string, path:string, body?:object) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{
    method,
    headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":method==="POST"?"return=representation":""},
    body:body?JSON.stringify(body):undefined,
  });
  if(method==="DELETE"||method==="PATCH") return;
  return res.json();
};
const dbToEvent = (r:Record<string,unknown>):Event => ({
  id:r.id as string, name:r.name as string, hijriDate:normalizeHijri(r.hijri_date as string),
  day:r.day as string, phone:r.phone as string, venue:r.venue as string,
  mapLink:(r.map_link as string)||"", notes:(r.notes as string)||"",
  status:r.status as "pending"|"approved", createdAt:r.created_at as number,
});

// ── Hijri helpers ─────────────────────────────────────────────────
const parseHijriParts = (d:string):{y:number;m:number;day:number} => {
  const clean = d.replace(/\s*هـ\s*/g,"").trim();
  const parts = clean.split("/").map(p=>parseInt(p.trim())||0);
  if(parts.length<3) return {y:0,m:0,day:0};
  const yearIdx = parts.findIndex(p=>p>1000);
  if(yearIdx===2) return {y:parts[2],m:parts[1],day:parts[0]};
  return {y:parts[0],m:parts[1],day:parts[2]};
};
const normalizeHijri = (d:string):string => {
  if(!d) return d;
  const {y,m,day} = parseHijriParts(d);
  if(!y) return d;
  return `${y}/${String(m).padStart(2,"0")}/${String(day).padStart(2,"0")} هـ`;
};
const getHijriToday = ():{y:number;m:number;day:number} => {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic",{year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    return {y:parseInt(parts.find(p=>p.type==="year")?.value||"1447"),m:parseInt(parts.find(p=>p.type==="month")?.value||"01"),day:parseInt(parts.find(p=>p.type==="day")?.value||"01")};
  } catch { return {y:1447,m:10,day:1}; }
};
const isPast = (hijriDate:string):boolean => {
  const ev=parseHijriParts(hijriDate), tod=getHijriToday();
  if(ev.y!==tod.y) return ev.y<tod.y;
  if(ev.m!==tod.m) return ev.m<tod.m;
  return ev.day<tod.day;
};
const hijriToNum = (d:string):number => { const p=parseHijriParts(d); return p.y*10000+p.m*100+p.day; };
const sortByHijri = (a:Event,b:Event) => hijriToNum(a.hijriDate)-hijriToNum(b.hijriDate);
const formatHijri = (y:string,m:string,d:string):string => `${y}/${String(m).padStart(2,"0")}/${String(d).padStart(2,"0")} هـ`;
const generateId = ():string => Date.now().toString(36)+Math.random().toString(36).slice(2);
const generatePass = ():string => Math.random().toString(36).slice(2,8).toUpperCase();
const getMonthName = (hijriDate:string):string => { const {m}=parseHijriParts(hijriDate); return m>0?HIJRI_MONTHS[m-1]:""; };

// ── Auto day from hijri ───────────────────────────────────────────
const hijriToGregorian = (hy:number, hm:number, hd:number):Date|null => {
  try {
    // مرجع معروف: 1446/01/01 = 7 يوليو 2024
    const REF_MS = new Date('2024-07-07').getTime();
    const refDays = 1445 * 354.367;
    const targetDays = (hy-1) * 354.367 + (hm-1) * 29.53 + (hd-1);
    const approxMs = REF_MS + (targetDays - refDays) * 86400000;
    for(let offset=-45; offset<=45; offset++) {
      const d = new Date(approxMs + offset*86400000);
      const parts = new Intl.DateTimeFormat("en-u-ca-islamic",{year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(d);
      const y=parseInt(parts.find(p=>p.type==="year")?.value||"0");
      const m=parseInt(parts.find(p=>p.type==="month")?.value||"0");
      const day=parseInt(parts.find(p=>p.type==="day")?.value||"0");
      if(y===hy&&m===hm&&day===hd) return d;
    }
  } catch {}
  return null;
};
const getHijriDayName = (hy:string, hm:string, hd:string):string => {
  if(!hy||!hm||!hd) return "";
  try {
    const date = hijriToGregorian(parseInt(hy), parseInt(hm), parseInt(hd));
    if(!date) return "";
    return DAYS[date.getDay()];
  } catch { return ""; }
};

export default function App() {
  const [page, setPage] = useState("home");
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState<FormData>(initialForm);
  const [formError, setFormError] = useState("");
  const [formTouched, setFormTouched] = useState<Record<string,boolean>>({});
  const [submittedEvent, setSubmittedEvent] = useState<Event|null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"full"|"list">(() => (localStorage.getItem("manasbat_view")||"full") as "full"|"list");
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shareCardEvent, setShareCardEvent] = useState<Event|null>(null);
  const [showPoster, setShowPoster] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [isAdmin, setIsAdmin] = useState(()=>sessionStorage.getItem("manasbat_admin")==="1");
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(()=>{ const s=localStorage.getItem("manasbat_admins"); return s?JSON.parse(s):[{id:"1",label:"المدير الرئيسي",password:"admin1234"}]; });
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [adminTab, setAdminTab] = useState<"active"|"archived"|"accounts">("active");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editForm, setEditForm] = useState<FormData>(initialForm);
  const [newAccLabel, setNewAccLabel] = useState("");
  const [generatedPass, setGeneratedPass] = useState("");
  const [accError, setAccError] = useState("");
  const [editPassId, setEditPassId] = useState<string|null>(null);
  const [editPassVal, setEditPassVal] = useState("");

  const saveAdmins = (a:AdminAccount[]) => { setAdminAccounts(a); localStorage.setItem("manasbat_admins",JSON.stringify(a)); };

  const loadEvents = async () => {
    try { const rows=await api("GET","events?order=created_at.desc"); if(Array.isArray(rows)) setEvents(rows.map(dbToEvent)); } catch {}
    setLoading(false);
  };
  useEffect(()=>{ loadEvents(); },[]);
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(sidebarOpen&&sidebarRef.current&&!sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false); };
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[sidebarOpen]);

  const setView = (v:"full"|"list") => { setViewMode(v); localStorage.setItem("manasbat_view",v); setShowViewMenu(false); };
  const nav = (p:string) => { setPage(p); setSidebarOpen(false); setShowFilter(false); setShowViewMenu(false); };
  const closeDropdowns = () => { setShowFilter(false); setShowViewMenu(false); };

  // Auto-fill day
  const handleHijriChange = (y:string, m:string, d:string) => {
    const autoDay = getHijriDayName(y, m, d);
    setForm(prev=>({...prev, hijriYear:y, hijriMonth:m, hijriDay:d, day:autoDay||prev.day}));
  };
  const handleEditHijriChange = (y:string, m:string, d:string) => {
    const autoDay = getHijriDayName(y, m, d);
    setEditForm(prev=>({...prev, hijriYear:y, hijriMonth:m, hijriDay:d, day:autoDay||prev.day}));
  };

  // Required fields check
  const requiredFields = ["name","hijriYear","hijriMonth","hijriDay","day","phone","venue"];
  const isFieldError = (field:string) => formTouched[field] && !form[field as keyof FormData];
  const errStyle = (field:string):React.CSSProperties => isFieldError(field) ? {borderColor:"#e53e3e",boxShadow:"0 0 0 3px rgba(229,62,62,0.1)"} : {};

  const allApproved = events.filter(e=>e.status==="approved"&&!isPast(e.hijriDate)).sort(sortByHijri);
  const activeApproved = allApproved.filter(e=>{
    const ms = !searchText||e.name.includes(searchText)||e.venue.includes(searchText);
    const md = !filterDay||e.day===filterDay;
    const mm = !filterMonth||getMonthName(e.hijriDate)===filterMonth;
    return ms&&md&&mm;
  });
  const adminActive = events.filter(e=>!isPast(e.hijriDate)).sort(sortByHijri);
  const archivedEvents = events.filter(e=>isPast(e.hijriDate)).sort((a,b)=>hijriToNum(b.hijriDate)-hijriToNum(a.hijriDate));
  const hasFilter = !!searchText||!!filterDay||!!filterMonth;

  const handleLogin = () => {
    if(adminAccounts.find(a=>a.password===loginPass)){ setIsAdmin(true); sessionStorage.setItem("manasbat_admin","1"); nav("admin"); setLoginError(""); setLoginPass(""); }
    else setLoginError("كلمة المرور غير صحيحة");
  };
  const handleLogout = () => { setIsAdmin(false); sessionStorage.removeItem("manasbat_admin"); nav("home"); };
  const addAdmin = () => {
    if(!newAccLabel||!generatedPass){ setAccError("يرجى إدخال الاسم وتوليد كلمة مرور"); return; }
    saveAdmins([...adminAccounts,{id:generateId(),label:newAccLabel,password:generatedPass}]);
    setNewAccLabel(""); setGeneratedPass(""); setAccError("");
  };
  const deleteAdmin = (id:string) => { if(adminAccounts.length<=1) return; saveAdmins(adminAccounts.filter(a=>a.id!==id)); };
  const saveEditPass = (id:string) => { if(!editPassVal||editPassVal.length<4) return; saveAdmins(adminAccounts.map(a=>a.id===id?{...a,password:editPassVal}:a)); setEditPassId(null); setEditPassVal(""); };

  const handleSubmit = async () => {
    // Mark all required fields as touched to show errors
    const touched:Record<string,boolean> = {};
    requiredFields.forEach(f=>touched[f]=true);
    setFormTouched(touched);
    if(!form.name||!form.hijriYear||!form.hijriMonth||!form.hijriDay||!form.day||!form.phone||!form.venue){
      setFormError("يرجى تعبئة الحقول المميزة باللون الأحمر");
      return;
    }
    const hijriDate=formatHijri(form.hijriYear,form.hijriMonth,form.hijriDay);
    const newEv:Event={id:generateId(),name:form.name,hijriDate,day:form.day,phone:form.phone,venue:form.venue,mapLink:form.mapLink,notes:form.notes,status:"pending",createdAt:Date.now()};
    await api("POST","events",{id:newEv.id,name:newEv.name,hijri_date:newEv.hijriDate,day:newEv.day,phone:newEv.phone,venue:newEv.venue,map_link:newEv.mapLink,notes:newEv.notes,status:"pending",created_at:newEv.createdAt});
    await loadEvents(); setSubmittedEvent(newEv); setForm(initialForm); setFormError(""); setFormTouched({}); setPage("notify");
  };

  const notifyAdmin = (ev:Event) => {
    const text=`📋 *طلب موافقة - مناسبة جديدة*\n\nالاسم: ${ev.name}\nالتاريخ: ${ev.day}، ${ev.hijriDate}\nالمكان: ${ev.venue}\nالجوال: ${ev.phone}${ev.notes?`\nملاحظات: ${ev.notes}`:""}\n\nيرجى مراجعة الطلب والموافقة عليه.`;
    window.open(`https://wa.me/${ADMIN_WA}?text=${encodeURIComponent(text)}`,"_blank");
  };
  const shareEventWa = (ev:Event) => {
    const text=`🎊 *دعوة حفل زواج*\n\n👤 ${ev.name}\n📅 ${ev.day}، ${ev.hijriDate}\n📍 ${ev.venue}${ev.mapLink?`\n🗺️ ${ev.mapLink}`:""}\n📞 ${ev.phone}${ev.notes?`\n📝 ${ev.notes}`:""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,"_blank");
  };

  const toggleApprove = async (id:string,current:string) => { await api("PATCH",`events?id=eq.${id}`,{status:current==="approved"?"pending":"approved"}); await loadEvents(); };
  const deleteEvent = async (id:string) => { await api("DELETE",`events?id=eq.${id}`); await loadEvents(); };
  const startEdit = (ev:Event) => {
    const parts=ev.hijriDate.replace(/\s*هـ\s*/g,"").trim().split("/");
    setEditingId(ev.id); setEditForm({name:ev.name,hijriYear:parts[0]||"",hijriMonth:parts[1]||"",hijriDay:parts[2]||"",day:ev.day,phone:ev.phone,venue:ev.venue,mapLink:ev.mapLink,notes:ev.notes});
  };
  const saveEdit = async () => {
    if(!editingId) return;
    await api("PATCH",`events?id=eq.${editingId}`,{name:editForm.name,hijri_date:formatHijri(editForm.hijriYear,editForm.hijriMonth,editForm.hijriDay),day:editForm.day,phone:editForm.phone,venue:editForm.venue,map_link:editForm.mapLink,notes:editForm.notes});
    await loadEvents(); setEditingId(null);
  };

  const renderCard = (ev:Event) => {
    const isExp = expandedId===ev.id;
    const venueEl = ev.mapLink
      ? <a href={ev.mapLink} target="_blank" rel="noreferrer" style={S.venueLink} onClick={e=>e.stopPropagation()}>{ev.venue}</a>
      : <span>{ev.venue}</span>;
    if(viewMode==="list") return (
      <div key={ev.id} style={S.compactCard} onClick={()=>{ closeDropdowns(); setExpandedId(isExp?null:ev.id); }}>
        <div style={S.compactRow}>
          <span style={S.compactName}>{ev.name}</span>
          <span style={S.compactDate}>{ev.hijriDate}</span>
          <span style={{...S.chevron,transform:isExp?"rotate(180deg)":"none"}}>▼</span>
        </div>
        {isExp&&(
          <div style={S.compactDetails}>
            <div style={S.cardRow}><span style={S.cardIcon}>📅</span><span>{ev.day}، {ev.hijriDate}</span></div>
            <div style={S.cardRow}><span style={S.cardIcon}>📍</span>{venueEl}</div>
            <div style={S.cardRow}><span style={S.cardIcon}>📞</span><span>{ev.phone}</span></div>
            {ev.notes&&<p style={S.notesText}>{ev.notes}</p>}
            <button style={S.shareBtn} onClick={e=>{e.stopPropagation();setShareCardEvent(ev);}}>مشاركة</button>
          </div>
        )}
      </div>
    );
    return (
      <div key={ev.id} className="card" style={S.card}>
        <div style={S.cardHeader}>
          <h3 style={S.cardName}>{ev.name}</h3>
          <button style={S.shareIconBtn} onClick={()=>setShareCardEvent(ev)}><ShareIcon/></button>
        </div>
        <div style={S.cardRow}><span style={S.cardIcon}>📅</span><span>{ev.day}، {ev.hijriDate}</span></div>
        <div style={S.cardRow}><span style={S.cardIcon}>📍</span>{venueEl}</div>
        <div style={S.cardRow}><span style={S.cardIcon}>📞</span><span>{ev.phone}</span></div>
        {ev.notes&&<p style={S.notesText}>{ev.notes}</p>}
      </div>
    );
  };

  const renderAdminCard = (ev:Event) => (
    <div key={ev.id} style={S.adminCard}>
      {editingId===ev.id?(
        <div>
          <Field label="الاسم" value={editForm.name} onChange={v=>setEditForm({...editForm,name:v})}/>
          <HijriField year={editForm.hijriYear} month={editForm.hijriMonth} day={editForm.hijriDay} onChange={handleEditHijriChange}/>
          <div style={S.fieldGroup}>
            <label style={S.label}>اليوم</label>
            <select style={S.select} value={editForm.day} onChange={e=>setEditForm({...editForm,day:e.target.value})}>
              <option value="">اختر اليوم</option>
              {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <Field label="رقم الجوال" value={editForm.phone} onChange={v=>setEditForm({...editForm,phone:v})}/>
          <Field label="العنوان" value={editForm.venue} onChange={v=>setEditForm({...editForm,venue:v})}/>
          <Field label="رابط الخريطة" value={editForm.mapLink} onChange={v=>setEditForm({...editForm,mapLink:v})}/>
          <div style={S.fieldGroup}><label style={S.label}>ملاحظات</label><textarea style={S.textarea} value={editForm.notes} onChange={e=>setEditForm({...editForm,notes:e.target.value})} rows={2}/></div>
          <div style={{display:"flex",gap:8}}><button className="btn-gold" onClick={saveEdit}>حفظ</button><button style={S.cancelBtn} onClick={()=>setEditingId(null)}>إلغاء</button></div>
        </div>
      ):(
        <div style={S.adminCardInner}>
          <div style={S.adminCardInfo}>
            <span style={{...S.statusBadge,background:ev.status==="approved"?"#e8f5e9":"#fff8e1",color:ev.status==="approved"?"#2e7d32":"#856404"}}>{ev.status==="approved"?"مُعتمدة":"قيد المراجعة"}</span>
            <strong style={{fontSize:14}}>{ev.name}</strong>
            <span style={{color:"#777",fontSize:12}}>{ev.day}، {ev.hijriDate}</span>
            <span style={{color:"#777",fontSize:12}}>📍 {ev.venue} — 📞 {ev.phone}</span>
            {ev.notes&&<span style={{color:"#bbb",fontSize:11}}>{ev.notes}</span>}
          </div>
          <div style={S.adminActions}>
            <button style={S.adminEditBtn} onClick={()=>startEdit(ev)}><EditIcon/></button>
            <button style={{...S.adminToggleBtn,background:ev.status==="approved"?"#fff8e1":"#e8f5e9",color:ev.status==="approved"?"#856404":"#2e7d32",borderColor:ev.status==="approved"?"#e8d9b5":"#c8e6c9"}} onClick={()=>toggleApprove(ev.id,ev.status)}>{ev.status==="approved"?"✕":"✓"}</button>
            <button style={S.adminDeleteBtn} onClick={()=>deleteEvent(ev.id)}><TrashIcon/></button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={S.root} onClick={closeDropdowns}>
      <style>{css}</style>

      {sidebarOpen&&<div style={S.overlayBg} onClick={()=>setSidebarOpen(false)}/>}

      <div ref={sidebarRef} style={{...S.sidebar,transform:sidebarOpen?"translateX(0)":"translateX(100%)"}}>
        <div style={S.sidebarHeader}>
          <span style={{fontWeight:800,fontSize:16,color:"#7a5a10"}}>{SITE_NAME}</span>
          <button style={S.closeBtn} onClick={()=>setSidebarOpen(false)}>✕</button>
        </div>
        <button style={S.sideLink} onClick={()=>nav("home")}>الرئيسية</button>
        <button style={S.sideLink} onClick={()=>nav("register")}>تسجيل مناسبة</button>
        {isAdmin?<button style={S.sideLink} onClick={()=>nav("admin")}>لوحة التحكم</button>:<button style={S.sideLink} onClick={()=>nav("login")}>تسجيل الدخول</button>}
        {isAdmin&&<button style={{...S.sideLink,color:"#c0392b"}} onClick={handleLogout}>تسجيل الخروج</button>}
        <div style={{borderTop:"1px solid #e8d9b5",marginTop:"auto",paddingTop:12}}>
          <a href={`https://wa.me/${ADMIN_WA}`} target="_blank" rel="noreferrer" style={{...S.sideLink,textDecoration:"none",display:"block"}}>تواصل معنا</a>
        </div>
      </div>

      <nav style={S.nav}>
        <button style={S.hamburger} onClick={e=>{e.stopPropagation();setSidebarOpen(true);}}><span/><span/><span/></button>
        <div style={S.navTitle}>{SITE_NAME}</div>
        <div style={{width:40}}/>
      </nav>

      {page==="home"&&(
        <div style={S.container}>
          <div style={S.hero}>
            <p style={S.heroSub}>{SITE_SUB}</p>
            <button className="btn-gold-sm" onClick={()=>setPage("register")}>✦ تسجيل مناسبة جديدة</button>
          </div>
          <div style={S.section}>
            <div style={S.sectionTitleRow}>
              <h2 style={S.sectionTitle}>
                المناسبات المعتمدة
                {allApproved.length>0&&<span style={S.countBadge}>{allApproved.length}</span>}
              </h2>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{position:"relative"}}>
                  <button style={{...S.toolBtn,...(hasFilter?S.toolBtnActive:{})}} onClick={e=>{e.stopPropagation();setShowViewMenu(false);setShowFilter(v=>!v);}}>
                    <SearchIcon active={hasFilter}/>
                  </button>
                  {showFilter&&(
                    <div style={S.dropdown} onClick={e=>e.stopPropagation()}>
                      <p style={S.dropTitle}>بحث وتصفية</p>
                      <input style={{...S.input,fontSize:12,marginBottom:8}} placeholder="بحث بالاسم أو المكان..." value={searchText} onChange={e=>setSearchText(e.target.value)}/>
                      <select style={{...S.select,fontSize:12,marginBottom:8}} value={filterDay} onChange={e=>setFilterDay(e.target.value)}>
                        <option value="">كل الأيام</option>
                        {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                      <select style={{...S.select,fontSize:12}} value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}>
                        <option value="">كل الأشهر</option>
                        {HIJRI_MONTHS.map(m=><option key={m} value={m}>{m}</option>)}
                      </select>
                      {hasFilter&&<button style={{...S.cancelBtn,marginTop:8,width:"100%",fontSize:12,textAlign:"center" as const}} onClick={()=>{setSearchText("");setFilterDay("");setFilterMonth("");}}>مسح التصفية</button>}
                    </div>
                  )}
                </div>
                <div style={{position:"relative"}}>
                  <button style={S.toolBtn} onClick={e=>{e.stopPropagation();setShowFilter(false);setShowViewMenu(v=>!v);}}>
                    {viewMode==="list"
                      ?<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                      :<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></svg>
                    }
                  </button>
                  {showViewMenu&&(
                    <div style={{...S.dropdown,width:150,padding:6}} onClick={e=>e.stopPropagation()}>
                      <button style={{...S.viewOpt,...(viewMode==="full"?S.viewOptActive:{})}} onClick={()=>setView("full")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="5" rx="1"/><rect x="3" y="10" width="18" height="5" rx="1"/><rect x="3" y="17" width="18" height="5" rx="1"/></svg>
                        عرض كامل
                      </button>
                      <button style={{...S.viewOpt,...(viewMode==="list"?S.viewOptActive:{})}} onClick={()=>setView("list")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                        عرض قائمة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {loading&&<p style={S.empty}>جاري التحميل...</p>}
            {!loading&&activeApproved.length===0&&<p style={S.empty}>{hasFilter?"لا توجد نتائج":"لا توجد مناسبات معتمدة حتى الآن"}</p>}
            <div style={S.grid}>{activeApproved.map(renderCard)}</div>
            {allApproved.length>0&&<button className="btn-poster" onClick={()=>setShowPoster(true)}>مشاركة جميع المناسبات</button>}
          </div>
        </div>
      )}

      {page==="register"&&(
        <div style={S.container}>
          <div style={S.formWrap}>
            <button style={S.back} onClick={()=>setPage("home")}>← العودة</button>
            <h2 style={S.formTitle}>تسجيل مناسبة جديدة</h2>

            {/* Name */}
            <div style={S.fieldGroup}>
              <label style={{...S.label,...(isFieldError("name")?S.labelErr:{})}}>اسم صاحب المناسبة *</label>
              <input style={{...S.input,...errStyle("name")}} placeholder="مثال: فلان بن فلان الفلاني" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
              {isFieldError("name")&&<small style={S.fieldErrMsg}>هذا الحقل مطلوب</small>}
            </div>

            {/* Hijri date */}
            <div style={S.fieldGroup}>
              <label style={{...S.label,...((isFieldError("hijriYear")||isFieldError("hijriMonth")||isFieldError("hijriDay"))?S.labelErr:{})}}>التاريخ الهجري *</label>
              <div style={{display:"flex",gap:8}}>
                <select style={{...S.select,flex:2,...errStyle("hijriYear")}} value={form.hijriYear} onChange={e=>handleHijriChange(e.target.value,form.hijriMonth,form.hijriDay)}>
                  <option value="">السنة</option>
                  {HIJRI_YEARS.map(y=><option key={y} value={String(y)}>{y} هـ</option>)}
                </select>
                <select style={{...S.select,flex:3,...errStyle("hijriMonth")}} value={form.hijriMonth} onChange={e=>handleHijriChange(form.hijriYear,e.target.value,form.hijriDay)}>
                  <option value="">الشهر</option>
                  {HIJRI_MONTHS.map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}
                </select>
                <select style={{...S.select,flex:2,...errStyle("hijriDay")}} value={form.hijriDay} onChange={e=>handleHijriChange(form.hijriYear,form.hijriMonth,e.target.value)}>
                  <option value="">اليوم</option>
                  {Array.from({length:30},(_,i)=><option key={i+1} value={String(i+1).padStart(2,"0")}>{i+1}</option>)}
                </select>
              </div>
              {(isFieldError("hijriYear")||isFieldError("hijriMonth")||isFieldError("hijriDay"))&&<small style={S.fieldErrMsg}>يرجى تحديد التاريخ كاملاً</small>}
            </div>

            {/* Day — auto filled */}
            <div style={S.fieldGroup}>
              <label style={{...S.label,...(isFieldError("day")?S.labelErr:{})}}>اليوم *</label>
              <select style={{...S.select,...errStyle("day")}} value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>
                <option value="">اختر اليوم</option>
                {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              {form.day&&!isFieldError("day")&&<small style={{color:"#c9a227",fontSize:11,marginTop:3,display:"block"}}>✓ تم تحديده تلقائياً — يمكنك تغييره إذا كان خطأ</small>}
              {isFieldError("day")&&<small style={S.fieldErrMsg}>هذا الحقل مطلوب</small>}
            </div>

            {/* Phone */}
            <div style={S.fieldGroup}>
              <label style={{...S.label,...(isFieldError("phone")?S.labelErr:{})}}>رقم الجوال للتواصل *</label>
              <input style={{...S.input,...errStyle("phone")}} placeholder="0500000000" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
              {isFieldError("phone")&&<small style={S.fieldErrMsg}>هذا الحقل مطلوب</small>}
            </div>

            {/* Venue */}
            <div style={S.fieldGroup}>
              <label style={{...S.label,...(isFieldError("venue")?S.labelErr:{})}}>عنوان المناسبة (القاعة / المدينة) *</label>
              <input style={{...S.input,...errStyle("venue")}} placeholder="مثال: قاعة ليلتي، الرياض" value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/>
              {isFieldError("venue")&&<small style={S.fieldErrMsg}>هذا الحقل مطلوب</small>}
            </div>

            {/* Map link - optional */}
            <Field label="رابط موقع القاعة على الخريطة" placeholder="https://maps.google.com/..." value={form.mapLink} onChange={v=>setForm({...form,mapLink:v})} optional/>

            {/* Notes - optional */}
            <div style={S.fieldGroup}>
              <label style={S.label}>ملاحظات إضافية <span style={{fontWeight:400,color:"#aaa",fontSize:12}}>(اختياري)</span></label>
              <input style={S.input} placeholder="أي تفاصيل أخرى..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
            </div>

            {formError&&<p style={S.error}>{formError}</p>}
            <button className="btn-gold" style={{width:"100%",marginTop:8}} onClick={handleSubmit}>إرسال الطلب للإدارة</button>
          </div>
        </div>
      )}

      {page==="notify"&&submittedEvent&&(
        <div style={S.container}>
          <div style={S.formWrap}>
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{fontSize:42,marginBottom:14}}>✅</div>
              <h3 style={{color:"#1a1208",margin:"0 0 10px",fontSize:18,fontWeight:800}}>تم حفظ بياناتك بنجاح</h3>
              <p style={{color:"#666",fontSize:14,margin:"0 0 24px",lineHeight:1.8}}>
                يرجى إرسال إشعار للإدارة<br/>حتى يتم اعتماد طلبك
              </p>
              <button style={S.waNotifyBtn} onClick={()=>notifyAdmin(submittedEvent)}>
                <WaIcon/>&nbsp; إرسال إشعار للإدارة عبر واتساب
              </button>
              <button style={{...S.back,marginTop:20,textAlign:"center" as const,width:"100%",marginBottom:0,color:"#aaa",fontSize:12}} onClick={()=>setPage("home")}>
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      )}

      {page==="login"&&(
        <div style={S.container}>
          <div style={S.formWrap}>
            <button style={S.back} onClick={()=>setPage("home")}>← العودة</button>
            <h2 style={S.formTitle}>تسجيل الدخول</h2>
            <Field label="كلمة المرور" placeholder="أدخل كلمة المرور" value={loginPass} onChange={setLoginPass} type="password"/>
            {loginError&&<p style={S.error}>{loginError}</p>}
            <button className="btn-gold" style={{width:"100%"}} onClick={handleLogin}>دخول</button>
          </div>
        </div>
      )}

      {page==="admin"&&isAdmin&&(
        <div style={S.container}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <button style={S.back} onClick={()=>setPage("home")}>← الرئيسية</button>
            <button style={{...S.back,color:"#c0392b",marginBottom:0}} onClick={handleLogout}>خروج</button>
          </div>
          <h2 style={S.formTitle}>لوحة التحكم</h2>
          <div style={S.tabs}>
            <button style={{...S.tab,...(adminTab==="active"?S.tabActive:{})}} onClick={()=>setAdminTab("active")}>الطلبات <span style={S.tabBadge}>{adminActive.length}</span></button>
            <button style={{...S.tab,...(adminTab==="archived"?S.tabActive:{})}} onClick={()=>setAdminTab("archived")}>السابقة <span style={S.tabBadge}>{archivedEvents.length}</span></button>
            <button style={{...S.tab,...(adminTab==="accounts"?S.tabActive:{})}} onClick={()=>setAdminTab("accounts")}>الحسابات <span style={S.tabBadge}>{adminAccounts.length}</span></button>
          </div>
          {adminTab==="active"&&(<div>{adminActive.length===0?<p style={S.empty}>لا توجد طلبات حالية</p>:adminActive.map(renderAdminCard)}</div>)}
          {adminTab==="archived"&&(<div>{archivedEvents.length===0?<p style={S.empty}>لا توجد مناسبات سابقة</p>:archivedEvents.map(renderAdminCard)}</div>)}
          {adminTab==="accounts"&&(
            <div>
              {adminAccounts.map(acc=>(
                <div key={acc.id} style={S.adminCard}>
                  {editPassId===acc.id?(
                    <div>
                      <Field label="كلمة المرور الجديدة" value={editPassVal} onChange={setEditPassVal} type="password"/>
                      <div style={{display:"flex",gap:8}}><button className="btn-gold" onClick={()=>saveEditPass(acc.id)}>حفظ</button><button style={S.cancelBtn} onClick={()=>setEditPassId(null)}>إلغاء</button></div>
                    </div>
                  ):(
                    <div style={S.adminCardInner}>
                      <div style={S.adminCardInfo}><strong>{acc.label}</strong><span style={{color:"#aaa",fontSize:12,letterSpacing:2}}>{"•".repeat(acc.password.length)}</span></div>
                      <div style={S.adminActions}>
                        <button style={S.adminEditBtn} onClick={()=>{setEditPassId(acc.id);setEditPassVal("");}}><EditIcon/></button>
                        {adminAccounts.length>1&&<button style={S.adminDeleteBtn} onClick={()=>deleteAdmin(acc.id)}><TrashIcon/></button>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{...S.adminCard,marginTop:12}}>
                <p style={{fontWeight:700,color:"#7a5a10",marginBottom:12,fontSize:14}}>+ إضافة مدير جديد</p>
                <Field label="اسم المدير" placeholder="مثال: خالد" value={newAccLabel} onChange={setNewAccLabel}/>
                <div style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:14}}>
                  <div style={{flex:1}}><label style={S.label}>كلمة المرور</label><input style={S.input} value={generatedPass} readOnly placeholder="اضغط توليد"/></div>
                  <button style={S.genBtn} onClick={()=>setGeneratedPass(generatePass())}>توليد</button>
                </div>
                {accError&&<p style={S.error}>{accError}</p>}
                <button className="btn-gold" onClick={addAdmin}>إضافة</button>
              </div>
            </div>
          )}
        </div>
      )}

      <footer style={S.footer}>
        <p style={{margin:"0 0 4px"}}>{SITE_NAME} .. مساهمة مجتمعية</p>
        <p style={{margin:0,fontSize:11,fontWeight:400,color:"#aaa",fontFamily:"inherit",direction:"ltr"}}>by Mohammed Jilan Alkhiry</p>
      </footer>

      {shareCardEvent&&<ShareCardModal ev={shareCardEvent} onClose={()=>setShareCardEvent(null)} onWa={shareEventWa}/>}
      {showPoster&&<PosterModal events={allApproved} onClose={()=>setShowPoster(false)}/>}
    </div>
  );
}

// ── Poster ────────────────────────────────────────────────────────
function PosterModal({events,onClose}:{events:Event[];onClose:()=>void}) {
  const count = events.length;
  const nameFz = count<=5?14:count<=8?13:count<=12?11:count<=16?10:9;
  const metaFz = nameFz-1;
  const rowPad = count<=6?8:count<=10?6:count<=15?4:3;
  return (
    <div style={PM.overlay} onClick={onClose}>
      <div style={PM.wrap} onClick={e=>e.stopPropagation()}>
        <div style={PM.topBar}>
          <span style={{color:"#fff",fontSize:11}}>صوّر الشاشة لمشاركة البوستر</span>
          <button style={PM.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={PM.scrollArea}>
          <div style={PM.poster}>
            <div style={PM.stripe}/>
            <div style={PM.header}>
              <p style={PM.basmala}>﷽</p>
              <h1 style={PM.title}>{SITE_NAME}</h1>
              <p style={PM.sub}>قبيلة الخيرة — مركز دوقة</p>
            </div>
            <div style={PM.divider}>— ❖ —</div>
            <div>
              {events.map((ev,i)=>(
                <div key={ev.id} style={{display:"flex",alignItems:"flex-start",gap:8,padding:`${rowPad}px 12px`,background:i%2===0?"#ffffff":"#fdfaf3",borderBottom:"1px solid #f0e8d0"}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:"#c9a227",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,flexShrink:0,marginTop:2}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:nameFz,fontWeight:800,color:"#1a1208",lineHeight:1.3}}>{ev.name}</div>
                    <div style={{fontSize:metaFz,color:"#555",lineHeight:1.3}}>{ev.hijriDate} · {ev.venue}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={PM.divider}>— ❖ —</div>
            <div style={PM.foot}>
              <p style={PM.footText}>نبارك للعرسان ونتمنى لهم حياة سعيدة مباركة</p>
              <p style={PM.footSite}>{SITE_NAME} — مساهمة مجتمعية</p>
            </div>
            <div style={PM.stripe}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Share Card ────────────────────────────────────────────────────
function ShareCardModal({ev,onClose,onWa}:{ev:Event;onClose:()=>void;onWa:(e:Event)=>void}) {
  return (
    <div style={MC.overlay} onClick={onClose}>
      <div style={MC.modal} onClick={e=>e.stopPropagation()}>
        <button style={MC.closeBtn} onClick={onClose}>✕</button>
        <p style={{color:"#999",fontSize:12,textAlign:"center",marginBottom:14}}>صوّر الشاشة أو شارك عبر واتساب</p>
        <div style={MC.card}>
          <div style={MC.stripe}/>
          <div style={{textAlign:"center",padding:"14px 16px 4px"}}>
            <p style={{fontSize:20,color:"#c9a227",margin:"0 0 2px"}}>❧</p>
            <p style={{fontSize:11,color:"#aaa",margin:0}}>يسعدنا دعوتكم لحفل زواج</p>
          </div>
          <div style={MC.div}/>
          <h2 style={MC.name}>{ev.name}</h2>
          <div style={MC.div}/>
          <div style={{padding:"4px 18px 14px"}}>
            <div style={MC.row}><span>📅</span><span><strong>{ev.day}</strong> — {ev.hijriDate}</span></div>
            <div style={MC.row}><span>📍</span><span>{ev.venue}</span></div>
            {ev.notes&&<div style={MC.row}><span>📝</span><span style={{color:"#aaa",fontSize:12}}>{ev.notes}</span></div>}
          </div>
          <div style={{textAlign:"center",padding:"7px",borderTop:"1px solid #e8d9b5"}}>
            <span style={{fontSize:11,color:"#c9a227",fontWeight:700}}>{SITE_NAME}</span>
          </div>
          <div style={MC.stripe}/>
        </div>
        <button style={MC.waBtn} onClick={()=>onWa(ev)}><WaIcon/>&nbsp; مشاركة عبر واتساب</button>
      </div>
    </div>
  );
}

function ShareIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>; }
function SearchIcon({active}:{active:boolean}) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={active?"#fff":"#888"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function EditIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function WaIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0,display:"inline-block",verticalAlign:"middle"}}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>; }

function Field({label,placeholder,value,onChange,optional,type="text"}:{label:string;placeholder?:string;value:string;onChange:(v:string)=>void;optional?:boolean;type?:string}) {
  return (
    <div style={S.fieldGroup}>
      <label style={S.label}>{label}{optional&&<span style={{fontWeight:400,color:"#aaa",fontSize:12}}> (اختياري)</span>}</label>
      <input style={S.input} type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>
    </div>
  );
}
function HijriField({year,month,day,onChange}:{year:string;month:string;day:string;onChange:(y:string,m:string,d:string)=>void}) {
  return (
    <div style={S.fieldGroup}>
      <label style={S.label}>التاريخ الهجري *</label>
      <div style={{display:"flex",gap:8}}>
        <select style={{...S.select,flex:2}} value={year} onChange={e=>onChange(e.target.value,month,day)}><option value="">السنة</option>{HIJRI_YEARS.map(y=><option key={y} value={String(y)}>{y} هـ</option>)}</select>
        <select style={{...S.select,flex:3}} value={month} onChange={e=>onChange(year,e.target.value,day)}><option value="">الشهر</option>{HIJRI_MONTHS.map((m,i)=><option key={i} value={String(i+1).padStart(2,"0")}>{m}</option>)}</select>
        <select style={{...S.select,flex:2}} value={day} onChange={e=>onChange(year,month,e.target.value)}><option value="">اليوم</option>{Array.from({length:30},(_,i)=><option key={i+1} value={String(i+1).padStart(2,"0")}>{i+1}</option>)}</select>
      </div>
    </div>
  );
}

const S: Record<string,React.CSSProperties> = {
  root:{fontFamily:"'Tajawal',sans-serif",direction:"rtl",minHeight:"100vh",background:"#faf8f3",color:"#1a1208"},
  nav:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",background:"#fff",borderBottom:"2px solid #e8d9b5",position:"sticky",top:0,zIndex:200,boxShadow:"0 2px 8px rgba(0,0,0,0.05)"},
  navTitle:{fontSize:17,fontWeight:900,color:"#7a5a10"},
  hamburger:{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",gap:5,padding:6,width:40,alignItems:"flex-end"},
  overlayBg:{position:"fixed",inset:0,background:"rgba(0,0,0,0.38)",zIndex:300},
  sidebar:{position:"fixed",top:0,right:0,height:"100%",width:240,background:"#fff",zIndex:400,boxShadow:"-4px 0 20px rgba(0,0,0,0.1)",display:"flex",flexDirection:"column",padding:20,transition:"transform 0.28s ease",gap:2},
  sidebarHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:12,borderBottom:"1px solid #e8d9b5"},
  closeBtn:{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#aaa"},
  sideLink:{background:"none",border:"none",cursor:"pointer",color:"#1a1208",fontSize:15,fontWeight:600,padding:"12px 8px",textAlign:"right",borderRadius:8,fontFamily:"inherit",width:"100%"},
  container:{maxWidth:680,margin:"0 auto",padding:"0 16px 40px"},
  hero:{padding:"14px 4px 14px",borderBottom:"1px solid #f0e8d8",marginBottom:14},
  heroSub:{fontSize:13,color:"#aaa",marginBottom:12,lineHeight:1.7},
  section:{},
  sectionTitleRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},
  sectionTitle:{fontSize:15,fontWeight:800,color:"#1a1208",margin:0,display:"flex",alignItems:"center",gap:6},
  countBadge:{background:"#f5f0e8",color:"#8b6914",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,border:"1px solid #e8d9b5"},
  toolBtn:{width:32,height:32,borderRadius:"50%",background:"#f5f0e8",border:"1px solid #e8d9b5",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  toolBtnActive:{background:"#7a5a10",borderColor:"#7a5a10"},
  dropdown:{position:"absolute",top:38,left:0,background:"#fff",border:"1px solid #e8d9b5",borderRadius:12,padding:14,width:220,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:50},
  dropTitle:{fontWeight:700,color:"#7a5a10",fontSize:13,marginBottom:10},
  viewOpt:{display:"flex",alignItems:"center",gap:8,width:"100%",background:"none",border:"none",cursor:"pointer",padding:"9px 10px",borderRadius:7,fontFamily:"inherit",fontSize:13,fontWeight:600,color:"#555",textAlign:"right" as const},
  viewOptActive:{background:"#f5f0e8",color:"#7a5a10"},
  grid:{display:"flex",flexDirection:"column",gap:8},
  card:{background:"#fff",borderRadius:11,padding:"11px 13px",border:"1px solid #e8d9b5",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"},
  cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:7},
  cardName:{fontSize:14,fontWeight:800,color:"#6b4d0e",margin:0,flex:1,lineHeight:1.4,textAlign:"right"},
  shareIconBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:6,background:"transparent",border:"1.5px solid #e0cfa0",cursor:"pointer",color:"#c9a227",flexShrink:0},
  venueLink:{color:"#c9a227",fontWeight:600,textDecoration:"underline",textDecorationStyle:"dotted" as const,cursor:"pointer"},
  shareBtn:{background:"transparent",border:"1.5px solid #e0cfa0",color:"#8b6914",borderRadius:7,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:11,marginTop:7},
  cardRow:{display:"flex",alignItems:"center",gap:7,fontSize:12,color:"#444",marginBottom:4},
  cardIcon:{fontSize:11,flexShrink:0},
  notesText:{margin:"3px 0 0",fontSize:11,color:"#bbb",lineHeight:1.5},
  compactCard:{background:"#fff",borderRadius:8,padding:"7px 11px",border:"1px solid #e8d9b5",cursor:"pointer"},
  compactRow:{display:"flex",alignItems:"center",gap:8},
  compactName:{flex:1,fontWeight:700,fontSize:13,color:"#6b4d0e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const},
  compactDate:{color:"#444",fontSize:11,fontWeight:600,flexShrink:0,whiteSpace:"nowrap" as const},
  chevron:{color:"#c9a227",fontSize:9,transition:"transform 0.2s",flexShrink:0,marginRight:2},
  compactDetails:{marginTop:8,paddingTop:8,borderTop:"1px solid #f5ede0"},
  empty:{textAlign:"center",color:"#ccc",padding:28,fontSize:13},
  formWrap:{background:"#fff",borderRadius:16,padding:"22px 18px",border:"1px solid #e8d9b5",boxShadow:"0 2px 10px rgba(0,0,0,0.04)",marginTop:20},
  formTitle:{fontSize:19,fontWeight:800,color:"#6b4d0e",marginBottom:16,textAlign:"center"},
  fieldGroup:{marginBottom:14},
  label:{display:"block",fontWeight:700,color:"#1a1208",marginBottom:6,fontSize:13},
  labelErr:{color:"#e53e3e"},
  fieldErrMsg:{color:"#e53e3e",fontSize:11,marginTop:3,display:"block"},
  input:{width:"100%",padding:"9px 12px",border:"1.5px solid #e0cfa0",borderRadius:8,fontSize:13,background:"#fffdf7",color:"#1a1208",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  select:{width:"100%",padding:"9px 12px",border:"1.5px solid #e0cfa0",borderRadius:8,fontSize:13,background:"#fffdf7",color:"#1a1208",outline:"none",boxSizing:"border-box",fontFamily:"inherit"},
  textarea:{width:"100%",padding:"9px 12px",border:"1.5px solid #e0cfa0",borderRadius:8,fontSize:13,background:"#fffdf7",color:"#1a1208",outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"},
  error:{color:"#e53e3e",fontSize:12,textAlign:"center",marginBottom:8,padding:"8px",background:"#fff5f5",borderRadius:8,border:"1px solid #fed7d7"},
  waNotifyBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#25d366",color:"#fff",border:"none",borderRadius:10,padding:"14px",cursor:"pointer",fontFamily:"inherit",fontWeight:800,fontSize:15,width:"100%"},
  back:{background:"none",border:"none",cursor:"pointer",color:"#8b6914",fontSize:13,fontWeight:600,padding:0,marginBottom:10,fontFamily:"inherit",display:"block"},
  adminCard:{background:"#fff",borderRadius:10,padding:"11px 13px",border:"1px solid #e8d9b5",marginBottom:8},
  adminCardInner:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8},
  adminCardInfo:{display:"flex",flexDirection:"column",gap:3,flex:1},
  adminActions:{display:"flex",flexDirection:"column",gap:4,flexShrink:0},
  statusBadge:{display:"inline-block",padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,width:"fit-content"},
  adminEditBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:26,background:"#fdf8ee",border:"1px solid #e8d9b5",borderRadius:6,cursor:"pointer",color:"#8b6914"},
  adminToggleBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:26,border:"1px solid",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:700},
  adminDeleteBtn:{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:26,background:"#fff5f5",border:"1px solid #fdd",borderRadius:6,cursor:"pointer",color:"#c0392b"},
  cancelBtn:{background:"#f0f0f0",border:"none",borderRadius:8,padding:"8px 12px",cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:600},
  genBtn:{background:"#7a5a10",color:"#fff",border:"none",borderRadius:8,padding:"9px 12px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:13,whiteSpace:"nowrap" as const},
  tabs:{display:"flex",gap:5,marginBottom:12},
  tab:{flex:1,padding:"8px 4px",border:"1.5px solid #e8d9b5",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",color:"#aaa",display:"flex",alignItems:"center",justifyContent:"center",gap:4},
  tabActive:{background:"#7a5a10",color:"#fff",borderColor:"#7a5a10"},
  tabBadge:{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"1px 5px",fontSize:10},
  footer:{textAlign:"center",padding:"20px 16px",color:"#888",fontSize:12,borderTop:"1px solid #e8d9b5",marginTop:24,fontWeight:600},
};

const PM: Record<string,React.CSSProperties> = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:500,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"12px 16px",overflowY:"auto"},
  wrap:{width:"100%",maxWidth:360,paddingBottom:20},
  topBar:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,position:"sticky",top:0,zIndex:10},
  closeBtn:{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"},
  scrollArea:{borderRadius:12,overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.4)"},
  poster:{background:"#ffffff",fontFamily:"'Tajawal',sans-serif",direction:"rtl"},
  stripe:{height:6,background:"linear-gradient(to right,#c9a227,#f0d060,#c9a227)"},
  header:{textAlign:"center",padding:"14px 14px 8px"},
  basmala:{fontSize:14,color:"#c9a227",margin:"0 0 5px"},
  title:{fontSize:20,fontWeight:900,color:"#6b4d0e",margin:"0 0 3px"},
  sub:{fontSize:11,color:"#999",margin:0},
  divider:{textAlign:"center",color:"#c9a227",fontSize:11,letterSpacing:4,padding:"5px 0"},
  foot:{textAlign:"center",padding:"10px 14px 14px"},
  footText:{fontSize:11,color:"#555",margin:"0 0 3px"},
  footSite:{fontSize:10,color:"#c9a227",fontWeight:700,margin:0},
};

const MC: Record<string,React.CSSProperties> = {
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16},
  modal:{background:"#fff",borderRadius:18,padding:16,width:"100%",maxWidth:320,position:"relative",maxHeight:"90vh",overflowY:"auto"},
  closeBtn:{position:"absolute",top:10,left:10,background:"none",border:"none",fontSize:17,cursor:"pointer",color:"#aaa"},
  card:{background:"#fff",border:"2px solid #c9a227",borderRadius:12,overflow:"hidden"},
  stripe:{height:5,background:"linear-gradient(to right,#c9a227,#f0d060,#c9a227)"},
  div:{height:1,background:"linear-gradient(to right,transparent,#c9a227,transparent)",margin:"10px 18px"},
  name:{fontSize:19,fontWeight:900,color:"#6b4d0e",textAlign:"center",margin:"0 16px 6px",lineHeight:1.4},
  row:{display:"flex",alignItems:"flex-start",gap:8,fontSize:13,color:"#333",marginBottom:6,justifyContent:"center"},
  waBtn:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#25d366",color:"#fff",border:"none",borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:14,width:"100%",marginTop:12},
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; }
  .btn-gold { background: linear-gradient(135deg,#c9a227,#7a5a10); color:#fff; border:none; border-radius:9px; padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .btn-gold-sm { background: linear-gradient(135deg,#c9a227,#7a5a10); color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
  .btn-poster { display:block; width:100%; margin-top:14px; padding:10px; background:transparent; color:#8b6914; border:1.5px solid #e0cfa0; border-radius:9px; font-family:inherit; font-weight:700; font-size:13px; cursor:pointer; }
  .btn-poster:hover { background:#fdf8ee; }
  .card:hover { box-shadow:0 3px 12px rgba(0,0,0,0.07) !important; }
  input:focus,select:focus,textarea:focus { border-color:#c9a227 !important; box-shadow:0 0 0 3px rgba(201,162,39,0.1); }
  nav button span { display:block; width:20px; height:2px; background:#7a5a10; border-radius:2px; }
`;
