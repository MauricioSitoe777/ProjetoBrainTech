import { useEffect, useRef, useState } from "react";
import { useScrollTo } from "../hooks";
import { useXitique } from "../context/XitiqueContext";

/**
 * Section explaining the Xitique (Traditional Saving) system for car purchase.
 */
export default function XitiqueSection({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const { grupos } = useXitique();
  const isClosed = grupos.length === 0 || grupos.every(g => g.estadoGrupo !== 'Aberto' || g.membros.length >= g.maxMembros);

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

  const features = [
    {
      title: "Poupança Colectiva",
      desc: "Um grupo de 10 pessoas une-se para alcançar o sonho do carro próprio através de contribuições mensais.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    },
    {
      title: "Sorteios Mensais",
      desc: "Todos os meses, um membro é contemplado com 300.000 MT para a entrada ou compra da sua viatura.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    },
    {
      title: "Sem Juros Bancários",
      desc: "Uma alternativa justa e tradicional para quem quer evitar as taxas elevadas dos financiamentos bancários.",
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      )
    }
  ];

  return (
    <section id="xitique" className="py-24 relative overflow-hidden bg-zinc-950">
      {/* ── Background Elements ── */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div ref={sectionRef} className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Side: Info */}
          <div 
            className="transition-all duration-1000"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(-40px)",
            }}
          >
            <div className={`inline-flex items-center gap-2 border rounded-full px-4 py-1.5 mb-6 ${
              isClosed 
              ? "bg-red-500/10 border-red-500/20 text-red-400" 
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isClosed ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[11px] font-bold uppercase tracking-widest">
                {isClosed ? "Sorteio Finalizado / Em Andamento" : "Inscrições Abertas"}
              </span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black text-white leading-[1.1] mb-6">
              O Caminho Mais Curto para o Seu <span className="text-amber-500">Novo Carro</span>
            </h2>
            
            <p className="text-white text-lg mb-10 leading-relaxed max-w-xl font-medium">
              O Xitique é a nossa solução de poupança comunitária. Junte-se a um grupo, contribua mensalmente e seja o próximo a receber as chaves.
            </p>

            <div className="space-y-8">
              {features.map((f, i) => (
                <div key={i} className="flex gap-5">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-500 shadow-xl">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xl mb-1">{f.title}</h3>
                    <p className="text-white text-base leading-relaxed font-medium">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap gap-4">
              <button 
                onClick={() => {
                   try {
                     window.dispatchEvent(new CustomEvent("rentcar:open-xitique-modal"));
                   } catch { /* ignore */ }
                }}
                className={`px-8 py-4 font-black uppercase text-sm tracking-wider rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl ${
                  isClosed 
                  ? "bg-zinc-800 text-white border border-zinc-700 cursor-not-allowed" 
                  : "bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-amber-500/10"
                }`}
              >
                {isClosed ? "Inscrições Encerradas" : "Quero Participar"}
              </button>
              <button 
                onClick={() => {
                   try {
                     window.dispatchEvent(new CustomEvent("rentcar:open-xitique-regs"));
                   } catch { /* ignore */ }
                }}
                className="px-8 py-4 bg-zinc-900 text-white border border-zinc-800 font-black uppercase text-sm tracking-wider rounded-2xl hover:bg-zinc-800 transition-all"
              >
                Ver Regulamento
              </button>
            </div>
          </div>

          {/* Right Side: Visual representation of how it works */}
          <div 
            className="relative transition-all duration-1000 delay-300"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.95)",
            }}
          >
            <div className="bg-zinc-900 border border-zinc-700 p-8 md:p-10 rounded-[40px] backdrop-blur-sm relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-3xl -mr-16 -mt-16 rounded-full" />
              
              <h3 className="text-white font-black text-2xl mb-8 uppercase tracking-tight">Como funciona o ciclo?</h3>
              
              <div className="space-y-6">
                {[
                  { step: "1", text: "Grupo de 10 membros formado pelo Admin.", active: true },
                  { step: "2", text: "Cada membro contribui com 30.000 MT por mês.", active: true },
                  { step: "3", text: "Sorteio mensal de 300.000 MT para um contemplado.", active: true },
                  { step: "4", text: "Entrega imediata da viatura ou crédito em conta.", active: true },
                  { step: "5", text: "O ciclo continua por 10 meses até todos serem premiados.", active: true },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${s.active ? 'bg-amber-500 border-amber-400 text-zinc-950' : 'bg-zinc-800 border-zinc-700 text-white'}`}>
                      {s.step}
                    </div>
                    <p className={`text-sm md:text-base font-bold ${s.active ? 'text-white' : 'text-white'}`}>{s.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-zinc-700 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Quota Mensal</p>
                  <p className="text-3xl font-black text-white">30.000 <span className="text-amber-500 text-sm">MT</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Prémio Final</p>
                  <p className="text-3xl font-black text-amber-500">300.000 <span className="text-white text-sm">MT</span></p>
                </div>
              </div>

              <div className="mt-8 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <p className="text-xs text-amber-400 font-black leading-tight">
                  ⚠️ NOTA: Os valores e o número de membros podem variar de acordo com o grupo disponível no momento da inscrição.
                </p>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500 rounded-3xl rotate-12 -z-10 blur-2xl opacity-20 animate-pulse" />
          </div>

        </div>
      </div>
    </section>
  );
}
