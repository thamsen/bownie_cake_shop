import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */
const BROWNIES = [
  { id: 1, name: "Classic Fudge",    price: 149, desc: "Rich dark chocolate, dense and gooey center with a crinkly top.",           emoji: "🍫", tag: "Bestseller", color: "#3d1c0a" },
  { id: 2, name: "Walnut Crunch",    price: 169, desc: "Loaded with toasted walnuts for that perfect crunch in every bite.",          emoji: "🥜", tag: "Nutty",      color: "#2d1a00" },
  { id: 3, name: "Red Velvet",       price: 179, desc: "Velvety cocoa base with cream cheese swirl. A showstopper.",                  emoji: "❤️", tag: "Premium",    color: "#7a1a1a" },
  { id: 4, name: "Salted Caramel",   price: 189, desc: "Gooey caramel ribbons topped with flaky sea salt. Irresistible.",             emoji: "🧂", tag: "New",        color: "#5a3800" },
  { id: 5, name: "Oreo Dream",       price: 179, desc: "Crushed Oreos baked right in — cookies meet brownies.",                       emoji: "⚫", tag: "Fan Fav",    color: "#1a1a1a" },
  { id: 6, name: "Peanut Butter",    price: 169, desc: "Creamy peanut butter swirled through rich chocolate batter.",                 emoji: "🥜", tag: "Creamy",     color: "#4a2800" },
];

const REVIEWS = [
  { name: "Priya S.",   stars: 5, text: "The salted caramel brownies are absolutely divine. Ordered twice this week!", city: "Chennai" },
  { name: "Rahul M.",   stars: 5, text: "Soft, fudgy and delivered on time. My family is obsessed!", city: "Bangalore" },
  { name: "Ananya K.",  stars: 5, text: "Red Velvet brownies for my daughter's birthday — everyone loved them!", city: "Chennai" },
  { name: "Vikram P.",  stars: 4, text: "Classic Fudge is the best brownie I've ever had. Pure chocolate bliss.", city: "Hyderabad" },
];

const SYSTEM_PROMPT = `You are "Cocoa", the friendly AI assistant for Brownie Bliss Bakery — a premium brownie bakery in Chennai, India.
- Menu: Classic Fudge ₹149, Walnut Crunch ₹169, Red Velvet ₹179, Salted Caramel ₹189, Oreo Dream ₹179, Peanut Butter ₹169
- Baked fresh daily, eggless options available
- Delivery within Chennai, 2-3 hours before 5 PM
- Min order 4 pieces. Bulk (24+) gets 15% off
- Payment: Google Pay, PhonePe, Cash on Delivery
Be warm, use food emojis, keep replies 2-4 sentences.`;

const DB_KEY = "brownie_bliss_orders_v2";
const UPI_ID  = "browniebliss@okaxis"; // ← replace with real UPI ID

async function loadOrders() {
  try { const r = await window.storage.get(DB_KEY); return r ? JSON.parse(r.value) : []; }
  catch { return []; }
}
const handleSubmit = async () => {
  // 1. Validation
  if (!form.customerName || !form.email || !form.phone || !form.address || !form.deliveryDate) {
    alert("Please fill in all required fields.");
    return;
  }
  
  setSubmitting(true);

  // 2. Prepare Order Object
  const order = {
    ...form,
    orderTimestamp: new Date().toISOString(),
    orderStatus: "Pending",
    orderId: "BB" + Date.now().toString().slice(-6)
  };

  // 3. Save to Online Database (via backend)
  await handleSubmit(order);
  
  // 4. Cleanup
  setSubmitting(false);
  onOrderSubmit(order);
  
  // Reset form
  setForm({ 
    customerName: "", email: "", phone: "", address: "", 
    brownieType: BROWNIES[0].name, quantity: 4, 
    specialNotes: "", deliveryDate: "", paymentMethod: "COD" 
  });
};

/* ═══════════════════════════════════════════════════════
   PAYMENT UTILS
═══════════════════════════════════════════════════════ */
function getPaymentUrl(method, amount) {
  const name   = encodeURIComponent("Brownie Bliss Bakery");
  const txnRef = "BB" + Date.now().toString().slice(-8);
  const note   = encodeURIComponent("Brownie Order");
  const amt    = Number(amount).toFixed(2);
  const ua     = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);

  if (method === "gpay") {
    if (isAndroid) {
      return {
        url: `intent://pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;S.browser_fallback_url=https%3A%2F%2Fpay.google.com;end`,
        txnRef, isMobile: true
      };
    }
    if (isIOS) {
      return { url: `gpay://upi/pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`, txnRef, isMobile: true };
    }
    // Desktop
    return {
      url: `https://pay.google.com/gp/p/ui/pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`,
      qr: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`)}&size=180x180&bgcolor=1a0800&color=d4a017&margin=10`,
      txnRef, isMobile: false
    };
  }

  if (method === "phonepe") {
    if (isAndroid) {
      return {
        url: `intent://pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}#Intent;scheme=upi;package=com.phonepe.app;S.browser_fallback_url=https%3A%2F%2Fphonepe.com;end`,
        txnRef, isMobile: true
      };
    }
    if (isIOS) {
      return { url: `phonepe://pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`, txnRef, isMobile: true };
    }
    return {
      url: `https://phpe.app/pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`,
      qr: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=${name}&am=${amt}&cu=INR&tn=${note}&tr=${txnRef}`)}&size=180x180&bgcolor=1a0800&color=5f259f&margin=10`,
      txnRef, isMobile: false
    };
  }
  return { txnRef, isMobile: false };
}

