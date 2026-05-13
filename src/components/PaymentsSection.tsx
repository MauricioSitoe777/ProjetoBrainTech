import { PAYMENT_METHODS } from "../data/constants";
import { useScrollTo } from "../hooks";

/**
 * Payment methods grid + civil-servant promotional CTA banner.
 */
export default function PaymentsSection() {
  const scrollTo = useScrollTo();

  return (
    <section id="pagamentos" className="py-28 bg-zinc-900/30">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <div className="text-center mb-16">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
            Pagamentos
          </div>
          <h2
            className="text-white text-4xl md:text-5xl font-black"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Pague como preferir
          </h2>
          <p className="text-zinc-400 text-base mt-4 max-w-xl mx-auto">
            Aceitamos os principais métodos de pagamento móvel em Moçambique.
          </p>
        </div>

        {/* Payment method cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.name}
              className="group rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 font-black text-sm"
                style={{
                  backgroundColor: m.color + "20",
                  border: `1px solid ${m.color}40`,
                  color: m.color,
                }}
              >
                {m.name.slice(0, 2)}
              </div>
              <h3 className="text-white font-bold text-base mb-2">{m.name}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Civil-servant promo banner */}
        <div className="mt-16 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 md:p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #f59e0b, transparent 60%)" }}
          />

          <div className="relative">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Oferta Especial
            </div>
            <h3
              className="text-white text-3xl md:text-4xl font-black mb-4"
              style={{ fontFamily: "'Archivo', sans-serif" }}
            >
              Pague 
              <br />
              enquanto usa!!!
            </h3>
            <p className="text-zinc-400 text-base max-w-xl mx-auto mb-8">
              Desconto direto no salário. Taxas preferenciais e prazo
              até 12 meses sem entrada.
            </p>
            <button
              onClick={() => scrollTo("simulador")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Simular Agora
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
