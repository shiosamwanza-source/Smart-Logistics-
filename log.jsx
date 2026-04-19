import { useState, useEffect } from "react";

// ============================================================
// PRICING DATABASE — Data halisi kutoka kwa Sado Faraji
// ============================================================
const PRICING_DB = [
  { id: 1, destination: "Temeke", tier: 1, basePrice: 470000, maxPrice: 490000, km: 18, timeRestriction: null, type: "Mjini", zone: null },
  { id: 2, destination: "Buguruni", tier: 1, basePrice: 470000, maxPrice: 490000, km: 16, timeRestriction: null, type: "Mjini", zone: null },
  { id: 3, destination: "Ilala", tier: 1, basePrice: 500000, maxPrice: 520000, km: 14, timeRestriction: null, type: "Mjini", zone: null },
  { id: 4, destination: "Magomeni / Sinza", tier: 1, basePrice: 500000, maxPrice: 520000, km: 15, timeRestriction: null, type: "Mjini", zone: null },
  { id: 5, destination: "Kariakoo", tier: 2, basePrice: 550000, maxPrice: 580000, km: 13, timeRestriction: "USIKU_TU", type: "Mjini", zone: null },
  { id: 6, destination: "Morocco / Ali Hassan Mwinyi", tier: 2, basePrice: 550000, maxPrice: 580000, km: 20, timeRestriction: null, type: "Mjini", zone: "Kinondoni" },
  { id: 7, destination: "Msasani", tier: 2, basePrice: 550000, maxPrice: 590000, km: 22, timeRestriction: null, type: "Mjini", zone: null },
  { id: 8, destination: "Mbezi Beach", tier: 2, basePrice: 600000, maxPrice: 650000, km: 28, timeRestriction: null, type: "Mjini", zone: "Kinondoni" },
  { id: 9, destination: "Salasala / IPTL", tier: 3, basePrice: 650000, maxPrice: 750000, km: 25, timeRestriction: null, type: "Viwanda", zone: null },
  { id: 10, destination: "Visiga Industrial", tier: 3, basePrice: 650000, maxPrice: 700000, km: 24, timeRestriction: null, type: "Viwanda", zone: null },
  { id: 11, destination: "Lake Steel / Kibaha Mwanzo", tier: 3, basePrice: 700000, maxPrice: 900000, km: 55, timeRestriction: null, type: "Viwanda", zone: "Kibaha" },
  { id: 12, destination: "Kibaha Kati", tier: 4, basePrice: 850000, maxPrice: 1000000, km: 65, timeRestriction: null, type: "Long Haul", zone: "Kibaha" },
  { id: 13, destination: "Kibaha Mbali", tier: 4, basePrice: 1000000, maxPrice: 1200000, km: 80, timeRestriction: null, type: "Long Haul", zone: "Kibaha" },
];

const TRUCKS = [
  { id: 1, plate: "T 123 AAA", owner: "Hassan Logistics", driverName: "Hassan Musa", rating: 4.8, trips: 67, status: "FOLENI", location: "African ICD", phone: "0712 345 678", type: ["20ft", "40ft"], specialRoutes: ["Msasani", "Salasala / IPTL", "Kariakoo"] },
  { id: 2, plate: "T 456 BBB", owner: "Juma Transport", driverName: "Juma Ally", rating: 4.2, trips: 12, status: "WAZI", location: "Tabata", phone: "0756 789 012", type: ["20ft"], specialRoutes: [] },
  { id: 3, plate: "T 789 CCC", owner: "Salim & Sons", driverName: "Salim Bakari", rating: 4.9, trips: 134, status: "INAKARIBIA", location: "Kariakoo → ICD (2km)", phone: "0744 234 567", type: ["20ft", "40ft"], specialRoutes: ["Kariakoo", "Ilala", "Temeke", "Mbezi Beach"] },
  { id: 4, plate: "T 321 DDD", owner: "Hamisi Cargo", driverName: "Hamisi Omar", rating: 3.8, trips: 28, status: "NJIANI", location: "Msasani → Mteja", phone: "0789 456 123", type: ["20ft"], specialRoutes: ["Morocco / Ali Hassan Mwinyi"] },
  { id: 5, plate: "T 654 EEE", owner: "Fatuma Logistics", driverName: "Said Fatuma", rating: 4.6, trips: 89, status: "WAZI", location: "Buguruni", phone: "0765 321 987", type: ["20ft", "40ft"], specialRoutes: ["Buguruni", "Temeke", "Visiga Industrial"] },
];

// ============================================================
// HELPERS
// ============================================================
const formatTZS = (amount) => `TZS ${amount.toLocaleString()}`;

