import { STEPS } from "../data/constants";
import { useScrollTo } from "../hooks";

export default function HowItWorks({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const scrollTo = useScrollTo();

  return (
    <section id="como-funciona" className="relative overflow-hidden bg-zinc-900 py-12 md:py-14 lg:py-16">
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(228,180,46,0.06) 0%, transparent 70%)" }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10 w-full">

        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Processo Simples</span>
          </div>
          <h2 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-tight">
            Como{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
              Funciona
            </span>
          </h2>
          <p className="text-white text-base mt-3 max-w-xl mx-auto leading-relaxed">
            Do catálogo às chaves na mão — o processo é{" "}
            <span className="text-white font-semibold">100% digital</span>,{" "}
            <span className="text-white font-semibold">transparente</span> e
            pensado para Moçambique.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden lg:block absolute top-[50px] left-[calc(10%+20px)] right-[calc(10%+20px)] h-px">
            <div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #E4B42E 0%, #E4B42E40 50%, #E4B42E 100%)" }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative group">
                <div className="relative h-full flex flex-col rounded-2xl bg-zinc-900/80 border border-zinc-800/60 p-4 lg:p-5 hover:border-amber-500/40 transition-colors duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 backdrop-blur-sm">
                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(228,180,46,0.07), transparent 70%)" }}
                  />

                  {/* Step number */}
                  <div className="relative z-10 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:shadow-amber-500/35 group-hover:scale-105 transition-all duration-300">
                      <span className="text-zinc-950 text-sm font-black">{step.n}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="relative z-10 w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-3 group-hover:border-amber-500/30 transition-colors duration-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4B42E" strokeWidth="1.8"
                      className="group-hover:scale-110 transition-transform duration-300">
                      <path d={step.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Content */}
                  <h3 className="relative z-10 text-white font-bold text-base mb-1.5 group-hover:text-amber-50 transition-colors duration-300">
                    {step.title}
                  </h3>
                  <p className="relative z-10 text-white text-sm leading-relaxed">
                    {step.desc}
                  </p>

                  {/* Bottom accent */}
                  <div className="mt-auto pt-3 relative z-10">
                    <div className="h-px rounded-full bg-gradient-to-r from-amber-500 to-amber-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
