import { useState, useEffect } from “react”;

const ADMIN_PASSWORD = “admin1234”;
const DAYS = [“الأحد”, “الإثنين”, “الثلاثاء”, “الأربعاء”, “الخميس”, “الجمعة”, “السبت”];

interface Event {
id: string;
name: string;
hijriDate: string;
day: string;
phone: string;
venue: string;
mapLink: string;
notes: string;
status: “pending” | “approved”;
createdAt: number;
}

interface FormData {
name: string;
hijriDate: string;
day: string;
phone: string;
venue: string;
mapLink: string;
notes: string;
}

const initialForm: FormData = {
name: “”, hijriDate: “”, day: “”, phone: “”, venue: “”, mapLink: “”, notes: “”,
};

function generateId(): string {
return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function App() {
const [page, setPage] = useState(“home”);
const [events, setEvents] = useState<Event[]>([]);
const [form, setForm] = useState<FormData>(initialForm);
const [formError, setFormError] = useState(””);
const [formSuccess, setFormSuccess] = useState(false);
const [adminPass, setAdminPass] = useState(””);
const [adminError, setAdminError] = useState(””);
const [editingId, setEditingId] = useState<string | null>(null);
const [editForm, setEditForm] = useState<FormData>(initialForm);
const [loading, setLoading] = useState(true);

useEffect(() => {
(async () => {
try {
const result = await window.storage.get(“manasbat_events”);
if (result) setEvents(JSON.parse(result.value));
} catch {}
setLoading(false);
})();
}, []);

const saveEvents = async (updated: Event[]) => {
setEvents(updated);
try {
await window.storage.set(“manasbat_events”, JSON.stringify(updated));
} catch {}
};

const approvedEvents = events.filter((e) => e.status === “approved”);

const handleSubmit = async () => {
if (!form.name || !form.hijriDate || !form.day || !form.phone || !form.venue) {
setFormError(“يرجى تعبئة جميع الحقول الإلزامية”);
return;
}
const newEvent: Event = { …form, id: generateId(), status: “pending”, createdAt: Date.now() };
await saveEvents([…events, newEvent]);
setForm(initialForm);
setFormError(””);
setFormSuccess(true);
setTimeout(() => { setFormSuccess(false); setPage(“home”); }, 2500);
};

const handleLogin = () => {
if (adminPass === ADMIN_PASSWORD) { setPage(“admin”); setAdminError(””); setAdminPass(””); }
else setAdminError(“كلمة المرور غير صحيحة”);
};

const toggleApprove = async (id: string) => {
const updated = events.map((e) =>
e.id === id ? { …e, status: (e.status === “approved” ? “pending” : “approved”) as “pending” | “approved” } : e
);
await saveEvents(updated);
};

const deleteEvent = async (id: string) => {
await saveEvents(events.filter((e) => e.id !== id));
};

const startEdit = (ev: Event) => { setEditingId(ev.id); setEditForm({ …ev }); };

const saveEdit = async () => {
if (!editingId) return;
await saveEvents(
events.map((e) =>
e.id === editingId ? { …editForm, id: editingId, status: e.status, createdAt: e.createdAt } : e
)
);
setEditingId(null);
};

return (
<div style={styles.root}>
<style>{css}</style>

```
  <nav style={styles.nav}>
    <button style={styles.navBtn} onClick={() => setPage("home")}>الرئيسية</button>
    <div style={styles.navTitle}>منصة مناسبات</div>
    <button style={styles.navBtn} onClick={() => setPage("login")}>الإدارة</button>
  </nav>

  {page === "home" && (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.heroOrb} />
        <h1 style={styles.heroTitle}>منصة مناسبات</h1>
        <p style={styles.heroSub}>المنصة الرسمية لإعلانات مناسبات الأفراح</p>
        <button className="btn-gold" onClick={() => setPage("register")}>✦ تسجيل مناسبة جديدة</button>
      </div>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>المناسبات المعتمدة</h2>
        <p style={styles.sectionSub}>نبارك للعرسان ونتمنى لهم حياة سعيدة</p>
        {loading && <p style={styles.empty}>جاري التحميل...</p>}
        {!loading && approvedEvents.length === 0 && <p style={styles.empty}>لا توجد مناسبات معتمدة حتى الآن</p>}
        <div style={styles.grid}>
          {approvedEvents.map((ev) => (
            <div key={ev.id} className="card" style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardName}>{ev.name}</h3>
                <a href={`https://wa.me/966${ev.phone.replace(/^0/, "")}`} target="_blank" rel="noreferrer" style={styles.waBtn}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
              <div style={styles.cardRow}><span style={styles.cardIcon}>📅</span><span>{ev.day}، {ev.hijriDate}</span></div>
              <div style={styles.cardRow}>
                <span style={styles.cardIcon}>📍</span><span>{ev.venue}</span>
                {ev.mapLink && <a href={ev.mapLink} target="_blank" rel="noreferrer" style={styles.mapLink}>خريطة</a>}
              </div>
              <div style={styles.cardRow}><span style={styles.cardIcon}>📞</span><span>{ev.phone}</span></div>
              {ev.notes && <div style={styles.cardNotes}>{ev.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

  {page === "register" && (
    <div style={styles.container}>
      <div style={styles.formWrap}>
        <button style={styles.back} onClick={() => setPage("home")}>← العودة</button>
        <h2 style={styles.formTitle}>تسجيل مناسبة جديدة</h2>
        {formSuccess ? (
          <div style={styles.successBox}>✅ تم إرسال طلبك بنجاح! سيتم مراجعته من قبل الإدارة.</div>
        ) : (
          <>
            <Field label="اسم صاحب المناسبة *" placeholder="مثال: فلان بن فلان الفلاني" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="التاريخ الهجري *" placeholder="مثال: 1447/05/20" value={form.hijriDate} onChange={(v) => setForm({ ...form, hijriDate: v })} hint="يمكن الكتابة بأي صيغة: 1447/5/20 أو 20/5/1447" />
            <div style={styles.fieldGroup}>
              <label style={styles.label}>اليوم *</label>
              <select style={styles.select} value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                <option value="">اختر اليوم</option>
                {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <Field label="رقم الجوال للتواصل *" placeholder="0500000000" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="عنوان المناسبة (القاعة / المدينة) *" placeholder="مثال: قاعة ليلتي، الرياض" value={form.venue} onChange={(v) => setForm({ ...form, venue: v })} />
            <Field label="رابط موقع القاعة على الخريطة" placeholder="https://maps.google.com/..." value={form.mapLink} onChange={(v) => setForm({ ...form, mapLink: v })} optional />
            <div style={styles.fieldGroup}>
              <label style={styles.label}>ملاحظات إضافية <span style={styles.optional}>(اختياري)</span></label>
              <textarea style={styles.textarea} placeholder="أي تفاصيل أخرى ترغب بإضافتها..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>
            {formError && <p style={styles.error}>{formError}</p>}
            <button className="btn-gold" style={{ width: "100%", marginTop: 8 }} onClick={handleSubmit}>إرسال الطلب</button>
          </>
        )}
      </div>
    </div>
  )}

  {page === "login" && (
    <div style={styles.container}>
      <div style={styles.formWrap}>
        <h2 style={styles.formTitle}>دخول الإدارة</h2>
        <Field label="كلمة المرور" placeholder="أدخل كلمة المرور" value={adminPass} onChange={(v) => setAdminPass(v)} type="password" />
        {adminError && <p style={styles.error}>{adminError}</p>}
        <button className="btn-gold" style={{ width: "100%" }} onClick={handleLogin}>دخول</button>
        <button style={styles.back} onClick={() => setPage("home")}>← العودة</button>
      </div>
    </div>
  )}

  {page === "admin" && (
    <div style={styles.container}>
      <div style={styles.adminHeader}>
        <button style={styles.back} onClick={() => setPage("home")}>← العودة للرئيسية</button>
        <h2 style={styles.formTitle}>لوحة تحكم الإدارة</h2>
        <p style={styles.sectionSub}>مراجعة وإدارة كافة المناسبات</p>
      </div>
      {events.length === 0 && <p style={styles.empty}>لا توجد طلبات بعد</p>}
      <div style={styles.tableWrap}>
        {[...events].sort((a, b) => b.createdAt - a.createdAt).map((ev) => (
          <div key={ev.id} style={styles.adminCard}>
            {editingId === ev.id ? (
              <div style={styles.editWrap}>
                <Field label="الاسم" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
                <Field label="التاريخ الهجري" value={editForm.hijriDate} onChange={(v) => setEditForm({ ...editForm, hijriDate: v })} />
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>اليوم</label>
                  <select style={styles.select} value={editForm.day} onChange={(e) => setEditForm({ ...editForm, day: e.target.value })}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <Field label="رقم الجوال" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                <Field label="العنوان" value={editForm.venue} onChange={(v) => setEditForm({ ...editForm, venue: v })} />
                <Field label="رابط الخريطة" value={editForm.mapLink} onChange={(v) => setEditForm({ ...editForm, mapLink: v })} />
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>ملاحظات</label>
                  <textarea style={styles.textarea} value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-gold" onClick={saveEdit}>حفظ</button>
                  <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>إلغاء</button>
                </div>
              </div>
            ) : (
              <div style={styles.adminCardInner}>
                <div style={styles.adminCardInfo}>
                  <span style={{ ...styles.statusBadge, background: ev.status === "approved" ? "#d4edda" : "#fff3cd", color: ev.status === "approved" ? "#155724" : "#856404" }}>
                    {ev.status === "approved" ? "مُعتمدة" : "قيد المراجعة"}
                  </span>
                  <strong style={{ fontSize: 16 }}>{ev.name}</strong>
                  <span style={{ color: "#888", fontSize: 13 }}>{ev.day}، {ev.hijriDate}</span>
                  <span style={{ color: "#666", fontSize: 13 }}>📍 {ev.venue}</span>
                  <span style={{ color: "#666", fontSize: 13 }}>📞 {ev.phone}</span>
                  {ev.notes && <span style={{ color: "#999", fontSize: 12, fontStyle: "italic" }}>{ev.notes}</span>}
                </div>
                <div style={styles.adminActions}>
                  <button style={styles.editBtn} onClick={() => startEdit(ev)}>✏️</button>
                  <button style={{ ...styles.toggleBtn, background: ev.status === "approved" ? "#fff3cd" : "#d4edda", color: ev.status === "approved" ? "#856404" : "#155724" }} onClick={() => toggleApprove(ev.id)}>
                    {ev.status === "approved" ? "🚫" : "✅"}
                  </button>
                  <button style={styles.deleteBtn} onClick={() => deleteEvent(ev.id)}>🗑️</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )}

  <footer style={styles.footer}>منصة مناسبات — مساهمة مجتمعية</footer>
</div>
```

);
}

interface FieldProps {
label: string;
placeholder?: string;
value: string;
onChange: (v: string) => void;
hint?: string;
optional?: boolean;
type?: string;
}

function Field({ label, placeholder, value, onChange, hint, optional, type = “text” }: FieldProps) {
return (
<div style={styles.fieldGroup}>
<label style={styles.label}>{label} {optional && <span style={styles.optional}>(اختياري)</span>}</label>
<input style={styles.input} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
{hint && <small style={styles.hint}>{hint}</small>}
</div>
);
}

const styles: Record<string, React.CSSProperties> = {
root: { fontFamily: “‘Tajawal’, sans-serif”, direction: “rtl”, minHeight: “100vh”, background: “#f8f5f0”, color: “#2c2416” },
nav: { display: “flex”, justifyContent: “space-between”, alignItems: “center”, padding: “14px 24px”, background: “#fff”, borderBottom: “2px solid #e8d9b5”, position: “sticky”, top: 0, zIndex: 100, boxShadow: “0 2px 12px rgba(0,0,0,0.05)” },
navTitle: { fontSize: 20, fontWeight: 800, color: “#8b6914” },
navBtn: { background: “none”, border: “none”, cursor: “pointer”, color: “#8b6914”, fontSize: 14, fontWeight: 600, padding: “6px 10px”, fontFamily: “inherit” },
container: { maxWidth: 680, margin: “0 auto”, padding: “24px 16px 40px” },
hero: { textAlign: “center”, padding: “48px 24px 40px”, position: “relative”, overflow: “hidden” },
heroOrb: { position: “absolute”, top: 0, left: “50%”, transform: “translateX(-50%)”, width: 300, height: 300, borderRadius: “50%”, background: “radial-gradient(circle, #f0e0a0 0%, transparent 70%)”, opacity: 0.5, pointerEvents: “none” },
heroTitle: { fontSize: 38, fontWeight: 900, color: “#7a5a10”, margin: “0 0 8px” },
heroSub: { fontSize: 16, color: “#9a7a3a”, marginBottom: 28 },
section: { marginTop: 16 },
sectionTitle: { textAlign: “center”, fontSize: 24, fontWeight: 800, color: “#2c2416”, marginBottom: 6 },
sectionSub: { textAlign: “center”, color: “#9a7a3a”, fontSize: 14, marginBottom: 28 },
grid: { display: “flex”, flexDirection: “column”, gap: 16 },
card: { background: “#fff”, borderRadius: 16, padding: “20px 22px”, border: “1px solid #e8d9b5”, boxShadow: “0 2px 16px rgba(0,0,0,0.04)” },
cardHeader: { display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, marginBottom: 14 },
cardName: { fontSize: 18, fontWeight: 800, color: “#7a5a10”, margin: 0, flex: 1 },
waBtn: { display: “flex”, alignItems: “center”, justifyContent: “center”, width: 38, height: 38, borderRadius: “50%”, background: “#25d366”, color: “#fff”, textDecoration: “none”, flexShrink: 0 },
cardRow: { display: “flex”, alignItems: “center”, gap: 8, fontSize: 14, color: “#555”, marginBottom: 8 },
cardIcon: { fontSize: 16, flexShrink: 0 },
mapLink: { color: “#8b6914”, fontSize: 12, textDecoration: “underline”, marginRight: “auto” },
cardNotes: { marginTop: 10, padding: “8px 12px”, background: “#fdf8ee”, borderRadius: 8, fontSize: 13, color: “#776040”, borderRight: “3px solid #d4aa50” },
empty: { textAlign: “center”, color: “#aaa”, padding: 40, fontSize: 15 },
formWrap: { background: “#fff”, borderRadius: 20, padding: “32px 28px”, border: “1px solid #e8d9b5”, boxShadow: “0 4px 24px rgba(0,0,0,0.05)” },
formTitle: { fontSize: 24, fontWeight: 800, color: “#7a5a10”, marginBottom: 24, textAlign: “center” },
fieldGroup: { marginBottom: 20 },
label: { display: “block”, fontWeight: 700, color: “#2c2416”, marginBottom: 8, fontSize: 14 },
optional: { fontWeight: 400, color: “#aaa”, fontSize: 12 },
input: { width: “100%”, padding: “11px 14px”, border: “1.5px solid #e0cfa0”, borderRadius: 10, fontSize: 14, background: “#fffdf7”, color: “#2c2416”, outline: “none”, boxSizing: “border-box”, fontFamily: “inherit” },
select: { width: “100%”, padding: “11px 14px”, border: “1.5px solid #e0cfa0”, borderRadius: 10, fontSize: 14, background: “#fffdf7”, color: “#2c2416”, outline: “none”, boxSizing: “border-box”, fontFamily: “inherit” },
textarea: { width: “100%”, padding: “11px 14px”, border: “1.5px solid #e0cfa0”, borderRadius: 10, fontSize: 14, background: “#fffdf7”, color: “#2c2416”, outline: “none”, boxSizing: “border-box”, fontFamily: “inherit”, resize: “vertical” },
hint: { color: “#aaa”, fontSize: 11, marginTop: 4, display: “block” },
error: { color: “#c0392b”, fontSize: 13, textAlign: “center”, marginBottom: 12 },
successBox: { background: “#d4edda”, border: “1px solid #c3e6cb”, borderRadius: 12, padding: 20, textAlign: “center”, color: “#155724”, fontSize: 15, fontWeight: 600 },
back: { background: “none”, border: “none”, cursor: “pointer”, color: “#8b6914”, fontSize: 14, fontWeight: 600, padding: 0, marginBottom: 20, fontFamily: “inherit”, display: “block” },
adminHeader: { marginBottom: 24 },
adminCard: { background: “#fff”, borderRadius: 14, padding: “16px 20px”, border: “1px solid #e8d9b5”, marginBottom: 12, boxShadow: “0 1px 8px rgba(0,0,0,0.04)” },
adminCardInner: { display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, gap: 12 },
adminCardInfo: { display: “flex”, flexDirection: “column”, gap: 4, flex: 1 },
adminActions: { display: “flex”, flexDirection: “column”, gap: 6, flexShrink: 0 },
statusBadge: { display: “inline-block”, padding: “3px 10px”, borderRadius: 20, fontSize: 12, fontWeight: 700 },
editBtn: { background: “#f0f4ff”, border: “none”, borderRadius: 8, width: 36, height: 36, cursor: “pointer”, fontSize: 16 },
toggleBtn: { border: “none”, borderRadius: 8, width: 36, height: 36, cursor: “pointer”, fontSize: 16 },
deleteBtn: { background: “#fff0f0”, border: “none”, borderRadius: 8, width: 36, height: 36, cursor: “pointer”, fontSize: 16 },
editWrap: { width: “100%” },
cancelBtn: { background: “#f0f0f0”, border: “none”, borderRadius: 10, padding: “9px 18px”, cursor: “pointer”, fontSize: 14, fontFamily: “inherit”, fontWeight: 600 },
tableWrap: { marginTop: 8 },
footer: { textAlign: “center”, padding: “24px 16px”, color: “#bbb”, fontSize: 13, borderTop: “1px solid #e8d9b5”, marginTop: 40 },
};

const css = `
@import url(‘https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap’);

- { box-sizing: border-box; }
  .btn-gold { background: linear-gradient(135deg, #c9a227, #8b6914); color: #fff; border: none; border-radius: 12px; padding: 13px 28px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: inherit; transition: opacity 0.2s, transform 0.1s; box-shadow: 0 4px 16px rgba(201,162,39,0.25); }
  .btn-gold:hover { opacity: 0.9; transform: translateY(-1px); }
  .card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.08) !important; }
  input:focus, select:focus, textarea:focus { border-color: #c9a227 !important; box-shadow: 0 0 0 3px rgba(201,162,39,0.12); }
  `;
