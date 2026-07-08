import { useState } from 'react';
import { useGuests } from '../context/GuestsContext';
import { useUsers } from '../context/UsersContext';
import { useNotifications } from '../context/NotificationsContext';
import type { Guest } from '../types/guest';

const DOC_LABELS: Record<string, string> = {
  bi: 'Bilhete de Identidade (BI)',
  nuit: 'NUIT',
  declaracao_rendimento: 'Declaração de Rendimento',
  contrato_trabalho: 'Contrato de Trabalho',
  declaracao_bairro: 'Declaração de Bairro',
  carta_conducao: 'Carta de Condução',
};

const STATUS_STYLE: Record<string, string> = {
  aguarda_documentos:    'text-zinc-400 bg-zinc-700/50 border-zinc-600',
  documentos_submetidos: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  em_analise:            'text-blue-400 bg-blue-400/10 border-blue-400/20',
  aprovado:              'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  rejeitado:             'text-red-400 bg-red-400/10 border-red-400/20',
};

const STATUS_LABEL: Record<string, string> = {
  aguarda_documentos:    'Aguarda Documentos',
  documentos_submetidos: 'Docs Submetidos',
  em_analise:            'Registrar',
  aprovado:              'Aprovado',
  rejeitado:             'Rejeitado',
};

const CATEGORY_LABEL: Record<string, string> = {
  func_publico: 'Funcionário Público',
  func_privado: 'Funcionário Privado',
  empreendedor: 'Empreendedor',
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface Props { guest: Guest; onClose: () => void; }

export function GuestReviewModal({ guest, onClose }: Props) {
  const { updateGuest, deleteGuest } = useGuests();
  const { addUser } = useUsers();
  const { addNotification } = useNotifications();
  const [action, setAction] = useState<'idle' | 'aprovar' | 'rejeitar'>('idle');
  const [senha, setSenha] = useState(generatePassword);
  const [motivo, setMotivo] = useState('');
  const [motivoError, setMotivoError] = useState(false);
  const [approved, setApproved] = useState(guest.status === 'aprovado');
  const [copied, setCopied] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>(guest.documentos ?? {});

  const isResolved = approved || guest.status === 'rejeitado';

  const handleAnalise = () => {
    updateGuest(guest.id, { status: 'em_analise' });
    addNotification('admin', 'Visitante registado', `${guest.nome} foi movido para "Registrar".`, 'info');
  };

  const handleAprovar = () => {
    addUser({
      nome: guest.nome,
      email: guest.email,
      telefone: guest.telefone,
      role: 'cliente',
      status: 'ativo',
      regularity: 'regular',
      restriction: 'nenhuma',
      password: senha,
      mustChangePassword: true,
      documentos: Object.fromEntries(Object.entries(guest.documentos)) as any,
    });
    deleteGuest(guest.id);
    addNotification('admin', 'Visitante aprovado', `${guest.nome} foi adicionado à lista de utilizadores como Cliente.`, 'success', undefined, '/admin/utilizadores/clientes');
    setApproved(true);
    setAction('idle');
    onClose();
  };

  const handleRejeitar = () => {
    if (!motivo.trim()) { setMotivoError(true); return; }
    updateGuest(guest.id, { status: 'rejeitado', notaAdmin: motivo.trim() });
    addNotification('admin', 'Visitante rejeitado', `${guest.nome} foi rejeitado. Motivo: ${motivo.trim()}`, 'alert', undefined, '/admin/visitantes/rejeitados');
    onClose();
  };

  const copy = (text: string, field: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const fallbackCopy = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-purple-400 font-black text-sm">
                {guest.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-black text-sm">{guest.nome}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLE[guest.status]}`}>
                {STATUS_LABEL[guest.status]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Info */}
          <div className="bg-zinc-800/50 rounded-xl p-4 space-y-2.5">
            <Row label="Email"    value={guest.email} />
            <Row label="Telefone" value={guest.telefone} />
            <Row label="Pedido"   value={guest.intent === 'aluguer' ? 'Aluguer' : 'Compra'} />
            {guest.category && <Row label="Categoria" value={CATEGORY_LABEL[guest.category]} />}
            {guest.vehicleName && <Row label="Viatura" value={guest.vehicleName} />}
            <Row label="Registado" value={new Date(guest.dataCriacao).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' })} />
          </div>

          {/* Documentos — registo pelo admin */}
          {!approved && guest.status !== 'rejeitado' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white uppercase font-bold tracking-wider">Documentos</p>
                <span className="text-[9px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">Registo pelo admin</span>
              </div>
              <div className="space-y-1.5">
                {Object.entries(DOC_LABELS).map(([key, label]) => {
                  const saved = docs[key];
                  return (
                    <div key={key} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-colors ${saved ? 'bg-emerald-500/8 border-emerald-500/25' : 'bg-zinc-800/50 border-zinc-700/50'}`}>
                      <div className="min-w-0">
                        <p className="text-xs text-white font-semibold">{label}</p>
                        {saved && <p className="text-[10px] text-emerald-400 truncate mt-0.5">{saved}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {saved && (
                          <button type="button" onClick={() => { const d = { ...docs }; delete d[key]; setDocs(d); updateGuest(guest.id, { documentos: { ...d } }); }}
                            className="text-[10px] text-red-400 hover:text-red-300 font-bold px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-all">
                            ✕
                          </button>
                        )}
                        <label className={`text-[10px] font-bold px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${saved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-white hover:bg-zinc-600'}`}>
                          {saved ? '✓ OK' : 'Registrar'}
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const next = { ...docs, [key]: file.name };
                                setDocs(next);
                                updateGuest(guest.id, { documentos: next, status: 'documentos_submetidos' });
                              }
                              e.target.value = '';
                            }} />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documentos — visualização após aprovação/rejeição */}
          {(approved || guest.status === 'rejeitado') && Object.keys(docs).length > 0 && (
            <div>
              <p className="text-[10px] text-white uppercase font-bold tracking-wider mb-2">Documentos registados</p>
              <div className="space-y-1.5">
                {Object.entries(docs).map(([key, fileName]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2 bg-zinc-800/60 rounded-lg">
                    <span className="text-xs text-white">{DOC_LABELS[key] ?? key}</span>
                    <span className="text-xs text-emerald-400 font-bold truncate ml-3 max-w-[150px]">{fileName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credenciais após aprovação */}
          {approved && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <p className="text-emerald-400 font-black text-sm">✓ Conta criada — partilhe com o cliente:</p>
              <CredRow label="Email"    value={guest.email}                   field="email" onCopy={copy} copied={copied} />
              <CredRow label="Palavra-passe" value={guest.senhaGerada ?? senha}    field="senha" onCopy={copy} copied={copied} />
            </div>
          )}

          {/* Motivo rejeição */}
          {guest.status === 'rejeitado' && guest.notaAdmin && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-red-400 text-xs font-bold mb-1">Motivo da rejeição</p>
              <p className="text-white text-sm">{guest.notaAdmin}</p>
            </div>
          )}

          {/* Acções */}
          {!isResolved && (
            <div className="space-y-2 pt-1">
              {guest.status !== 'em_analise' && action === 'idle' && (
                <button onClick={handleAnalise}
                  className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 font-bold rounded-lg py-2.5 text-sm transition-colors">
                  Registrar
                </button>
              )}

              {action !== 'rejeitar' && (
                <button onClick={() => setAction('aprovar')}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-lg py-2.5 text-sm transition-colors">
                  Aprovar e Criar Conta
                </button>
              )}

              {action !== 'aprovar' && (
                <button onClick={() => setAction('rejeitar')}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold rounded-lg py-2.5 text-sm transition-colors">
                  Rejeitar Pedido
                </button>
              )}

              {/* Form aprovação */}
              {action === 'aprovar' && (
                <div className="bg-zinc-800 rounded-xl p-3 space-y-2 border border-zinc-700">
                  <p className="text-white text-xs font-bold">Password gerada automaticamente:</p>
                  <div className="flex gap-2">
                    <input value={senha} onChange={e => setSenha(e.target.value)}
                      className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors" />
                    <button onClick={() => setSenha(generatePassword())}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-xs font-bold rounded-lg text-white transition-colors">
                      Nova
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setAction('idle')}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-xs font-bold transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleAprovar}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-lg py-2 text-xs transition-colors">
                      Confirmar Aprovação
                    </button>
                  </div>
                </div>
              )}

              {/* Form rejeição */}
              {action === 'rejeitar' && (
                <div className="bg-zinc-800 rounded-xl p-3 space-y-2 border border-zinc-700">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-xs font-bold">Motivo da rejeição</p>
                    <span className="text-[9px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded">Obrigatório</span>
                  </div>
                  <textarea value={motivo} onChange={e => { setMotivo(e.target.value); setMotivoError(false); }} rows={3}
                    placeholder="Ex: Documentos incompletos, BI expirado, declaração de rendimento em falta..."
                    className={`w-full bg-zinc-900 border text-white rounded-lg px-3 py-2 text-sm resize-none focus:outline-none transition-colors ${motivoError ? 'border-red-500 focus:border-red-400' : 'border-zinc-700 focus:border-red-500'}`} />
                  {motivoError && <p className="text-red-400 text-[10px] font-bold">Escreve o motivo antes de rejeitar.</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setAction('idle')}
                      className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg py-2 text-xs font-bold transition-colors">
                      Cancelar
                    </button>
                    <button onClick={handleRejeitar}
                      className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black rounded-lg py-2 text-xs transition-colors">
                      Confirmar Rejeição
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões pós-resolução */}
          {isResolved && (
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-bold transition-colors">
                Fechar
              </button>
              <button onClick={() => { deleteGuest(guest.id); onClose(); }}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-sm font-bold transition-colors">
                Remover
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-500 text-xs shrink-0">{label}</span>
      <span className="text-white text-sm font-semibold text-right truncate">{value}</span>
    </div>
  );
}

function CredRow({ label, value, field, onCopy, copied }: {
  label: string; value: string; field: string;
  onCopy: (v: string, f: string) => void; copied: string | null;
}) {
  return (
    <div className="flex items-center justify-between gap-2 bg-zinc-900 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase font-bold">{label}</p>
        <p className="text-white text-sm font-mono truncate">{value}</p>
      </div>
      <button onClick={() => onCopy(value, field)}
        className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
          copied === field ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-300 hover:text-white'
        }`}>
        {copied === field ? 'Copiado!' : 'Copiar'}
      </button>
    </div>
  );
}
