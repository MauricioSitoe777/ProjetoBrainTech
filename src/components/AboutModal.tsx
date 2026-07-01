import { useEffect } from "react";

export default function AboutModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-white font-black text-base tracking-tight">Sobre Nós</span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-zinc-800 text-white hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all text-lg font-bold"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-10 space-y-10">

          {/* Intro */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Desde 2015</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4">
              A Nossa <span className="text-amber-500">História</span>
            </h2>
            <p className="text-zinc-400 text-base max-w-2xl mx-auto leading-relaxed">
              Desde 2015 que a SOS Motors liga moçambicanos ao veículo certo — seja para alugar,
              comprar ou poupar em grupo através do Xitique.
            </p>
          </div>

          {/* Missão, Valores, Visão */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                ),
                titulo: "A Nossa Missão",
                texto: "Democratizar o acesso à mobilidade em Moçambique, oferecendo soluções de aluguer e aquisição de viaturas com transparência, flexibilidade e preços justos.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                titulo: "Os Nossos Valores",
                texto: "Confiança, transparência e compromisso com o cliente. Acreditamos que cada pessoa merece uma solução de mobilidade adaptada ao seu contexto e orçamento.",
              },
              {
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                titulo: "A Nossa Visão",
                texto: "Ser a empresa de referência em serviços de mobilidade automóvel em Moçambique, expandindo a nossa rede de balcões a todas as províncias.",
              },
            ].map((c) => (
              <div key={c.titulo} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-amber-500/30 transition-colors group">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 group-hover:bg-amber-500/15 transition-colors">
                  {c.icon}
                </div>
                <h3 className="text-white font-black text-base mb-2">{c.titulo}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { valor: "10+", label: "Anos de experiência" },
              { valor: "500+", label: "Clientes satisfeitos" },
              { valor: "15",  label: "Viaturas disponíveis" },
              { valor: "3",   label: "Modalidades de acesso" },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center hover:border-amber-500/20 transition-colors">
                <div className="text-3xl font-black text-amber-500 mb-1">{s.valor}</div>
                <div className="text-zinc-400 text-xs font-semibold leading-tight">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Equipa / Contactos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-white font-black text-lg mb-4">Contacte-nos</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: "📍", label: "Morada", valor: "Av. Julius Nyerere, Maputo, Moçambique" },
                { icon: "📞", label: "Telefone", valor: "+258 84 000 0000" },
                { icon: "✉️", label: "Email", valor: "geral@sosmotors.co.mz" },
                { icon: "🕐", label: "Horário", valor: "Seg–Sex: 08:00–18:00 | Sáb: 08:00–13:00" },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{item.icon}</span>
                  <div>
                    <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mb-0.5">{item.label}</p>
                    <p className="text-white text-sm font-semibold">{item.valor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