const getStatusColor = (status) => {
  switch (status) {
    case "WAZI": return "#22c55e";
    case "FOLENI": return "#eab308";
    case "NJIANI": return "#ef4444";
    case "INAKARIBIA": return "#3b82f6";
    case "HAIFANYI": return "#6b7280";
    default: return "#6b7280";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "WAZI": return "●";
    case "FOLENI": return "◐";
    case "NJIANI": return "▶";
    case "INAKARIBIA": return "◎";
    case "HAIFANYI": return "✕";
    default: return "○";
  }
};

const getDemandLevel = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 10) return { level: "JUU", factor: 1.15, color: "#ef4444" };
  if (hour >= 14 && hour <= 17) return { level: "WASTANI", factor: 1.05, color: "#eab308" };
  return { level: "KAWAIDA", factor: 1.0, color: "#22c55e" };
};

const isKariakooAvailable = () => {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 5;
};

const getClientPremium = (clientType) => {
  switch (clientType) {
    case "KUBWA": return 150000;
    case "KATI": return 75000;
    default: return 0;
  }
};

// ============================================================
// COMPONENTS
// ============================================================

const StatusBadge = ({ status }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: "5px",
    padding: "3px 10px", borderRadius: "20px", fontSize: "11px",
    fontWeight: "700", letterSpacing: "1px",
    color: getStatusColor(status),
    border: `1px solid ${getStatusColor(status)}22`,
    background: `${getStatusColor(status)}11`,
  }}>
    <span style={{ fontSize: "8px" }}>{getStatusIcon(status)}</span>
    {status}
  </span>
);

