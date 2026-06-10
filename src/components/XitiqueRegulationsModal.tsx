import React from 'react';

interface XitiqueRegulationsModalProps {
  onClose: () => void;
}

export default function XitiqueRegulationsModal({ onClose }: XitiqueRegulationsModalProps) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight" style={{ fontFamily: "'Archivo', sans-serif" }}>
              Regulamento <span className="text-amber-500 text-3xl">Xitique</span>
            </h2>
            <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] mt-1">SOS Motors • Transparência e Confiança</p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-white hover:text-white hover:bg-zinc-700 transition-all text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* AVISO IMPORTANTE DE PAGAMENTO */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-3 text-amber-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h3 className="font-black text-lg uppercase tracking-tight">Aviso de Pagamento</h3>
            </div>
            <p className="text-white text-sm leading-relaxed font-bold">
              A SOS MOTORS <span className="text-amber-500 underline">não processa pagamentos automaticamente pela aplicação</span>. 
              Todo o processo financeiro é feito de forma presencial ou via canais oficiais (M-Pesa/Transferência) <span className="text-white">após negociação directa e confirmação com o administrador</span>.
            </p>
          </div>

          <div className="grid gap-8">
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">01</div>
                <h4 className="text-white font-black uppercase tracking-wider">Objectivo do Grupo</h4>
              </div>
              <p className="text-white text-sm leading-relaxed pl-11">
                O Xitique SOS Motors é uma modalidade de poupança colectiva composta por grupos de 10 membros, com o objectivo de facilitar a aquisição de viaturas ou o pagamento de entradas para financiamento.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">02</div>
                <h4 className="text-white font-black uppercase tracking-wider">Contribuições e Prazos</h4>
              </div>
              <ul className="text-white text-sm space-y-3 pl-11">
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>Cada membro contribui com uma quota mensal fixa de 30.000 MT.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>O ciclo tem a duração total de 10 meses.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>As contribuições devem ser confirmadas com o administrador até ao dia 5 de cada mês.</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">03</div>
                <h4 className="text-white font-black uppercase tracking-wider">Sorteios e Contemplação</h4>
              </div>
              <p className="text-white text-sm leading-relaxed pl-11">
                Mensalmente, será realizado um sorteio entre os membros que efectuaram o pagamento. O contemplado recebe um crédito de 300.000 MT para ser aplicado na viatura escolhida na SOS Motors.
              </p>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">04</div>
                <h4 className="text-white font-black uppercase tracking-wider">Passo a Passo para Pagamento</h4>
              </div>
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 space-y-4 ml-11">
                {[
                  { step: "A", text: "Demonstre interesse na aplicação clicando em 'Quero Participar'." },
                  { step: "B", text: "O administrador entrará em contacto para validar o seu perfil e enviar os dados de conta/M-Pesa." },
                  { step: "C", text: "Realize o pagamento fora da aplicação e envie o comprovativo ao administrador." },
                  { step: "D", text: "O administrador confirmará o seu pagamento e actualizará o seu estado no grupo." },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start">
                    <span className="text-amber-500 font-black text-xs mt-1">{item.step}.</span>
                    <span className="text-white text-xs font-medium leading-tight">{item.text}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* SEPARADOR VISUAL */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-amber-500/20"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-zinc-900 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-amber-500/70">Regras de Negócio e Segurança Jurídica</span>
              </div>
            </div>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">05</div>
                <h4 className="text-white font-black uppercase tracking-wider">Reserva de Propriedade</h4>
              </div>
              <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl ml-11 space-y-3">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Alienação Fiduciária</span>
                </div>
                <ul className="text-white text-sm space-y-3">
                  <li className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>A viatura <strong className="text-white">não é transferida definitivamente</strong> para o nome do cliente no acto do levantamento.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>O livrete e o título de propriedade ficam registados com uma <strong className="text-white">reserva de propriedade a favor da SOS Motors / RentCar</strong>.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>A transferência total e definitiva do veículo para o cliente ocorre <strong className="text-amber-500">apenas após o pagamento integral da 10ª prestação</strong>.</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">06</div>
                <h4 className="text-white font-black uppercase tracking-wider">Contrato de Consórcio</h4>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 p-5 rounded-2xl ml-11 space-y-3">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Força Executiva</span>
                </div>
                <ul className="text-white text-sm space-y-3">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Antes do início do ciclo, <strong className="text-white">todos os 10 participantes assinam um contrato legal</strong> com força executiva.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>Caso um cliente sorteado <strong className="text-white">deixe de cumprir os pagamentos</strong>, a SOS Motors / RentCar reserva-se o direito de <strong className="text-red-400">confiscar e retomar a viatura de forma imediata</strong>.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>O contrato permite a retomada <strong className="text-white">sem necessidade de processo judicial prolongado</strong>, garantindo protecção legal para todos os membros do grupo.</span>
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-500 font-black">07</div>
                <h4 className="text-white font-black uppercase tracking-wider">Garantias Obrigatórias</h4>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl ml-11 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fiador ou Cheque Visado</span>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  Para levantar a viatura após ser contemplado no sorteio, o cliente deve obrigatoriamente apresentar <strong className="text-white">uma das seguintes garantias</strong>:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="bg-zinc-950 border border-emerald-500/10 rounded-xl p-4 text-center space-y-2">
                    <div className="text-emerald-400 text-2xl">👤</div>
                    <h5 className="text-white font-black text-xs uppercase tracking-wider">Fiador (Garante)</h5>
                    <p className="text-white text-[11px] leading-snug">Pessoa com rendimentos comprovados que se responsabiliza solidariamente pelo cumprimento das prestações.</p>
                  </div>
                  <div className="bg-zinc-950 border border-emerald-500/10 rounded-xl p-4 text-center space-y-2">
                    <div className="text-emerald-400 text-2xl">🏦</div>
                    <h5 className="text-white font-black text-xs uppercase tracking-wider">Garantia Financeira</h5>
                    <p className="text-white text-[11px] leading-snug">Cheque visado ou depósito caução como garantia financeira para assegurar o cumprimento das obrigações.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="pt-4 pb-8 text-center">
            <button 
              onClick={onClose}
              className="px-12 py-4 bg-amber-500 text-zinc-950 font-black uppercase text-sm tracking-widest rounded-2xl hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10 active:scale-95"
            >
              Compreendi o Regulamento
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
