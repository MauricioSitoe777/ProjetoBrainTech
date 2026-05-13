import { STEPS } from "../data/constants";

/**
 * Four-step process explainer with SVG icons and connecting lines.
 */
export default function HowItWorks() {
  return (
    <section id="como-funciona" className="py-28 bg-zinc-900/50">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <div className="text-center mb-16">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
            Processo
          </div>
          <h2
            className="text-white text-4xl md:text-5xl font-black"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Como Funciona
          </h2>
          <p className="text-zinc-400 text-base mt-4 max-w-xl mx-auto">
            Do catálogo às chaves na mão, o processo é 100% digital e transparente.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div key={step.n} className="relative group h-full">
              <div className="relative h-full flex flex-col rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-amber-500/40 transition-all duration-300 hover:-translate-y-1">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                  <svg
                    width="22" height="22" viewBox="0 0 24 24"
                    fill="none" stroke="#f59e0b" strokeWidth="1.8"
                  >
                    <path d={step.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                {/* Step number */}
                <div className="text-amber-500/50 text-xs font-black tracking-widest mb-2 uppercase">
                  {step.n}
                </div>

                <h3 className="text-white font-bold text-base mb-2">{step.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
