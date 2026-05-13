import { useState, useEffect } from "react";
import { useScrollTo } from "../hooks";

const PHRASES = [
  { text: "Alugue", anim: "enterLeft" },
  { text: "compra", anim: "enterUp" },
  { text: "com a", anim: "enterRight" },
] as const;

/* ─── Main Hero ──────────────────────────────────────── */
export default function Hero({ onShowSimulator }: { onShowSimulator?: () => void }) {
  const scrollTo = useScrollTo();
  const [ctaOnly, setCtaOnly] = useState(false);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed < PHRASES.length) return;
    const t = setTimeout(() => setCtaOnly(true), 3000);
    return () => clearTimeout(t);
  }, [revealed]);

  useEffect(() => {
    if (ctaOnly) return;
    if (revealed >= PHRASES.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), revealed === 0 ? 1200 : 1400);
    return () => clearTimeout(t);
  }, [ctaOnly, revealed]);

  return (
    <section
      className="relative min-h-screen flex flex-col justify-end overflow-hidden"
    >
      {/* Vídeo */}
      <video autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none">
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(135deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.45) 100%)" }} />

      {/* Headline (frases sequenciais) */}
      {!ctaOnly && (
        <div className="relative z-10 w-full px-6 pb-6 pointer-events-none">
          <div className="max-w-7xl mx-auto">
            <h1 style={{
              fontFamily: "'Archivo', sans-serif",
              fontSize: "clamp(44px, 6vw, 78px)",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "#fff",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}>
              {PHRASES.map((p, i) => {
                if (i >= revealed) return null;
                return (
                  <span
                    key={p.text}
                    style={{
                      display: "block",
                      opacity: 0,
                      animation: `${p.anim} 0.75s cubic-bezier(0.22,1,0.36,1) forwards`,
                    }}
                  >
                    {p.text}
                  </span>
                );
              })}

              {revealed >= PHRASES.length ? (
                <span
                  style={{
                    display: "block",
                    opacity: 0,
                    animation: `enterUp 0.75s cubic-bezier(0.22,1,0.36,1) forwards`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    backgroundImage: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #ef4444 100%)",
                    filter: "drop-shadow(0 0 30px rgba(245,158,11,0.45)) drop-shadow(0 0 70px rgba(239,68,68,0.15))",
                  }}
                >
                  SOSMotors
                </span>
              ) : null}
            </h1>
          </div>
        </div>
      )}

      {/* CTAs — aparecem no rodapé após 3s (quando o SOSMotors sai) */}
      <div className="relative z-30 w-full pb-10 flex justify-center px-6">
        <div
          className="flex flex-wrap gap-4 justify-center transition-all duration-700"
          style={{
            opacity: ctaOnly ? 1 : 0,
            transform: ctaOnly ? "translateY(0)" : "translateY(18px)",
            pointerEvents: ctaOnly ? "auto" : "none",
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              scrollTo("catalogo");
            }}
            className="group px-8 py-4 rounded-full font-bold text-base bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Ver Catálogo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className="group-hover:translate-x-1 transition-transform">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowSimulator?.();
              scrollTo("simulador");
            }}
            className="px-8 py-4 rounded-full font-bold text-base border border-white/20 text-zinc-300 hover:border-amber-500/50 hover:text-white backdrop-blur-sm bg-white/5 transition-all duration-200"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Simular Prestações
          </button>
        </div>
      </div>

      <style>{`
        @keyframes enterLeft  { from{opacity:0;transform:translateX(-60px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes enterUp    { from{opacity:0;transform:translateY(50px) scale(0.92)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes enterRight { from{opacity:0;transform:translateX(60px) scale(0.95)} to{opacity:1;transform:translateX(0) scale(1)} }
      `}</style>
    </section>
  );
}