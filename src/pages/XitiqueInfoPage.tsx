import { useState } from "react";
import { useXitique } from "../context/XitiqueContext";
import { useRoute } from "../hooks/useRoute";
import Footer from "../components/Footer";
import XitiqueModal from "../components/XitiqueModal";
import XitiqueRegulationsModal from "../components/XitiqueRegulationsModal";

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + ',00';

const STEPS = [
  {
    n: "01",
    title: "Admin cria o grupo",
    desc: "A equipa SOS Motors abre um grupo com número de membros definido, quota mensal e o prémio total do ciclo.",
    icon: "M12 4.354a4 4 0 1 1 0 5.292M15 21H3v-1a6 6 0 0 1 12 0v1zm0 0h6v-1a6 6 0 0 0-9-5.197",
  },
  {
    n: "02",
    title: "Inscreve-se no grupo",
    desc: "Escolhe o grupo que melhor se adapta à sua capacidade financeira e submete a sua inscrição.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  },
  {
    n: "03",
    title: "Contribui mensalmente",
    desc: "Todos os meses, cada membro contribui com a quota definida para o fundo colectivo do grupo.",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 0 0 3-3V8a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3z",
  },
  {
    n: "04",
    title: "Sorteio mensal",
    desc: "No final de cada mês é realizado um sorteio entre todos os membros ainda não contemplados.",
    icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6v6l4 2",
  },
  {
    n: "05",
    title: "Recebe o prémio",
    desc: "O contemplado recebe o fundo total para usar como entrada numa viatura SOS Motors ou compra directa.",
    icon: "M5 3l14 9-14 9V3z",
  },
  {
    n: "06",
    title: "Ciclo completo",
    desc: "O processo repete-se até que todos os membros do grupo tenham sido contemplados. Ninguém fica de fora.",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15",
  },
];

const BENEFITS = [
  {
    title: "Sem Juros Bancários",
    desc: "Evita as taxas elevadas dos financiamentos tradicionais. O que poupares é inteiramente seu.",
    iconColor: "text-amber-300",
    titleColor: "text-amber-300",
    bg: "bg-amber-400/8 border-amber-400/20",
    iconBg: "bg-amber-400/12 border-amber-400/20",
    icon: "M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10",
  },
  {
    title: "Solidariedade Comunitária",
    desc: "Baseado na tradição africana do Xitique — poupança colectiva com confiança mútua.",
    iconColor: "text-amber-500",
    titleColor: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/25",
    iconBg: "bg-amber-500/15 border-amber-500/25",
    icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0",
  },
  {
    title: "Garantido pela SOS Motors",
    desc: "O processo é gerido e validado pela SOS Motors. A sua contribuição está segura.",
    iconColor: "text-yellow-300",
    titleColor: "text-yellow-300",
    bg: "bg-yellow-400/8 border-yellow-400/20",
    iconBg: "bg-yellow-400/12 border-yellow-400/20",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Acesso à Viatura",
    desc: "O prémio pode ser usado como entrada ou pagamento total de qualquer viatura do catálogo SOS Motors.",
    iconColor: "text-orange-400",
    titleColor: "text-orange-400",
    bg: "bg-orange-500/8 border-orange-500/20",
    iconBg: "bg-orange-500/12 border-orange-500/20",
    icon: "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  },
];

const FAQS = [
  {
    q: "O que acontece se eu não conseguir pagar a quota num mês?",
    a: "A SOS Motors tem uma política de tolerância para situações excepcionais. Entre em contacto com a equipa antes do prazo. Faltas repetidas podem resultar na exclusão do grupo.",
  },
  {
    q: "Posso participar em mais do que um grupo ao mesmo tempo?",
    a: "Sim, desde que consiga honrar as quotas de cada grupo. Cada inscrição é independente.",
  },
  {
    q: "Como é feito o sorteio? É transparente?",
    a: "O sorteio é realizado presencialmente ou em videochamada com todos os membros do grupo, garantindo total transparência.",
  },
  {
    q: "E se o grupo não completar o número de membros necessários?",
    a: "O grupo só inicia o ciclo após estar completo. Caso não seja completado num prazo razoável, as inscrições são reembolsadas ou transferidas para outro grupo.",
  },
  {
    q: "Posso usar o prémio para qualquer viatura?",
    a: "Sim, o prémio pode ser aplicado em qualquer viatura do catálogo SOS Motors, tanto para aluguer como para compra.",
  },
];

const STATS = [
  { value: "0%", label: "Juros" },
  { value: "100%", label: "Transparência" },
  { value: "6", label: "Passos simples" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
      <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
      <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">{children}</span>
    </div>
  );
}

export function XitiqueInfoPage() {
  const { navigate } = useRoute();
  const { grupos } = useXitique();
  const [showModal, setShowModal] = useState(false);
  const [showRegs, setShowRegs] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const gruposAbertos = grupos.filter(
    (g) => g.estadoGrupo === "Aberto" && g.membros.length < g.maxMembros
  );
  const isClosed = gruposAbertos.length === 0;

  return (
    <div className="min-h-screen bg-zinc-950 antialiased">
      <main>

        {/* ══════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden pt-6 pb-12 md:pt-8 md:pb-16 px-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(245,158,11,0.08),transparent)] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,rgb(9,9,11))] pointer-events-none" />
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          <div className="relative max-w-5xl mx-auto">

            <div className="max-w-3xl">

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-4">
                O Xitique é a Forma Mais <span className="text-amber-500">Justa</span> de Ter o Seu Carro
              </h1>

              <p className="text-white text-sm md:text-base leading-relaxed max-w-2xl mb-8">
                Inspirado na tradição africana de poupança colectiva, o Xitique SOS Motors
                permite que um grupo de pessoas contribua mensalmente para que cada membro,
                por sorteio, receba o fundo para adquirir a sua viatura —
                <strong className="text-amber-400 font-semibold"> sem juros, sem burocracia bancária.</strong>
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 mb-10">
                <button
                  onClick={() => setShowModal(true)}
                  disabled={isClosed}
                  className={`flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm transition-all ${
                    isClosed
                      ? "bg-zinc-800 text-white cursor-not-allowed"
                      : "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/25"
                  }`}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0" />
                  </svg>
                  {isClosed ? "Sem vagas disponíveis" : "Quero Participar"}
                </button>
                <button
                  onClick={() => setShowRegs(true)}
                  className="flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-bold text-sm border border-zinc-700 text-white hover:border-amber-500/40 hover:text-amber-400 transition-all"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Ver Regulamento
                </button>
              </div>

              {/* Stats strip */}
              <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-zinc-800/60">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl md:text-3xl font-black text-white">{s.value}</p>
                    <p className="text-white text-xs font-semibold mt-0.5 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            BENEFÍCIOS
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 px-5 bg-zinc-900/30 border-y border-zinc-800/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <SectionLabel>Porquê o Xitique?</SectionLabel>
              <h2 className="text-white text-3xl md:text-4xl font-black mt-2">As Vantagens são Claras</h2>
              <p className="text-white text-sm mt-3 max-w-md mx-auto">
                Uma alternativa justa e comunitária ao crédito bancário tradicional.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {BENEFITS.map((b) => (
                <div
                  key={b.title}
                  className={`rounded-2xl border p-5 flex flex-col gap-3 transition-transform hover:-translate-y-1 duration-200 ${b.bg}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${b.iconBg}`}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={b.iconColor}>
                      <path d={b.icon} />
                    </svg>
                  </div>
                  <div>
                    <h3 className={`font-black text-sm mb-2 ${b.titleColor}`}>{b.title}</h3>
                    <p className="text-white text-[13px] leading-relaxed">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            COMO FUNCIONA
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 px-5">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <SectionLabel>Passo a Passo</SectionLabel>
              <h2 className="text-white text-3xl md:text-4xl font-black mt-2">Como Funciona o Xitique</h2>
              <p className="text-white text-sm mt-3 max-w-lg mx-auto">
                O processo é simples e transparente. Da inscrição ao prémio, cada etapa é gerida pela SOS Motors.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {STEPS.map((s, i) => (
                <div
                  key={s.n}
                  className={`flex gap-4 p-5 rounded-2xl border transition-colors ${
                    i % 2 === 0
                      ? "bg-zinc-900/70 border-zinc-800"
                      : "bg-zinc-900/40 border-zinc-800/50"
                  }`}
                >
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-[11px] font-black text-zinc-950 shadow-lg shadow-amber-500/25">
                      {s.n}
                    </div>
                  </div>
                  <div className="pt-1">
                    <h3 className="text-white font-black text-sm mb-1.5">{s.title}</h3>
                    <p className="text-white text-[13px] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            GRUPOS DISPONÍVEIS
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 px-5 bg-zinc-900/30 border-y border-zinc-800/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <SectionLabel>Em tempo real</SectionLabel>
              <h2 className="text-white text-3xl md:text-4xl font-black mt-2">Grupos Disponíveis</h2>
              <p className="text-white text-sm mt-3 max-w-md mx-auto">
                Vagas limitadas por ciclo. Inscreva-se antes de lotarem.
              </p>
            </div>

            {gruposAbertos.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-white font-black text-base mb-2">Sem grupos abertos de momento</h3>
                <p className="text-white text-sm max-w-xs mx-auto">
                  Todos os grupos estão em andamento. Novos grupos são abertos regularmente — volte em breve.
                </p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-5">
                {gruposAbertos.map((g) => {
                  const vagasLivres = g.maxMembros - g.membros.length;
                  const pct = Math.round((g.membros.length / g.maxMembros) * 100);
                  return (
                    <div
                      key={g.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-amber-500/30 transition-all hover:-translate-y-0.5 duration-200"
                    >
                      <div className="flex items-start justify-between gap-3 mb-5">
                        <h3 className="text-white font-black text-base">{g.nome}</h3>
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${
                          vagasLivres <= 2
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}>
                          {vagasLivres} vaga{vagasLivres !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-zinc-800/50 rounded-xl p-3">
                          <p className="text-white text-[10px] uppercase tracking-widest font-semibold mb-1">Quota Mensal</p>
                          <p className="text-white font-black text-xl">{fmt(g.quotaMT)} <span className="text-white text-xs font-semibold">MT</span></p>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
                          <p className="text-white text-[10px] uppercase tracking-widest font-semibold mb-1">Prémio Total</p>
                          <p className="text-amber-400 font-black text-xl">{fmt(g.premioMT)} <span className="text-white text-xs font-semibold">MT</span></p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between text-[10px] font-semibold mb-2">
                          <span className="text-white">Membros inscritos</span>
                          <span className="text-white">{g.membros.length}/{g.maxMembros}</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => setShowModal(true)}
                        className="w-full py-3 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-widest hover:bg-amber-400 active:scale-[0.98] transition-all"
                      >
                        Inscrever neste grupo
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════════ */}
        <section className="py-10 md:py-14 px-5">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <SectionLabel>Dúvidas Frequentes</SectionLabel>
              <h2 className="text-white text-3xl md:text-4xl font-black mt-2">Perguntas &amp; Respostas</h2>
              <p className="text-white text-sm mt-3 max-w-md mx-auto">
                Tudo o que precisa de saber antes de se inscrever.
              </p>
            </div>

            <div className="space-y-2">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`border rounded-2xl overflow-hidden transition-colors ${
                    openFaq === i ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors"
                  >
                    <span className="text-white font-semibold text-sm leading-snug">{faq.q}</span>
                    <svg
                      width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={`text-amber-500 shrink-0 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="text-white text-[13px] leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>



      </main>

      <Footer />

      {showModal && <XitiqueModal onClose={() => setShowModal(false)} />}
      {showRegs && <XitiqueRegulationsModal onClose={() => setShowRegs(false)} />}
    </div>
  );
}
