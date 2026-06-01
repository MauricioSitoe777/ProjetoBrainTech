import { useState, useEffect, useRef } from 'react';

interface NominatimResult {
  place_id: number;
  display_name: string;
  type: string;
  class: string;
}

interface AddressSearchProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

export function AddressSearch({ label, value, onChange, placeholder }: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    // Cancela pedido anterior
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=mz&format=json&limit=8&addressdetails=0`,
      {
        headers: { 'Accept-Language': 'pt-PT,pt;q=0.9' },
        signal: abortRef.current.signal,
      }
    )
      .then(r => r.json())
      .then((data: NominatimResult[]) => {
        setSuggestions(data);
        setOpen(data.length > 0);
        setLoading(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoading(false);
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 400);
  };

  const handleSelect = (s: NominatimResult) => {
    const parts = s.display_name.split(',');
    const formatted = parts.slice(0, 3).join(',').trim();
    setQuery(formatted);
    onChange(formatted);
    setSuggestions([]);
    setOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setSuggestions([]);
    setOpen(false);
    abortRef.current?.abort();
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-white text-sm font-medium block mb-2">{label}</label>
      <div className="flex items-center rounded-xl bg-zinc-950/40 border border-zinc-800 focus-within:border-zinc-600 transition-colors overflow-visible">
        {/* Pin icon */}
        <span className="pl-3 text-zinc-500 shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder ?? 'Pesquisar morada em Moçambique…'}
          className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
        />
        {loading && (
          <span className="px-3 shrink-0">
            <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        {!loading && query.length > 0 && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="px-3 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-[200] left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto">
          {suggestions.map((s) => {
            const parts = s.display_name.split(',');
            const main = parts[0]?.trim() ?? s.display_name;
            const sub = parts.slice(1, 4).join(',').trim();
            return (
              <li
                key={s.place_id}
                onMouseDown={() => handleSelect(s)}
                className="flex items-start gap-3 px-4 py-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/60 last:border-0 transition-colors"
              >
                <span className="text-amber-500 mt-0.5 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate">{main}</div>
                  {sub && <div className="text-xs text-zinc-400 truncate mt-0.5">{sub}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
