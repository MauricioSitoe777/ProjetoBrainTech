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
    <div ref={containerRef} className="relative w-full overflow-hidden">
      <label 
        className="text-white text-sm font-bold block mb-2 truncate w-full" 
        title={label}
      >
        {label}
      </label>
      <div className="flex items-center rounded-xl bg-zinc-950 border border-zinc-700 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500/20 transition-all overflow-hidden shadow-inner">
        {/* Pin icon */}
        <span className="pl-4 text-amber-500 shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
          className="flex-1 bg-transparent px-3 py-3.5 text-sm text-white font-bold placeholder:text-zinc-600 outline-none"
        />
        {loading && (
          <span className="px-4 shrink-0">
            <div className="w-5 h-5 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </span>
        )}
        {!loading && query.length > 0 && (
          <button
            type="button"
            onMouseDown={handleClear}
            className="px-4 text-zinc-400 hover:text-white transition-colors shrink-0"
            tabIndex={-1}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-[200] left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl max-h-72 overflow-y-auto divide-y divide-zinc-800">
          {suggestions.map((s) => {
            const parts = s.display_name.split(',');
            const main = parts[0]?.trim() ?? s.display_name;
            const sub = parts.slice(1, 4).join(',').trim();
            return (
              <li
                key={s.place_id}
                onMouseDown={() => handleSelect(s)}
                className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <span className="text-amber-500 mt-1 shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-white font-black truncate">{main}</div>
                  {sub && <div className="text-[11px] text-zinc-300 truncate mt-1 font-medium">{sub}</div>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
