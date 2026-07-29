import { useState } from 'react';
import type { Transacao, TipoTransacao, CategoriaTransacao, StatusTransacao } from '../../types/finance';
import { CATEGORIA_LABEL } from '../../context/FinanceContext';

interface TransacaoModalProps {
  tipo: TipoTransacao;
  transacao?: Transacao;
  onSave: (data: Omit<Transacao, 'id'>) => void;
  onClose: () => void;
}

const CATEGORIAS_ENTRADA: CategoriaTransacao[] = ['aluguer', 'compra_venda', 'xitique', 'outro'];
const CATEGORIAS_SAIDA: CategoriaTransacao[]   = ['manutencao', 'salario', 'combustivel', 'seguro', 'outro'];

export function TransacaoModal({ tipo, transacao, onSave, onClose }: TransacaoModalProps) {
  const categorias = tipo === 'entrada' ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;
  const [descricao, setDescricao] = useState(transacao?.descricao ?? '');
  const [categoria, setCategoria] = useState<CategoriaTransacao>(transacao?.categoria ?? categorias[0]);
  const [valor, setValor]         = useState(transacao ? String(transacao.valor) : '');
  const [data, setData]           = useState(transacao?.data ?? new Date().toISOString().split('T')[0]);
  const [status, setStatus]       = useState<StatusTransacao>(transacao?.status ?? 'pago');
  const [clienteNome, setClienteNome] = useState(transacao?.clienteNome ?? '');
  const [error, setError] = useState('');

  const inputClass = 'w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-colors';
  const isEntrada = tipo === 'entrada';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) { setError('Descrição é obrigatória'); return; }
    if (!valor.trim() || Number.isNaN(Number(valor)) || Number(valor) <= 0) { setError('Indique um valor válido'); return; }
    onSave({
      tipo, categoria, data, status,
      descricao: descricao.trim(),
      valor: Number(valor),
      ...(clienteNome.trim() ? { clienteNome: clienteNome.trim() } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl w-full max-w-md max-h-full overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className={`px-5 py-4 border-b border-zinc-800 flex items-center justify-between ${isEntrada ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
          <div>
            <h2 className="text-white font-black text-base">{transacao ? 'Editar' : 'Registar Nova'} {isEntrada ? 'Receita' : 'Despesa'}</h2>
            <p className="text-xs text-white mt-0.5">{isEntrada ? 'Regista uma entrada de dinheiro' : 'Regista uma saída de dinheiro'}</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-amber-400 transition-colors text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-white mb-1">Descrição *</label>
            <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Pagamento de aluguer — Toyota Corolla" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaTransacao)} className={inputClass}>
                {categorias.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Valor (MT) *</label>
              <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white mb-1">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-white mb-1">Estado</label>
              <select value={status} onChange={e => setStatus(e.target.value as StatusTransacao)} className={inputClass}>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white mb-1">Cliente / Fornecedor (opcional)</label>
            <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome" className={inputClass} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-black text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-colors ${
              isEntrada ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400' : 'bg-red-500 text-zinc-950 hover:bg-red-400'
            }`}>{transacao ? 'Guardar' : isEntrada ? 'Registar Receita' : 'Registar Despesa'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
