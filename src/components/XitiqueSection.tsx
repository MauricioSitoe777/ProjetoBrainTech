import { useEffect, useRef, useState } from "react";
import { Users, DollarSign, Ban, Lock, ArrowRight, FileText } from "lucide-react";
import { useXitique } from "../context/XitiqueContext";

export default function XitiqueSection({
  onShowSimulator,
}: {
  onShowSimulator?: () => void;
}) {
  const { grupos } = useXitique();
  const isClosed = grupos.length === 0 || grupos.every(g => g.estadoGrupo !== 'Aberto' || g.membros.length >= g.maxMembros);

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

  const openGroups = grupos.filter(g => g.estadoGrupo === 'Aberto' && g.membros.length < g.maxMembros);
  const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const quotaDisplay = openGroups.length > 0 ? `${fmt(openGroups[0].quotaMT)} MT` : 'A definir';
  const premioDisplay = openGroups.length > 0 ? `${fmt(openGroups[0].premioMT)} MT` : 'A definir';

  const features = [
    {
      title: "Poupança Colectiva",
      desc: "Grupos com número de membros e quota próprios — cada ciclo tem as suas condições.",
      icon: <Users size={17} strokeWidth={2} />,
    },
    {
      title: "Sorteios Mensais",
      desc: "Todos os meses, um membro recebe o fundo total para entrada ou compra da viatura.",
      icon: <DollarSign size={17} strokeWidth={2} />,
    },
    {
      title: "Sem Juros Bancários",
      desc: "Uma alternativa justa para quem quer evitar as taxas elevadas dos financiamentos.",
      icon: <Ban size={17} strokeWidth={2} />,
    },
  ];

  return (
    <section
      id="xitique"
      className="py-12 md:py-16 relative overflow-hidden bg-zinc-950"
    >
      {/* Background glow */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[400px] h-[400px] bg-amber-500/5 blur-[100px] rounded-full pointer-events-none" />

      <div ref={sectionRef} className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* ── Left: Info ── */}
          <div
            className="transition-all duration-700"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateX(0)" : "translateX(-32px)",
            }}
          >
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 border rounded-full px-3 py-1 mb-4 ${
              isClosed
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isClosed ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {isClosed ? "Sorteio em andamento" : "Inscrições Abertas"}
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-3xl md:text-4xl lg:text-[42px] font-black text-white leading-[1.1] tracking-tight mb-4">
              O Caminho Mais Curto para o Seu{" "}
              <span className="text-amber-500">Novo Carro</span>
            </h2>

            {/* Description */}
            <p className="text-white text-sm md:text-base mb-6 leading-relaxed max-w-lg">
              O Xitique é a nossa solução de poupança comunitária. Junte-se a um grupo, contribua mensalmente e seja o próximo a receber as chaves.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {features.map((f, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-9 h-9 shrink-0 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500 shadow-md mt-0.5">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm mb-0.5">{f.title}</h3>
                    <p className="text-white text-[13px] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent("rentcar:open-xitique-modal")); } catch { /* ignore */ }
                }}
                disabled={isClosed}
                className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all duration-200 overflow-hidden ${
                  isClosed
                    ? "bg-zinc-800/60 text-zinc-500 border border-zinc-700/50 cursor-not-allowed"
                    : "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] shadow-[0_6px_24px_rgba(245,158,11,0.3)] hover:shadow-[0_8px_32px_rgba(245,158,11,0.45)]"
                }`}
              >
                {isClosed ? (
                  <><Lock size={13} strokeWidth={2.5} />Inscrições Encerradas</>
                ) : (
                  <>
                    <Users size={13} strokeWidth={2.5} />
                    Quero Participar
                    <ArrowRight size={13} strokeWidth={3} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  try { window.dispatchEvent(new CustomEvent("rentcar:open-xitique-regs")); } catch { /* ignore */ }
                }}
                className="group flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all duration-200 border border-zinc-700/80 bg-zinc-900/50 text-white hover:border-amber-500/40 hover:bg-zinc-800 hover:text-amber-400 active:scale-[0.98]"
              >
                <FileText size={13} strokeWidth={2.5} className="text-amber-500 group-hover:text-amber-400 transition-colors" />
                Ver Regulamento
              </button>
            </div>
          </div>

          {/* ── Right: Visual card ── */}
          <div
            className="relative transition-all duration-700 delay-200"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.97)",
            }}
          >
            <div className="bg-zinc-900/80 border border-zinc-800 p-5 md:p-7 rounded-3xl backdrop-blur-sm relative overflow-hidden shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)]">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/8 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none" />

              <h3 className="text-white font-black text-base md:text-lg mb-5 uppercase tracking-tight">
                Como funciona o ciclo?
              </h3>

              <div className="space-y-3.5">
                {[
                  { step: "1", text: "O admin cria o grupo e define o número de membros e a quota mensal." },
                  { step: "2", text: "Cada membro contribui com a quota mensal definida para o grupo." },
                  { step: "3", text: "Sorteio mensal do fundo acumulado entre todos os membros." },
                  { step: "4", text: "O contemplado recebe a viatura ou o crédito em conta." },
                  { step: "5", text: "O ciclo repete-se até todos os membros serem contemplados." },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border bg-amber-500 border-amber-400 text-zinc-950 shrink-0">
                      {s.step}
                    </div>
                    <p className="text-[13px] font-medium text-white leading-snug">{s.text}</p>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-6 pt-5 border-t border-zinc-800 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-white uppercase tracking-widest mb-1">Quota Mensal</p>
                  <p className="text-xl font-black text-white tabular-nums">{quotaDisplay}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-white uppercase tracking-widest mb-1">Fundo do Grupo</p>
                  <p className="text-xl font-black text-amber-500 tabular-nums">{premioDisplay}</p>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 bg-amber-500/8 border border-amber-500/20 px-4 py-3 rounded-xl">
                <p className="text-[11px] text-amber-400/90 font-medium leading-relaxed">
                  ⚠️ Os valores, número de membros e duração variam consoante o grupo. Consulte os grupos disponíveis ao inscrever-se.
                </p>
              </div>
            </div>

            <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-amber-500 rounded-3xl rotate-12 -z-10 blur-2xl opacity-15" />
          </div>

        </div>
      </div>
    </section>
  );
}
