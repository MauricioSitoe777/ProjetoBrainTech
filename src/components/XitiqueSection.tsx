import { useEffect, useRef, useState } from "react";
import { Users, DollarSign, Ban, Lock, ArrowRight, FileText } from "lucide-react";
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

  const openGroups = grupos.filter(g => g.estadoGrupo === 'Aberto' && g.membros.length < g.maxMembros);
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const quotaDisplay = openGroups.length > 0
    ? `${fmt(openGroups[0].quotaMT)} MT`
    : 'A definir';
  const premioDisplay = openGroups.length > 0
    ? `${fmt(openGroups[0].premioMT)} MT`
    : 'A definir';

  const features = [
    {
      title: "Poupança Colectiva",
      desc: "Grupos organizados pelo admin com número de membros e quota próprios — cada ciclo tem as suas condições.",
      icon: <Users size={22} strokeWidth={2} />,
    },
    {
      title: "Sorteios Mensais",
      desc: "Todos os meses, um membro é contemplado com o fundo total do grupo para entrada ou compra da viatura.",
      icon: <DollarSign size={22} strokeWidth={2} />,
    },
    {
      title: "Sem Juros Bancários",
      desc: "Uma alternativa justa e tradicional para quem quer evitar as taxas elevadas dos financiamentos bancários.",
      icon: <Ban size={22} strokeWidth={2} />,
    },
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
                  try { window.dispatchEvent(new CustomEvent("rentcar:open-xitique-modal")); } catch { /* ignore */ }
                }}
                disabled={isClosed}
                className={`group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-wider transition-all duration-300 overflow-hidden ${
                  isClosed
                    ? "bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                    : "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.03] active:scale-[0.97] shadow-[0_8px_32px_rgba(245,158,11,0.35)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.5)]"
                }`}
              >
                {isClosed ? (
                  <>
                    <Lock size={15} strokeWidth={2.5} />
                    Inscrições Encerradas
                  </>
                ) : (
                  <>
                    <Users size={15} strokeWidth={2.5} />
                    Quero Participar
                    <ArrowRight size={14} strokeWidth={3} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent("rentcar:open-xitique-regs")); } catch { /* ignore */ }
                }}
                className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase text-sm tracking-wider transition-all duration-300 border border-zinc-700 bg-zinc-900/50 text-white hover:border-amber-500/50 hover:bg-zinc-800/80 hover:text-amber-400 active:scale-[0.97]"
              >
                <FileText size={15} strokeWidth={2.5} className="text-amber-500 group-hover:text-amber-400 transition-colors" />
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
                  { step: "1", text: "O admin cria o grupo e define o número de membros e a quota mensal." },
                  { step: "2", text: "Cada membro contribui com a quota mensal definida para o grupo." },
                  { step: "3", text: "Sorteio mensal do fundo acumulado entre todos os membros." },
                  { step: "4", text: "O contemplado recebe a viatura ou o crédito em conta." },
                  { step: "5", text: "O ciclo repete-se até todos os membros serem contemplados." },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border bg-amber-500 border-amber-400 text-zinc-950 shrink-0">
                      {s.step}
                    </div>
                    <p className="text-sm md:text-base font-bold text-white">{s.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-zinc-700 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Quota Mensal</p>
                  <p className="text-2xl font-black text-white">{quotaDisplay}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Fundo do Grupo</p>
                  <p className="text-2xl font-black text-amber-500">{premioDisplay}</p>
                </div>
              </div>

              <div className="mt-8 bg-amber-500/10 border border-amber-500/30 p-5 rounded-2xl">
                <p className="text-xs text-amber-400 font-black leading-tight">
                  ⚠️ Os valores, número de membros e duração variam consoante o grupo. Consulte os grupos disponíveis ao inscrever-se.
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
