import { PAYMENT_METHODS } from "../data/constants";
import { useScrollTo } from "../hooks";

export default function PaymentsSection({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const scrollTo = useScrollTo();

  return (
    <section id="pagamentos" className="py-10 md:py-14 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="text-center mb-7">
          <div className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mb-2">
            Pagamentos
          </div>
          <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight">
            Pague como preferir
          </h2>
          <p className="text-zinc-400 text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Aceitamos os principais métodos de pagamento móvel em Moçambique através de negociação directa e offline.
          </p>
        </div>

        {/* Offline alert */}
        <div className="mb-7 max-w-2xl mx-auto bg-amber-500/8 border border-amber-500/20 px-4 py-3.5 rounded-xl flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <p className="text-zinc-300 text-[13px] font-medium leading-relaxed">
            <span className="text-amber-500 font-bold uppercase text-[10px] block mb-0.5">Processo de Pagamento</span>
            O pagamento <span className="text-white font-semibold">não é processado nesta aplicação</span>. Após simular ou reservar, o administrador entrará em contacto para negociar e fornecer as instruções de pagamento seguro.
          </p>
        </div>

        {/* Payment cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.name}
              className="group rounded-xl bg-zinc-900 border border-zinc-800/80 p-4 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 overflow-hidden p-1.5"
                style={{ backgroundColor: m.color + "15", border: `1px solid ${m.color}30` }}
              >
                <img
                  src={(m as any).logo}
                  alt={m.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<span style="color: ${m.color}; font-weight: bold; font-size: 12px">${m.name.slice(0, 2)}</span>`;
                  }}
                />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{m.name}</h3>
              <p className="text-zinc-500 text-[13px] leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Promo banner */}
        <div className="mt-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-6 py-8 md:px-10 md:py-10 text-center relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #d8a020, transparent 60%)" }}
          />
          <div className="relative">
            <div className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-3">
              Oferta Especial
            </div>
            <h3 className="text-white text-xl md:text-2xl font-black tracking-tight mb-2">
              Pague Enquanto Usa
            </h3>
            <p className="text-zinc-400 text-sm max-w-md mx-auto mb-5 leading-relaxed">
              Desconto direto no salário. Taxas preferenciais e prazo até 12 meses sem entrada.
            </p>
            <button
              onClick={() => { onShowSimulator?.(); scrollTo("simulador"); }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20"
            >
              Simular Agora
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
