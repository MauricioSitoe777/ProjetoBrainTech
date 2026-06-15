import { useEffect, useRef, useState } from "react";


export default function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="sobre" className="py-24 bg-zinc-950 relative overflow-hidden">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-amber-500/4 blur-[120px] rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/3 blur-[100px] rounded-full -ml-32 -mb-32" />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-6 space-y-20">

        {/* ── Cabeçalho ── */}
        <div
          className="text-center transition-all duration-700"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-amber-400 text-[11px] font-bold uppercase tracking-widest">Sobre Nós</span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-black text-white leading-tight mb-4"
          >
            A Nossa <span className="text-amber-500">História</span>
          </h2>
          <p className="text-white text-lg max-w-2xl mx-auto leading-relaxed">
            Desde 2015 que a SOS Motors liga moçambicanos ao veículo certo — seja para alugar,
            comprar ou poupar em grupo através do Xitique.
          </p>
        </div>

        {/* ── Missão & Valores ── */}
        <div
          className="grid md:grid-cols-3 gap-5 transition-all duration-700 delay-100"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(30px)' }}
        >
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4l3 3"/>
                </svg>
              ),
              titulo: "A Nossa Missão",
              texto: "Democratizar o acesso à mobilidade em Moçambique, oferecendo soluções de aluguer e aquisição de viaturas com transparência, flexibilidade e preços justos.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              ),
              titulo: "A Nossa Visão",
              texto: "Ser a empresa de referência em serviços de mobilidade automóvel em Moçambique, expandindo a nossa rede de balcões a todas as províncias",
            },
          ].map((c) => (
            <div key={c.titulo} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-4 group-hover:bg-amber-500/15 transition-colors">
                {c.icon}
              </div>
              <h3 className="text-white font-black text-lg mb-2">{c.titulo}</h3>
              <p className="text-white text-sm leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}
