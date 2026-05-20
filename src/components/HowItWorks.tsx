import { STEPS } from "../data/constants";
import { useEffect, useRef, useState } from "react";
import { useScrollTo } from "../hooks";

/**
 * Premium four-step process explainer with animated connecting lines,
 * glowing icons, and scroll-triggered entrance animations.
 */
export default function HowItWorks({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const scrollTo = useScrollTo();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="como-funciona" className="py-12 relative overflow-hidden bg-zinc-950">
      {/* ── Ambient background glows ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(245,158,11,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)",
        }}
      />

      <div ref={sectionRef} className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ── Section header ── */}
        <div
          className="text-center mb-20 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(30px)",
          }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">
              Processo Simples
            </span>
          </div>
          <h2
            className="text-white text-4xl md:text-6xl font-black leading-tight"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Como{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Funciona
            </span>
          </h2>
          <p className="text-zinc-300 text-base md:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Do catálogo às chaves na mão — o processo é{" "}
            <span className="text-white font-semibold">100% digital</span>,{" "}
            <span className="text-white font-semibold">transparente</span> e
            pensado para Moçambique.
          </p>
        </div>

        {/* ── Steps ── */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-[72px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-[2px]">
            <div
              className="h-full rounded-full transition-all duration-[1.5s] ease-out"
              style={{
                background:
                  "linear-gradient(90deg, #f59e0b 0%, #f59e0b40 50%, #f59e0b 100%)",
                transform: visible ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "left",
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-5">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative group"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(40px)",
                  transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.15 + 0.3}s`,
                }}
              >
                <div className="relative h-full flex flex-col rounded-3xl bg-zinc-900/80 border border-zinc-800/60 p-7 hover:border-amber-500/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-amber-500/5 backdrop-blur-sm">
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: "radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.08), transparent 70%)",
                    }}
                  />

                  {/* Step number circle */}
                  <div className="relative z-10 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 group-hover:scale-110 transition-all duration-500">
                      <span
                        className="text-zinc-950 text-lg font-black"
                        style={{ fontFamily: "'Archivo', sans-serif" }}
                      >
                        {step.n}
                      </span>
                    </div>
                    {/* Pulse ring */}
                    <div className="absolute inset-0 w-14 h-14 rounded-2xl border-2 border-amber-500/30 animate-ping opacity-0 group-hover:opacity-30" 
                      style={{ animationDuration: '2s' }}
                    />
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-5 group-hover:border-amber-500/30 transition-colors duration-300">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.6"
                      className="group-hover:scale-110 transition-transform duration-300"
                    >
                      <path
                        d={step.icon}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  {/* Content */}
                  <h3
                    className="relative z-10 text-white font-bold text-lg mb-3 group-hover:text-amber-50 transition-colors duration-300"
                    style={{ fontFamily: "'Archivo', sans-serif" }}
                  >
                    {step.title}
                  </h3>
                  <p className="relative z-10 text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
                    {step.desc}
                  </p>

                  {/* Bottom accent line */}
                  <div className="mt-auto pt-5 relative z-10">
                    <div className="h-[2px] rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-700 ease-out"
                        style={{
                          width: visible ? "100%" : "0%",
                          transitionDelay: `${i * 0.2 + 0.8}s`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div
          className="text-center mt-16 transition-all duration-700"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transitionDelay: "1s",
          }}
        >
          <p className="text-zinc-500 text-sm mb-4">
            Pronto para começar?
          </p>
          <button
            onClick={(e) => {
              e.preventDefault();
              onShowSimulator?.();
              scrollTo("simulador");
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-sm px-7 py-3 rounded-full hover:from-amber-400 hover:to-orange-400 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
          >
            Simular agora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