// ============================================================
// SCREEN: LOGIN
// ============================================================
const LoginScreen = ({ onLogin }) => {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0a",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "24px",
      fontFamily: "'Courier New', monospace",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: "48px" }}>
        <div style={{
          width: "64px", height: "64px", margin: "0 auto 16px",
          background: "#f97316", borderRadius: "16px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "28px",
        }}>🚛</div>
        <div style={{ color: "#f97316", fontSize: "22px", fontWeight: "900", letterSpacing: "3px" }}>
          SMART LOGISTICS
        </div>
        <div style={{ color: "#444", fontSize: "11px", letterSpacing: "5px", marginTop: "4px" }}>
          LOG — DAR ES SALAAM
        </div>
      </div>

      {/* Role Selection */}
      {!role ? (
        <div style={{ width: "100%", maxWidth: "340px" }}>
          <div style={{ color: "#666", fontSize: "11px", letterSpacing: "3px", textAlign: "center", marginBottom: "24px" }}>
            CHAGUA AINA YAKO
          </div>
          <button onClick={() => setRole("agent")} style={{
            width: "100%", padding: "20px", marginBottom: "12px",
            background: "transparent", border: "1px solid #222",
            borderRadius: "12px", cursor: "pointer", textAlign: "left",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#f97316"; e.currentTarget.style.background = "#f9731611"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ color: "#f97316", fontSize: "20px", marginBottom: "6px" }}>📦</div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}>Agent / Cargo Owner</div>
            <div style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>Tuma kazi — tafuta gari</div>
          </button>
          <button onClick={() => setRole("truck")} style={{
            width: "100%", padding: "20px",
            background: "transparent", border: "1px solid #222",
            borderRadius: "12px", cursor: "pointer", textAlign: "left",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#3b82f611"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#222"; e.currentTarget.style.background = "transparent"; }}
          >
            <div style={{ color: "#3b82f6", fontSize: "20px", marginBottom: "6px" }}>🚛</div>
            <div style={{ color: "#fff", fontSize: "14px", fontWeight: "700" }}>Truck Owner / Driver</div>
            <div style={{ color: "#666", fontSize: "11px", marginTop: "4px" }}>Pokea kazi — pata pesa</div>
          </button>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "340px" }}>
          <button onClick={() => setRole(null)} style={{
            background: "none", border: "none", color: "#666",
            cursor: "pointer", marginBottom: "24px", fontSize: "12px",
            letterSpacing: "2px",
          }}>← RUDI</button>
          <div style={{ color: "#fff", fontSize: "14px", marginBottom: "6px" }}>Jina lako</div>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder={role === "agent" ? "Sado Faraji / Jina la Kampuni" : "Jina la Mmiliki"}
            style={{
              width: "100%", padding: "14px", marginBottom: "12px",
              background: "#111", border: "1px solid #222", borderRadius: "8px",
              color: "#fff", fontSize: "14px", fontFamily: "'Courier New', monospace",
              boxSizing: "border-box",
            }} />
          <div style={{ color: "#fff", fontSize: "14px", marginBottom: "6px" }}>Namba ya Simu</div>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="07XX XXX XXX"
            style={{
              width: "100%", padding: "14px", marginBottom: "24px",
              background: "#111", border: "1px solid #222", borderRadius: "8px",
              color: "#fff", fontSize: "14px", fontFamily: "'Courier New', monospace",
              boxSizing: "border-box",
            }} />
          <button
            onClick={() => name && phone && onLogin({ role, name, phone })}
            style={{
              width: "100%", padding: "16px",
              background: name && phone ? (role === "agent" ? "#f97316" : "#3b82f6") : "#222",
              border: "none", borderRadius: "8px", color: "#000",
              fontSize: "13px", fontWeight: "900", letterSpacing: "3px",
              cursor: name && phone ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>
            INGIA MFUMONI
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// SCREEN: AGENT DASHBOARD
// ============================================================
const AgentDashboard = ({ user, onNavigate }) => {
  const demand = getDemandLevel();
  const hour = new Date().getHours();
  const kariakooAvailable = isKariakooAvailable();

  return (
    <div style={{ padding: "20px", fontFamily: "'Courier New', monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>
        <div>
          <div style={{ color: "#666", fontSize: "10px", letterSpacing: "3px" }}>KARIBU,</div>
          <div style={{ color: "#fff", fontSize: "18px", fontWeight: "900" }}>{user.name}</div>
        </div>
        <div style={{
          padding: "6px 12px", borderRadius: "20px", fontSize: "10px",
          letterSpacing: "2px", fontWeight: "700",
          color: demand.color, border: `1px solid ${demand.color}33`,
          background: `${demand.color}11`,
        }}>
          DEMAND: {demand.level}
        </div>
      </div>

      {/* Kariakoo Warning */}
      {!kariakooAvailable && (
        <div style={{
          background: "#eab30811", border: "1px solid #eab30833",
          borderRadius: "10px", padding: "14px", marginBottom: "20px",
          display: "flex", gap: "10px", alignItems: "flex-start",
        }}>
          <span style={{ fontSize: "18px" }}>🌙</span>
          <div>
            <div style={{ color: "#eab308", fontSize: "12px", fontWeight: "700" }}>KARIAKOO — USIKU TU</div>
            <div style={{ color: "#888", fontSize: "11px", marginTop: "3px" }}>
              Delivery ya Kariakoo inaanza 8:00PM. Sasa: {hour}:00
            </div>
          </div>
        </div>
      )}

      {/* Post Job Button */}
      <button onClick={() => onNavigate("postJob")} style={{
        width: "100%", padding: "20px",
        background: "linear-gradient(135deg, #f97316, #ea580c)",
        border: "none", borderRadius: "14px",
        color: "#000", fontSize: "15px", fontWeight: "900",
        letterSpacing: "2px", cursor: "pointer",
        marginBottom: "20px", boxShadow: "0 4px 24px #f9731644",
      }}>
        + TUMA KAZI MPYA
      </button>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "28px" }}>
        {[
          { label: "KAZI ZA LEO", value: "3", color: "#f97316" },
          { label: "ZILIZOKAMILIKA", value: "12", color: "#22c55e" },
          { label: "RATING YAKO", value: "4.7★", color: "#eab308" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "#111", border: "1px solid #1a1a1a",
            borderRadius: "10px", padding: "14px", textAlign: "center",
          }}>
            <div style={{ color: stat.color, fontSize: "18px", fontWeight: "900" }}>{stat.value}</div>
            <div style={{ color: "#444", fontSize: "9px", letterSpacing: "1px", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div style={{ color: "#444", fontSize: "10px", letterSpacing: "3px", marginBottom: "14px" }}>
        KAZI ZA HIVI KARIBUNI
      </div>
      {[
        { dest: "Msasani", status: "NJIANI", price: 550000, truck: "T 123 AAA", time: "Saa 2 iliyopita" },
        { dest: "Lake Steel", status: "ZILIZOKAMILIKA", price: 870000, truck: "T 654 EEE", time: "Jana" },
        { dest: "Kariakoo", status: "IMEHIFADHIWA", price: 550000, truck: "T 789 CCC", time: "Usiku wa leo" },
      ].map((job, i) => (
        <div key={i} style={{
          background: "#111", border: "1px solid #1a1a1a",
          borderRadius: "10px", padding: "14px", marginBottom: "8px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ color: "#fff", fontSize: "13px", fontWeight: "700" }}>→ {job.dest}</div>
            <div style={{ color: "#555", fontSize: "10px", marginTop: "3px" }}>{job.truck} · {job.time}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#f97316", fontSize: "12px", fontWeight: "700" }}>
              {formatTZS(job.price)}
            </div>
            <div style={{
              color: job.status === "NJIANI" ? "#3b82f6" : job.status === "ZILIZOKAMILIKA" ? "#22c55e" : "#eab308",
              fontSize: "9px", letterSpacing: "1px", marginTop: "3px",
            }}>{job.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// SCREEN: POST JOB
// ============================================================
const PostJobScreen = ({ user, onNavigate, onJobPosted }) => {
  const [step, setStep] = useState(1);
  const [origin, setOrigin] = useState("African ICD");
  const [destSearch, setDestSearch] = useState("");
  const [selectedDest, setSelectedDest] = useState(null);
  const [containerType, setContainerType] = useState(null);
  const [timing, setTiming] = useState(null);
  const [clientType, setClientType] = useState("MPYA");
  const [showPricing, setShowPricing] = useState(false);

  const demand = getDemandLevel();
  const filteredDests = PRICING_DB.filter(d =>
    d.destination.toLowerCase().includes(destSearch.toLowerCase())
  );

  const calculatePrice = () => {
    if (!selectedDest) return null;
    const base = selectedDest.basePrice;
    const demandAdd = Math.round((base * (demand.factor - 1)));
    const clientAdd = getClientPremium(clientType);
    const containerAdd = containerType === "40ft" && selectedDest.km <= 30 ? 100000 : 0;
    return {
      min: base,
      suggested: base + demandAdd + Math.round(clientAdd * 0.5),
      max: selectedDest.maxPrice + demandAdd + clientAdd + containerAdd,
      demandAdd,
      clientAdd,
      containerAdd,
    };
  };

  const pricing = calculatePrice();

  const isKariakoo = selectedDest?.timeRestriction === "USIKU_TU";
  const kariakooAvailable = isKariakooAvailable();

  return (
    <div style={{ padding: "20px", fontFamily: "'Courier New', monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
        <button onClick={() => onNavigate("agentDash")} style={{
          background: "none", border: "none", color: "#f97316",
          cursor: "pointer", fontSize: "18px", padding: "0",
        }}>←</button>
        <div>
          <div style={{ color: "#fff", fontSize: "16px", fontWeight: "900" }}>TUMA KAZI MPYA</div>
          <div style={{ color: "#444", fontSize: "10px", letterSpacing: "2px" }}>HATUA {step} / 3</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "28px" }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: "3px", borderRadius: "2px",
            background: s <= step ? "#f97316" : "#1a1a1a",
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* STEP 1: Origin + Destination */}
      {step === 1 && (
        <div>
          <div style={{ color: "#666", fontSize: "10px", letterSpacing: "3px", marginBottom: "16px" }}>
            CHANZO CHA KONTENA
          </div>
          {["African ICD", "TICTS", "TPA Kurasini", "Nyingine"].map(o => (
            <button key={o} onClick={() => setOrigin(o)} style={{
              width: "100%", padding: "14px", marginBottom: "8px",
              background: origin === o ? "#f9731611" : "transparent",
              border: `1px solid ${origin === o ? "#f97316" : "#1a1a1a"}`,
              borderRadius: "8px", color: origin === o ? "#f97316" : "#666",
              fontSize: "13px", cursor: "pointer", textAlign: "left",
              fontFamily: "'Courier New', monospace",
            }}>{o}</button>
          ))}

          <div style={{ color: "#666", fontSize: "10px", letterSpacing: "3px", margin: "20px 0 12px" }}>
            DESTINATION
          </div>
          <input
            value={destSearch}
            onChange={e => setDestSearch(e.target.value)}
            placeholder="Tafuta... (Msasani, Kibaha, nk)"
            style={{
              width: "100%", padding: "14px", marginBottom: "8px",
              background: "#111", border: "1px solid #222", borderRadius: "8px",
              color: "#fff", fontSize: "13px", fontFamily: "'Courier New', monospace",
              boxSizing: "border-box",
            }}
          />
          {destSearch && filteredDests.map(dest => (
            <button key={dest.id} onClick={() => {
              setSelectedDest(dest);
              setDestSearch(dest.destination);
            }} style={{
              width: "100%", padding: "12px 14px", marginBottom: "4px",
              background: selectedDest?.id === dest.id ? "#f9731611" : "#0d0d0d",
              border: `1px solid ${selectedDest?.id === dest.id ? "#f97316" : "#1a1a1a"}`,
              borderRadius: "8px", cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: "'Courier New', monospace",
            }}>