/* ═══════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body { background: #0c0400; color: #e8d5b0; font-family: 'DM Sans', sans-serif; overflow-x: hidden; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0c0400; } ::-webkit-scrollbar-thumb { background: #4a2200; border-radius: 2px; }
    section { scroll-margin-top: 56px; }
    input, select, textarea {
      background: #160900; color: #e8d5b0; border: 1.5px solid #2e1400;
      border-radius: 10px; padding: 12px 14px; width: 100%;
      font-family: 'DM Sans', sans-serif; font-size: 14px;
      transition: border-color .2s; -webkit-appearance: none; appearance: none;
    }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #c8860a; }
    button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
    @keyframes fadeUp   { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
    @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes spin     { to{transform:rotate(360deg)} }
    @keyframes scalePop { 0%{transform:scale(0.8);opacity:0} 70%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
    @keyframes progressBar { from{width:0} to{width:100%} }
    @keyframes pulse    { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:.8} }
    @keyframes slideUp  { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes dotBounce{ 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
  `}</style>
);

/* ═══════════════════════════════════════════════════════
   STARS
═══════════════════════════════════════════════════════ */
function Stars({ n }) {
  return <span style={{ color: "#d4a017", fontSize: 14, letterSpacing: 1 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

/* ═══════════════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════════════ */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: "linear-gradient(135deg,#2a1200,#1a0800)",
      color: "#f5e6c8", padding: "14px 24px", borderRadius: 50,
      fontSize: 14, fontWeight: 600, zIndex: 9999,
      border: "1px solid #c8860a60", boxShadow: "0 12px 40px rgba(0,0,0,.6)",
      display: "flex", alignItems: "center", gap: 10,
      animation: "slideUp .3s ease", whiteSpace: "nowrap",
      maxWidth: "calc(100vw - 40px)"
    }}>
      🎉 {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════ */
function Navbar({ cartCount, onNav, active }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const links = ["Home","Menu","Order","About","Gallery","Reviews","Contact","Admin"];
  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: "rgba(12,4,0,.96)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid #2a1000",
        padding: "0 16px", height: 56,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div
          onClick={() => { onNav("Home"); setMenuOpen(false); }}
          style={{ fontFamily: "'Cormorant Garamond', serif", color: "#d4a017", fontSize: 18, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >🍫 Brownie Bliss</div>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: 2, flexWrap: "nowrap", overflow: "hidden" }} className="desktop-nav">
          <style>{`@media(max-width:768px){.desktop-nav{display:none!important}}`}</style>
          {links.map(l => (
            <button key={l} onClick={() => onNav(l)} style={{
              background: active === l ? "#c8860a" : "transparent",
              color: active === l ? "#1a0800" : "#b09070",
              border: "none", borderRadius: 20, padding: "5px 11px",
              fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "all .2s", whiteSpace: "nowrap"
            }}>{l === "Admin" ? "⚙️" : l}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "#c8860a", color: "#1a0800", borderRadius: 20,
            padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer"
          }} onClick={() => onNav("Order")}>🛒 {cartCount}</div>
          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", color: "#d4a017", fontSize: 22, cursor: "pointer", display: "none", lineHeight: 1 }}
            className="hamburger"
          >{menuOpen ? "✕" : "☰"}</button>
          <style>{`@media(max-width:768px){.hamburger{display:block!important}}`}</style>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div style={{
          position: "fixed", top: 56, left: 0, right: 0, zIndex: 999,
          background: "#110600", borderBottom: "1px solid #2a1000",
          padding: "12px 16px", display: "flex", flexDirection: "column", gap: 4,
          animation: "slideUp .2s ease"
        }}>
          {links.map(l => (
            <button key={l} onClick={() => { onNav(l); setMenuOpen(false); }} style={{
              background: active === l ? "#c8860a20" : "transparent",
              color: active === l ? "#d4a017" : "#b09070",
              border: "none", borderLeft: active === l ? "3px solid #c8860a" : "3px solid transparent",
              padding: "12px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer",
              textAlign: "left", borderRadius: "0 8px 8px 0", transition: "all .15s"
            }}>{l === "Admin" ? "⚙️ Admin" : l}</button>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════ */
function HeroSection({ onNav }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t+1), 3200); return () => clearInterval(i); }, []);
  const taglines = ["Baked with Love, Served with Joy", "Every Bite is Pure Bliss", "Chennai's Favourite Brownie"];
  return (
    <section style={{
      minHeight: "100svh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", textAlign: "center",
      padding: "80px 20px 60px",
      background: "radial-gradient(ellipse at 50% 35%, #3d1c0a 0%, #1a0800 45%, #0c0400 100%)",
      position: "relative", overflow: "hidden"
    }}>
      {[...Array(14)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: (i%3+1)*6, height: (i%3+1)*6, borderRadius: "50%",
          background: `rgba(212,160,23,${.08 + (i%4)*.05})`,
          top: `${(i*13+7)%100}%`, left: `${(i*17+5)%100}%`,
          animation: `float ${4 + (i%3)*2}s ease-in-out ${i*.4}s infinite`,
          pointerEvents: "none"
        }} />
      ))}

      <div style={{ fontSize: "clamp(60px,15vw,100px)", animation: "float 3s ease-in-out infinite", marginBottom: 16 }}>🍫</div>
      <h1 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "clamp(32px,8vw,88px)", color: "#d4a017",
        fontWeight: 700, lineHeight: 1.1, marginBottom: 12,
        textShadow: "0 4px 30px rgba(212,160,23,.25)"
      }}>Brownie Bliss<br style={{ display: "block" }} />Bakery</h1>

      <p style={{
        fontSize: "clamp(14px,3vw,20px)", color: "#b08850",
        fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
        marginBottom: 20, minHeight: "1.5em", transition: "opacity .5s"
      }}>{taglines[tick % 3]}</p>

      <p style={{ color: "#806040", maxWidth: 480, marginBottom: 36, fontSize: "clamp(13px,2vw,15px)", lineHeight: 1.8, padding: "0 8px" }}>
        Handcrafted brownies baked fresh daily in Chennai. Rich, fudgy, made with premium Belgian chocolate — delivered to your door.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={() => onNav("Order")} style={{
          background: "linear-gradient(135deg,#c8860a,#d4a017)",
          color: "#1a0800", border: "none", borderRadius: 50,
          padding: "14px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer",
          boxShadow: "0 8px 24px rgba(200,134,10,.4)",
          animation: "pulse 2.5s ease-in-out infinite"
        }}>🛒 Order Now</button>
        <button onClick={() => onNav("Menu")} style={{
          background: "transparent", color: "#d4a017",
          border: "2px solid #c8860a50", borderRadius: 50,
          padding: "14px 32px", fontSize: 15, fontWeight: 600, cursor: "pointer"
        }}>View Menu</button>
      </div>

      <div style={{ display: "flex", gap: "clamp(20px,6vw,48px)", marginTop: 56, color: "#806040" }}>
        {[["🎂","50+","Flavours"],["⭐","4.9","Rating"],["📦","1000+","Orders"]].map(([e,n,l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{e}</div>
            <div style={{ fontSize: "clamp(18px,4vw,24px)", color: "#d4a017", fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>{n}</div>
            <div style={{ fontSize: 11, marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   MENU
═══════════════════════════════════════════════════════ */
function MenuSection({ onAddToCart }) {
  return (
    <section id="Menu" style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0f0500" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#d4a017", textAlign: "center", fontSize: "clamp(28px,6vw,44px)", marginBottom: 8 }}>Our Brownies</h2>
        <p style={{ textAlign: "center", color: "#806040", marginBottom: "clamp(28px,5vw,48px)", fontSize: 14 }}>Baked fresh every morning — pick your favourite!</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(280px,100%),1fr))", gap: "clamp(12px,3vw,24px)" }}>
          {BROWNIES.map((b, idx) => (
            <div key={b.id} style={{
              background: `linear-gradient(145deg, ${b.color}33 0%, #1a0800 100%)`,
              borderRadius: 18, border: "1px solid #2a1400",
              padding: "clamp(16px,4vw,24px)", transition: "transform .25s, box-shadow .25s",
              animation: `fadeUp .5s ease ${idx*.08}s both`
            }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-5px)"; e.currentTarget.style.boxShadow="0 20px 48px rgba(200,134,10,.18)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.boxShadow="none"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: "clamp(36px,8vw,52px)" }}>{b.emoji}</span>
                <span style={{ background: "#c8860a", color: "#1a0800", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 10px", letterSpacing: .5 }}>{b.tag}</span>
              </div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: "#e8c870", marginBottom: 6, fontSize: "clamp(17px,3vw,21px)", fontWeight: 600 }}>{b.name}</h3>
              <p style={{ color: "#806040", fontSize: 13, lineHeight: 1.65, marginBottom: 16 }}>{b.desc}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#d4a017", fontSize: "clamp(18px,4vw,22px)", fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>₹{b.price}</span>
                <button onClick={() => onAddToCart(b)} style={{
                  background: "linear-gradient(135deg,#c8860a,#d4a017)",
                  color: "#1a0800", border: "none", borderRadius: 20,
                  padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "transform .15s"
                }}
                  onMouseEnter={e => e.currentTarget.style.transform="scale(1.05)"}
                  onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
                >+ Add</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   PAYMENT METHOD CARD
═══════════════════════════════════════════════════════ */
function PaymentCard({ id, label, sublabel, icon, selected, onClick }) {
  const isSelected = selected === id;
  return (
    <button onClick={() => onClick(id)} style={{
      background: isSelected
        ? "linear-gradient(135deg,#2a1400,#1e0e00)"
        : "#140800",
      border: isSelected ? "2px solid #c8860a" : "1.5px solid #2e1400",
      borderRadius: 16, padding: "16px 14px", cursor: "pointer",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
      transition: "all .2s", position: "relative", overflow: "hidden",
      boxShadow: isSelected ? "0 0 24px rgba(200,134,10,.2)" : "none",
    }}>
      {isSelected && (
        <div style={{
          position: "absolute", top: 8, right: 8,
          width: 18, height: 18, borderRadius: "50%",
          background: "#c8860a", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#1a0800", fontWeight: 700
        }}>✓</div>
      )}
      <div style={{ fontSize: 32 }}>{icon}</div>
      <div style={{ color: isSelected ? "#d4a017" : "#c8a870", fontSize: 13, fontWeight: 600, textAlign: "center", lineHeight: 1.3 }}>{label}</div>
      {sublabel && <div style={{ color: "#5a3a20", fontSize: 10, textAlign: "center" }}>{sublabel}</div>}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   PAYMENT MODAL
═══════════════════════════════════════════════════════ */
function PaymentModal({ method, amount, onConfirm, onCancel }) {
  const [launched, setLaunched] = useState(false);
  const { url, qr, txnRef, isMobile } = getPaymentUrl(method, amount);

  const methodMeta = {
    gpay:    { label: "Google Pay",  color: "#4285F4", bg: "#1a2340", icon: "G", iconColor: "#4285F4" },
    phonepe: { label: "PhonePe",     color: "#5f259f", bg: "#1e1030", icon: "₱", iconColor: "#5f259f" },
  };
  const meta = methodMeta[method] || {};

  useEffect(() => {
    if (method === "cod") return;
    // Delay slightly so modal renders first, then redirect
    const t = setTimeout(() => {
      setLaunched(true);
      if (isMobile) {
        window.location.href = url;
      } else {
        window.open(url, "_blank", "noopener");
      }
    }, 600);
    return () => clearTimeout(t);
  }, []);

  if (method === "cod") {
    return (
      <div style={modalOverlay}>
        <div style={{ ...modalBox, animation: "scalePop .3s ease" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>💵</div>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: 22, marginBottom: 8 }}>Cash on Delivery</h3>
          <p style={{ color: "#a08060", fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>
            Your order will be placed immediately.<br />Pay <strong style={{ color: "#d4a017" }}>₹{amount}</strong> when your brownies arrive!
          </p>
          <div style={{ color: "#5a3a20", fontSize: 12, marginBottom: 24 }}>Order Ref: {txnRef}</div>
          <button onClick={() => onConfirm(txnRef)} style={confirmBtn}>✅ Place Order</button>
          <button onClick={onCancel} style={cancelBtn}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={modalOverlay}>
      <div style={{ ...modalBox, animation: "scalePop .3s ease" }}>
        {/* App icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: meta.bg, border: `2px solid ${meta.color}40`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 14px",
          boxShadow: `0 8px 24px ${meta.color}30`
        }}>
          <span style={{ fontWeight: 900, fontSize: 28, fontFamily: "Georgia, serif", color: meta.iconColor }}>{meta.icon}</span>
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: 20, marginBottom: 4 }}>{meta.label}</div>
        <div style={{ color: "#806040", fontSize: 12, marginBottom: 18 }}>Brownie Bliss Bakery</div>

        {/* Amount */}
        <div style={{
          background: "#200d00", borderRadius: 14, padding: "14px 24px",
          border: "1px solid #c8860a30", marginBottom: 20, display: "inline-block"
        }}>
          <div style={{ color: "#5a3a20", fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Amount</div>
          <div style={{ color: "#d4a017", fontSize: 34, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>₹{amount}</div>
        </div>

        {/* Status */}
        {!launched ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color, animation: `dotBounce 1.4s ease-in-out ${i*.16}s infinite` }} />)}
            </div>
            <div style={{ color: "#a08060", fontSize: 13 }}>Opening {meta.label}…</div>
          </div>
        ) : isMobile ? (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#c8a870", fontSize: 14, marginBottom: 6 }}>🚀 {meta.label} is opening…</div>
            <div style={{ color: "#5a3a20", fontSize: 12 }}>Complete payment, then tap the button below.</div>
          </div>
        ) : (
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#c8a870", fontSize: 13, marginBottom: 10 }}>📱 Scan with your phone to pay</div>
            {qr && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 8, display: "inline-block", marginBottom: 10 }}>
                <img src={qr} alt="Pay QR" width={150} height={150} style={{ display: "block", borderRadius: 6 }} />
              </div>
            )}
            <div style={{ color: "#3a2010", fontSize: 11, marginBottom: 6 }}>— or open in browser —</div>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: meta.color, fontSize: 13, display: "block", marginBottom: 4 }}>
              Open {meta.label} →
            </a>
          </div>
        )}

        <div style={{ color: "#3a2010", fontSize: 11, marginBottom: 20 }}>Ref: {txnRef}</div>

        <button onClick={() => onConfirm(txnRef)} style={confirmBtn}>✅ I've Paid — Confirm Order</button>
        <button onClick={onCancel} style={cancelBtn}>Cancel</button>
      </div>
    </div>
  );
}

const modalOverlay = {
  position: "fixed", inset: 0, zIndex: 10000,
  background: "rgba(0,0,0,.88)", backdropFilter: "blur(10px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};
const modalBox = {
  background: "linear-gradient(145deg,#1e0d00,#150800)",
  borderRadius: 24, border: "1px solid #3a1a00",
  padding: "clamp(24px,5vw,40px) clamp(20px,5vw,36px)",
  width: "100%", maxWidth: 340, textAlign: "center",
  boxShadow: "0 32px 80px rgba(0,0,0,.8)",
  maxHeight: "90svh", overflowY: "auto"
};
const confirmBtn = {
  width: "100%", background: "linear-gradient(135deg,#c8860a,#d4a017)",
  color: "#1a0800", border: "none", borderRadius: 12,
  padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer",
  marginBottom: 10, transition: "transform .15s"
};
const cancelBtn = {
  width: "100%", background: "transparent",
  color: "#5a3a20", border: "1px solid #2e1400", borderRadius: 12,
  padding: "11px", fontSize: 13, cursor: "pointer"
};

/* ═══════════════════════════════════════════════════════
   ORDER SECTION
═══════════════════════════════════════════════════════ */
function OrderSection({ onOrderSubmit }) {
  const [form, setForm] = useState({
    customerName: "", email: "", phone: "", address: "",
    brownieType: BROWNIES[0].name, quantity: 4,
    specialNotes: "", deliveryDate: ""
  });
  const [payMethod, setPayMethod] = useState("gpay");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);

  const brownie = BROWNIES.find(b => b.name === form.brownieType);
  const subtotal = brownie ? brownie.price * form.quantity : 0;
  const bulk = form.quantity >= 24;
  const total = bulk ? Math.round(subtotal * 0.85) : subtotal;

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = () => {
    if (!form.customerName || !form.email || !form.phone || !form.address || !form.deliveryDate) {
      alert("Please fill all required fields."); return;
    }
    const order = {
      ...form, paymentMethod: payMethod,
      totalAmount: total, subtotal,
      orderTimestamp: new Date().toISOString(),
      orderStatus: payMethod === "cod" ? "Pending" : "Awaiting Payment",
      orderId: "BB" + Date.now().toString().slice(-6),
    };
    setPendingOrder(order);
    setShowModal(true);
  };

  const handleConfirm = async (txnRef) => {
    const order = { ...pendingOrder, txnRef, orderStatus: payMethod === "cod" ? "Pending" : "Payment Received" };
    await handleSubmit(order);
    setShowModal(false);
    setPendingOrder(null);
    onOrderSubmit(order);
    setForm({ customerName: "", email: "", phone: "", address: "", brownieType: BROWNIES[0].name, quantity: 4, specialNotes: "", deliveryDate: "" });
  };

  return (
    <section id="Order" style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0c0400" }}>
      {showModal && pendingOrder && (
        <PaymentModal
          method={payMethod}
          amount={total}
          onConfirm={handleConfirm}
          onCancel={() => { setShowModal(false); setPendingOrder(null); }}
        />
      )}

      <div style={{ maxWidth: 660, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", textAlign: "center", fontSize: "clamp(28px,6vw,44px)", marginBottom: 8 }}>
          Place Your Order
        </h2>
        <p style={{ textAlign: "center", color: "#806040", marginBottom: "clamp(24px,5vw,40px)", fontSize: 14 }}>
          Fill in your details and we'll bake it fresh for you!
        </p>

        <div style={{ background: "linear-gradient(145deg,#1a0900,#110600)", borderRadius: 24, border: "1px solid #2e1400", padding: "clamp(20px,5vw,36px)" }}>

          {/* Personal info */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 14 }}>
            {[["customerName","Full Name *","text"],["email","Email *","email"],["phone","Phone *","tel"],["deliveryDate","Delivery Date *","date"]].map(([n,l,t]) => (
              <div key={n}>
                <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{l}</label>
                <input type={t} name={n} value={form[n]} onChange={handleChange}
                  style={{ colorScheme: "dark" }} />
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Delivery Address *</label>
            <textarea name="address" value={form.address} onChange={handleChange} rows={2} style={{ resize: "none" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Brownie Type</label>
              <div style={{ position: "relative" }}>
                <select name="brownieType" value={form.brownieType} onChange={handleChange} style={{ paddingRight: 36 }}>
                  {BROWNIES.map(b => <option key={b.id} value={b.name}>{b.name} — ₹{b.price}</option>)}
                </select>
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#c8860a", pointerEvents: "none" }}>▾</span>
              </div>
            </div>
            <div>
              <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Qty (min 4)</label>
              <input type="number" name="quantity" value={form.quantity} min={4} onChange={handleChange} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Special Instructions</label>
            <textarea name="specialNotes" value={form.specialNotes} onChange={handleChange} rows={2} placeholder="Eggless, custom message on box, etc." style={{ resize: "none" }} />
          </div>

          {/* ── PAYMENT METHOD ── */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "#806040", fontSize: 12, display: "block", marginBottom: 12, textTransform: "uppercase", letterSpacing: .5 }}>Payment Method</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
              <PaymentCard id="gpay"    label="Google Pay"  sublabel="UPI"  icon="🇬"  selected={payMethod} onClick={setPayMethod} />
              <PaymentCard id="phonepe" label="PhonePe"     sublabel="UPI"  icon="📱"  selected={payMethod} onClick={setPayMethod} />
              <PaymentCard id="cod"     label="Cash on Delivery" sublabel="Pay at door" icon="💵" selected={payMethod} onClick={setPayMethod} />
            </div>
          </div>

          {/* Order summary */}
          <div style={{
            background: "#200d00", borderRadius: 14, border: "1px solid #c8860a20",
            padding: "16px 20px", marginBottom: 20
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: bulk ? 8 : 0 }}>
              <span style={{ color: "#806040", fontSize: 13 }}>{form.quantity}× {form.brownieType}</span>
              <span style={{ color: "#a08060", fontSize: 13 }}>₹{subtotal}</span>
            </div>
            {bulk && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#4caf50", fontSize: 12 }}>🎉 15% Bulk Discount</span>
                <span style={{ color: "#4caf50", fontSize: 12 }}>−₹{subtotal - total}</span>
              </div>
            )}
            <div style={{ height: "1px", background: "#2e1400", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#c8a870", fontSize: 14, fontWeight: 600 }}>Total</span>
              <span style={{ color: "#d4a017", fontSize: 26, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>₹{total}</span>
            </div>
            <div style={{ color: "#5a3a20", fontSize: 11, textAlign: "right", marginTop: 2 }}>
              via {payMethod === "gpay" ? "Google Pay" : payMethod === "phonepe" ? "PhonePe" : "Cash on Delivery"}
            </div>
          </div>

          {/* CTA Button */}
          <button onClick={handleSubmit} disabled={submitting} style={{
            width: "100%", border: "none", borderRadius: 14,
            padding: "16px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            transition: "all .2s",
            ...(payMethod === "gpay" ? {
              background: "white", color: "#202020",
              boxShadow: "0 4px 20px rgba(255,255,255,.12)"
            } : payMethod === "phonepe" ? {
              background: "linear-gradient(135deg,#5f259f,#7b3fbf)",
              color: "white", boxShadow: "0 4px 20px rgba(95,37,159,.4)"
            } : {
              background: "linear-gradient(135deg,#c8860a,#d4a017)",
              color: "#1a0800", boxShadow: "0 4px 20px rgba(200,134,10,.3)"
            }),
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}>
            {payMethod === "gpay" && (
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "white", border: "1px solid #e0e0e0", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: "#4285F4", fontFamily: "Georgia" }}>G</span>
            )}
            {payMethod === "gpay"    && `Pay ₹${total} with Google Pay`}
            {payMethod === "phonepe" && `Pay ₹${total} with PhonePe`}
            {payMethod === "cod"     && `Place Order — ₹${total} COD`}
          </button>

          {payMethod !== "cod" && (
            <p style={{ textAlign: "center", color: "#3a2010", fontSize: 11, marginTop: 10 }}>
              🔒 Secure UPI payment · You'll be redirected to {payMethod === "gpay" ? "Google Pay" : "PhonePe"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   ABOUT
═══════════════════════════════════════════════════════ */
function AboutSection() {
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0f0500" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "clamp(28px,6vw,60px)", alignItems: "center" }}>
        <div style={{ animation: "fadeUp .6s ease" }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: "clamp(28px,6vw,44px)", marginBottom: 18 }}>Our Story</h2>
          {["Brownie Bliss started in a small Chennai kitchen in 2019 — just a passionate baker, a grandmother's secret chocolate recipe, and a dream to share joy through food.",
            "What began as weekend bakes for friends quickly grew into Chennai's most loved brownie delivery. Every batch is handcrafted with Belgian dark chocolate, farm-fresh butter, and lots of love.",
            "We believe the best brownies aren't just desserts — they're memories. And we're here to help you make sweet ones."].map((p, i) => (
            <p key={i} style={{ color: i === 0 ? "#c8a870" : "#806040", lineHeight: 1.9, marginBottom: 14, fontSize: "clamp(13px,2vw,15px)" }}>{p}</p>
          ))}
          <div style={{ display: "flex", gap: "clamp(16px,4vw,30px)", marginTop: 28 }}>
            {[["2019","Founded"],["1000+","Happy Customers"],["6","Flavours"]].map(([n,l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: "clamp(20px,4vw,28px)", fontWeight: 700 }}>{n}</div>
                <div style={{ color: "#806040", fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "linear-gradient(135deg,#3d1c0a,#1a0800)", borderRadius: 24, border: "1px solid #2e1400", padding: "clamp(24px,5vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(56px,12vw,80px)", animation: "float 3s ease-in-out infinite" }}>🍫</div>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: "clamp(15px,3vw,18px)", fontStyle: "italic", marginTop: 16, lineHeight: 1.7 }}>
            "Life is sweeter with a Brownie Bliss in hand."
          </p>
          <p style={{ color: "#806040", fontSize: 12, marginTop: 8 }}>— Kavya, Founder</p>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   GALLERY
═══════════════════════════════════════════════════════ */
function GallerySection() {
  const items = [
    { label: "Classic Fudge",  color: "#3d1c0a", h: "clamp(140px,30vw,200px)" },
    { label: "Red Velvet",     color: "#7a1a1a", h: "clamp(180px,38vw,260px)" },
    { label: "Salted Caramel", color: "#5a3800", h: "clamp(120px,26vw,180px)" },
    { label: "Walnut Crunch",  color: "#2d1a00", h: "clamp(160px,34vw,240px)" },
    { label: "Oreo Dream",     color: "#1a1a1a", h: "clamp(140px,30vw,200px)" },
    { label: "Peanut Butter",  color: "#4a2800", h: "clamp(150px,32vw,220px)" },
  ];
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0c0400" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", textAlign: "center", fontSize: "clamp(28px,6vw,44px)", marginBottom: 8 }}>Gallery</h2>
        <p style={{ textAlign: "center", color: "#806040", marginBottom: "clamp(28px,5vw,48px)", fontSize: 14 }}>Every brownie is a work of art.</p>
        <div style={{ columns: "clamp(2,3,3)", gap: 14 }}>
          {items.map((g, i) => (
            <div key={i} style={{
              background: `linear-gradient(135deg,${g.color},#0c0400)`,
              borderRadius: 16, marginBottom: 14, height: g.h,
              display: "flex", alignItems: "flex-end", padding: 14,
              border: "1px solid #2a1000", breakInside: "avoid",
              transition: "transform .25s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform="scale(1.02)"}
              onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
            >
              <div>
                <div style={{ fontSize: "clamp(22px,5vw,32px)", marginBottom: 4 }}>🍫</div>
                <div style={{ color: "#d4a017", fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(12px,2.5vw,15px)" }}>{g.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   REVIEWS
═══════════════════════════════════════════════════════ */
function ReviewsSection() {
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0f0500" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", textAlign: "center", fontSize: "clamp(28px,6vw,44px)", marginBottom: 8 }}>What Our Customers Say</h2>
        <p style={{ textAlign: "center", color: "#806040", marginBottom: "clamp(28px,5vw,48px)", fontSize: 14 }}>Real reviews from real brownie lovers.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(220px,100%),1fr))", gap: "clamp(10px,3vw,20px)" }}>
          {REVIEWS.map((r, i) => (
            <div key={i} style={{ background: "#1a0800", borderRadius: 16, border: "1px solid #2e1400", padding: "clamp(16px,4vw,24px)", animation: `fadeUp .5s ease ${i*.1}s both` }}>
              <Stars n={r.stars} />
              <p style={{ color: "#c8a870", fontSize: 13, lineHeight: 1.75, margin: "10px 0 14px", fontStyle: "italic" }}>"{r.text}"</p>
              <div style={{ color: "#d4a017", fontWeight: 600, fontSize: 14 }}>{r.name}</div>
              <div style={{ color: "#5a3a20", fontSize: 11, marginTop: 2 }}>{r.city}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   CONTACT
═══════════════════════════════════════════════════════ */
function ContactSection() {
  return (
    <section style={{ padding: "clamp(48px,8vw,80px) 16px", background: "#0c0400" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", textAlign: "center", fontSize: "clamp(28px,6vw,44px)", marginBottom: "clamp(28px,5vw,48px)" }}>Get In Touch</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))", gap: "clamp(24px,5vw,40px)" }}>
          <div>
            {[["📍","Address","42, Sweet Street, T.Nagar, Chennai – 600017"],
              ["📞","Phone","+91 98765 43210"],["📧","Email","hello@browniebliss.in"],
              ["🕐","Hours","Mon–Sat: 9 AM – 8 PM"],["🛵","Delivery","Within Chennai, 2-3 hrs"]].map(([e,l,v]) => (
              <div key={l} style={{ display: "flex", gap: 14, marginBottom: 22, alignItems: "flex-start" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{e}</span>
                <div>
                  <div style={{ color: "#d4a017", fontSize: 12, fontWeight: 700, marginBottom: 2, textTransform: "uppercase", letterSpacing: .5 }}>{l}</div>
                  <div style={{ color: "#c8a870", fontSize: 13 }}>{v}</div>
                </div>
              </div>
            ))}
            <a href="https://wa.me/919876543210" style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#25D366", color: "#fff", borderRadius: 30,
              padding: "12px 22px", textDecoration: "none", fontWeight: 700, fontSize: 14
            }}>💬 Order on WhatsApp</a>
          </div>
          <div style={{ background: "#1a0800", borderRadius: 18, border: "1px solid #2e1400", padding: "clamp(20px,4vw,28px)" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", marginBottom: 18, fontSize: 22 }}>Send a Message</h3>
            {["Your Name","Your Email","Your Message"].map((ph, i) => (
              i < 2
                ? <input key={ph} placeholder={ph} style={{ marginBottom: 12 }} />
                : <textarea key={ph} placeholder={ph} rows={4} style={{ marginBottom: 16, resize: "none" }} />
            ))}
            <button style={{ background: "linear-gradient(135deg,#c8860a,#d4a017)", color: "#1a0800", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer", width: "100%", fontSize: 14 }}>
              Send Message ✉️
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   ADMIN
═══════════════════════════════════════════════════════ */
function AdminDashboard() {
  const [pw, setPw] = useState("");
  const [auth, setAuth] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("All");

  const login = () => {
    if (pw === "admin123") { setAuth(true); loadOrders().then(setOrders); }
    else alert("Wrong password. Hint: admin123");
  };

  const updateStatus = async (id, st) => {
    const updated = orders.map(o => o.orderId === id ? { ...o, orderStatus: st } : o);
    setOrders(updated);
    await window.storage.set(DB_KEY, JSON.stringify(updated));
  };

  const payBadge = (m) => ({
    gpay:    { label: "G Pay",  bg: "#1a2340", color: "#4285F4" },
    phonepe: { label: "PhonePe",bg: "#1e1030", color: "#a855f7" },
    cod:     { label: "COD",    bg: "#2a1a00", color: "#c8860a" },
  }[m] || { label: m || "—", bg: "#1a1a1a", color: "#888" });

  const filtered = filter === "All" ? orders : orders.filter(o => o.orderStatus === filter);

  if (!auth) return (
    <section style={{ padding: "100px 16px", minHeight: "100svh", background: "#0c0400", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1a0800", borderRadius: 24, border: "1px solid #2e1400", padding: "clamp(28px,6vw,44px)", width: "100%", maxWidth: 360, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", marginBottom: 24, fontSize: 26 }}>Admin Login</h2>
        <input type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === "Enter" && login()} style={{ marginBottom: 14, textAlign: "center" }} />
        <button onClick={login} style={{ width: "100%", background: "linear-gradient(135deg,#c8860a,#d4a017)", color: "#1a0800", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>Login</button>
        <p style={{ color: "#3a2010", fontSize: 12, marginTop: 12 }}>Hint: admin123</p>
      </div>
    </section>
  );

  return (
    <section style={{ padding: "clamp(40px,6vw,80px) 16px", minHeight: "100svh", background: "#0c0400" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: "clamp(24px,5vw,36px)", marginBottom: 20 }}>⚙️ Admin Dashboard</h2>

        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
          {["All","Pending","Payment Received","Processing","Out for Delivery","Delivered"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              background: filter === s ? "#c8860a" : "#1a0800",
              color: filter === s ? "#1a0800" : "#c8a870",
              border: "1px solid #2e1400", borderRadius: 20,
              padding: "6px 14px", cursor: "pointer", fontWeight: 500, fontSize: 12
            }}>{s}</button>
          ))}
          <span style={{ color: "#5a3a20", fontSize: 12, marginLeft: "auto" }}>{filtered.length} orders</span>
          <button onClick={() => loadOrders().then(setOrders)} style={{ background: "#1a0800", color: "#d4a017", border: "1px solid #2e1400", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>🔄 Refresh</button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#3a2010", padding: "60px 0", fontSize: 15 }}>No orders yet. Place an order first!</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(o => {
              const pb = payBadge(o.paymentMethod);
              return (
                <div key={o.orderId} style={{
                  background: "#1a0800", borderRadius: 14, border: "1px solid #2e1400",
                  padding: "14px 18px", display: "grid",
                  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) auto",
                  gap: 12, alignItems: "center"
                }}>
                  <div>
                    <div style={{ color: "#d4a017", fontWeight: 700, fontSize: 12 }}>#{o.orderId}</div>
                    <div style={{ color: "#e8c870", fontSize: 14, marginTop: 2 }}>{o.customerName}</div>
                    <div style={{ color: "#5a3a20", fontSize: 11 }}>{o.email}</div>
                  </div>
                  <div>
                    <div style={{ color: "#c8a870", fontSize: 13 }}>{o.brownieType}</div>
                    <div style={{ color: "#d4a017", fontSize: 13, fontWeight: 700 }}>Qty {o.quantity} · ₹{o.totalAmount || "—"}</div>
                    <div style={{ color: "#5a3a20", fontSize: 11 }}>{o.deliveryDate}</div>
                    <span style={{ background: pb.bg, color: pb.color, fontSize: 10, borderRadius: 8, padding: "2px 7px", marginTop: 4, display: "inline-block", fontWeight: 600 }}>{pb.label}</span>
                  </div>
                  <div>
                    <div style={{ color: "#5a3a20", fontSize: 10 }}>{new Date(o.orderTimestamp).toLocaleString("en-IN")}</div>
                    {o.specialNotes && <div style={{ color: "#3a2010", fontSize: 11, marginTop: 4 }}>📝 {o.specialNotes}</div>}
                    {o.txnRef && <div style={{ color: "#3a2010", fontSize: 10, marginTop: 2 }}>Ref: {o.txnRef}</div>}
                  </div>
                  <div>
                    <select value={o.orderStatus} onChange={e => updateStatus(o.orderId, e.target.value)}
                      style={{ width: "clamp(110px,18vw,140px)", fontSize: 11, padding: "6px 8px" }}>
                      {["Pending","Awaiting Payment","Payment Received","Processing","Out for Delivery","Delivered","Cancelled"].map(s =>
                        <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   CHATBOT
═══════════════════════════════════════════════════════ */
function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role: "assistant", content: "Hi! I'm Cocoa 🍫 your Brownie Bliss assistant. How can I sweeten your day?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  useEffect(() => { if (open && bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" }); }, [msgs, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs); setInput(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: SYSTEM_PROMPT, messages: newMsgs.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || "Oops! Try again 🍫";
      setMsgs(m => [...m, { role: "assistant", content: reply }]);
    } catch { setMsgs(m => [...m, { role: "assistant", content: "Oops! Something went wrong. Try again in a moment 🍫" }]); }
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(o => !o)} style={{
        position: "fixed", bottom: 20, right: 16, zIndex: 9998,
        width: 56, height: 56, borderRadius: "50%",
        background: "linear-gradient(135deg,#c8860a,#d4a017)",
        border: "none", fontSize: 26, cursor: "pointer",
        boxShadow: "0 8px 24px rgba(200,134,10,.5)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>{open ? "✕" : "🍫"}</button>

      {open && (
        <div style={{
          position: "fixed", bottom: 84, right: 16, zIndex: 9997,
          width: "min(340px, calc(100vw - 32px))", height: "min(480px,60svh)",
          background: "#1a0800", borderRadius: 20, border: "1px solid #2e1400",
          display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,.7)", overflow: "hidden",
          animation: "slideUp .25s ease"
        }}>
          <div style={{ background: "linear-gradient(135deg,#3d1c0a,#2a1000)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #2e1400" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#c8860a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍫</div>
            <div>
              <div style={{ color: "#d4a017", fontWeight: 700, fontSize: 13 }}>Cocoa</div>
              <div style={{ color: "#5a3a20", fontSize: 10 }}>Brownie Bliss AI</div>
            </div>
            <div style={{ marginLeft: "auto", width: 7, height: 7, borderRadius: "50%", background: "#4caf50" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "84%" }}>
                <div style={{ background: m.role === "user" ? "#c8860a" : "#2a1200", color: m.role === "user" ? "#1a0800" : "#e8d5b0", borderRadius: m.role === "user" ? "14px 14px 3px 14px" : "14px 14px 14px 3px", padding: "9px 13px", fontSize: 13, lineHeight: 1.6, border: m.role === "assistant" ? "1px solid #2e1400" : "none" }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div style={{ alignSelf: "flex-start" }}><div style={{ background: "#2a1200", border: "1px solid #2e1400", borderRadius: "14px 14px 14px 3px", padding: "10px 14px" }}><span style={{ color: "#c8860a", fontSize: 16, letterSpacing: 3 }}>•••</span></div></div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: 10, borderTop: "1px solid #2e1400", display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Ask me anything…" style={{ flex: 1, borderRadius: 20, padding: "8px 14px", fontSize: 13 }} />
            <button onClick={send} disabled={loading || !input.trim()} style={{ background: "#c8860a", color: "#1a0800", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 15, flexShrink: 0 }}>➤</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState("Home");
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  const handleNav = p => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleAddToCart = item => { setCart(c => [...c, item]); setToast(`${item.name} added to cart! 🛒`); };
  const handleOrderSubmit = order => setToast(`Order #${order.orderId} placed! 🎉 We'll bake it fresh for you!`);

  const renderPage = () => {
    switch (page) {
      case "Home":    return <><HeroSection onNav={handleNav} /><MenuSection onAddToCart={handleAddToCart} /><AboutSection /><ReviewsSection /></>;
      case "Menu":    return <MenuSection onAddToCart={handleAddToCart} />;
      case "Order":   return <OrderSection onOrderSubmit={handleOrderSubmit} />;
      case "About":   return <AboutSection />;
      case "Gallery": return <GallerySection />;
      case "Reviews": return <ReviewsSection />;
      case "Contact": return <ContactSection />;
      case "Admin":   return <AdminDashboard />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: "100svh", background: "#0c0400", fontFamily: "'DM Sans',sans-serif" }}>
      <GlobalStyles />
      <Navbar cartCount={cart.length} onNav={handleNav} active={page} />
      <div style={{ paddingTop: 56 }}>{renderPage()}</div>
      <footer style={{ background: "#080200", borderTop: "1px solid #1a0800", padding: "clamp(20px,4vw,30px) 16px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", color: "#d4a017", fontSize: 20, marginBottom: 6 }}>🍫 Brownie Bliss Bakery</div>
        <p style={{ color: "#3a2010", fontSize: 12 }}>© 2025 Brownie Bliss. Handcrafted with ❤️ in Chennai, India.</p>
      </footer>
      <Chatbot />
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
