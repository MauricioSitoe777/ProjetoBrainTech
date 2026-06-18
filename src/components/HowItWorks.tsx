import { STEPS } from "../data/constants";
import { useEffect, useRef, useState } from "react";
import { useScrollTo } from "../hooks";

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
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="como-funciona" className="py-10 md:py-14 relative overflow-hidden bg-zinc-950">
      {/* Ambient glows */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(216,160,32,0.06) 0%, transparent 70%)" }}
      />

      <div ref={sectionRef} className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">

        {/* Header */}
        <div
          className="text-center mb-8 md:mb-10 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)" }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Processo Simples</span>
          </div>
          <h2 className="text-white text-2xl md:text-3xl font-black leading-tight tracking-tight">
            Como{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Funciona
            </span>
          </h2>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
            Do catálogo às chaves na mão — o processo é{" "}
            <span className="text-zinc-300 font-semibold">100% digital</span>,{" "}
            <span className="text-zinc-300 font-semibold">transparente</span> e
            pensado para Moçambique.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-[50px] left-[calc(10%+20px)] right-[calc(10%+20px)] h-px">
            <div
              className="h-full rounded-full transition-all duration-[1.5s] ease-out"
              style={{
                background: "linear-gradient(90deg, #d8a020 0%, #d8a02040 50%, #d8a020 100%)",
                transform: visible ? "scaleX(1)" : "scaleX(0)",
                transformOrigin: "left",
              }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="relative group"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(32px)",
                  transition: `all 0.55s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.12 + 0.2}s`,
                }}
              >
                <div className="relative h-full flex flex-col rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-4 lg:p-5 hover:border-amber-500/40 transition-all duration-400 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 backdrop-blur-sm">
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(216,160,32,0.07), transparent 70%)" }}
                  />

                  {/* Step number */}
                  <div className="relative z-10 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/35 group-hover:scale-105 transition-all duration-400">
                      <span className="text-zinc-950 text-sm font-black">{step.n}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-3 group-hover:border-amber-500/30 transition-colors duration-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="1.8"
                      className="group-hover:scale-110 transition-transform duration-300">
                      <path d={step.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Content */}
                  <h3 className="relative z-10 text-white font-bold text-sm mb-1.5 group-hover:text-amber-50 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="relative z-10 text-zinc-400 text-[13px] leading-relaxed">
                    {step.desc}
                  </p>

                  {/* Bottom accent */}
                  <div className="mt-auto pt-3 relative z-10">
                    <div className="h-px rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-700 ease-out"
                        style={{ width: visible ? "100%" : "0%", transitionDelay: `${i * 0.15 + 0.7}s` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          className="text-center mt-8 transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(16px)", transitionDelay: "0.9s" }}
        >
          <p className="text-zinc-500 text-sm mb-3">Pronto para começar?</p>
          <button
            onClick={(e) => { e.preventDefault(); onShowSimulator?.(); scrollTo("simulador"); }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-bold text-sm px-6 py-2.5 rounded-full hover:from-amber-400 hover:to-amber-500 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20"
          >
            Simular agora
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
}
