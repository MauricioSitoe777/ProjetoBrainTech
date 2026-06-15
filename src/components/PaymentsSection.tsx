import { PAYMENT_METHODS } from "../data/constants";
import { useScrollTo } from "../hooks";

/**
 * Payment methods grid + civil-servant promotional CTA banner.
 */
export default function PaymentsSection({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const scrollTo = useScrollTo();

  return (
    <section id="pagamentos" className="py-12 bg-zinc-900/30">
      <div className="max-w-7xl mx-auto px-6">

        {/* Section header */}
        <div className="text-center mb-12">
          <div className="text-amber-500 text-xs font-bold uppercase tracking-widest mb-3">
            Pagamentos
          </div>
          <h2
            className="text-white text-4xl md:text-5xl font-black"
          >
            Pague como preferir
          </h2>
          <p className="text-white text-base mt-4 max-w-xl mx-auto">
            Aceitamos os principais métodos de pagamento móvel em Moçambique através de negociação directa e offline.
          </p>
        </div>

        {/* Offline Negotiation Alert */}
        <div className="mb-10 max-w-2xl mx-auto bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-white text-sm font-medium leading-relaxed">
            <span className="text-amber-500 font-black uppercase text-[10px] block mb-1">Processo de Pagamento</span>
            O pagamento <span className="text-white font-bold underline">não é processado nesta aplicação</span>. Após simular ou reservar, o administrador entrará em contacto para negociar e fornecer as instruções de pagamento seguro (M-Pesa ou Transferência).
          </p>
        </div>

        {/* Payment method cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.name}
              className="group rounded-2xl bg-zinc-900 border border-zinc-800 p-6 hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 overflow-hidden p-2"
                style={{
                  backgroundColor: m.color + "15",
                  border: `1px solid ${m.color}30`,
                }}
              >
                <img
                  src={(m as any).logo}
                  alt={m.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    // Fallback se a imagem falhar
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<span style="color: ${m.color}; font-weight: bold;">${m.name.slice(0, 2)}</span>`;
                  }}
                />
              </div>
              <h3 className="text-white font-bold text-base mb-2">{m.name}</h3>
              <p className="text-white text-sm leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Civil-servant promo banner */}
        <div className="mt-12 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-8 md:p-12 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #d8a020, transparent 60%)" }}
          />

          <div className="relative">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-4">
              Oferta Especial
            </div>
            <h3
              className="text-white text-3xl md:text-4xl font-black mb-4"
            >
              Pague 
              <br />
              Enquanto Usa
            </h3>
            <p className="text-white text-base max-w-xl mx-auto mb-8">
              Desconto direto no salário. Taxas preferenciais e prazo
              até 12 meses sem entrada.
            </p>
            <button
              onClick={() => {
                onShowSimulator?.();
                scrollTo("simulador");
              }}
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
