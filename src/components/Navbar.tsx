import { useState } from "react";
import { NAV_LINKS } from "../data/constants";
import { useScrollTo } from "../hooks";

interface NavbarProps {
  scrolled: boolean;
  onShowSimulator?: () => void;
  onOpenAdmin?: () => void;
}

export default function Navbar({ scrolled: _scrolled, onShowSimulator, onOpenAdmin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollTo = useScrollTo();

  const handleNav = (id: string) => {
    if (id === "simulador") onShowSimulator?.();
    scrollTo(id);
    setMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 ${_scrolled
        ? "bg-zinc-950/90 backdrop-blur-xl border-zinc-800"
        : "bg-zinc-950 border-zinc-900"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h11l5 5v3a2 2 0 01-2 2h-1M14 17a2 2 0 11-4 0 2 2 0 014 0zM8 17a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span
            className="font-black text-white tracking-tight"
            style={{ fontFamily: "'Archivo', sans-serif", fontSize: "1.25rem" }}
          >
            Rent<span className="text-amber-500">Car</span>
          </span>
        </div>

        {/* Links desktop */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(([id, label]) => (
            <li key={id}>
              <button
                onClick={() => handleNav(id)}
                className="text-zinc-200 hover:text-white text-sm font-bold transition-colors tracking-wide"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-2">

          {/* Pesquisa */}
          <button
            aria-label="Pesquisar"
            className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-200 hover:text-white hover:bg-zinc-800 transition-all duration-200"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </button>

          {/* Login — abre painel de gestão */}
          <button
            aria-label="Entrar"
            onClick={() => onOpenAdmin?.()}
            className="w-9 h-9 flex items-center justify-center rounded-full text-zinc-200 hover:text-white hover:bg-zinc-800 transition-all duration-200"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-zinc-800 mx-1" />

          {/* CTA */}
          <button
            onClick={() => handleNav("simulador")}
            className="px-5 py-2 text-sm font-semibold rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all duration-200 hover:scale-105 active:scale-95"
          >
            Simular agora
          </button>
        </div>

        {/* Hamburger mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-zinc-200 hover:text-white"
          aria-label="Menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => handleNav(id)}
              className="text-zinc-300 hover:text-amber-500 text-left text-base font-bold transition-colors"
            >
              {label}
            </button>
          ))}

          {/* Pesquisa + Login mobile */}
          <div className="flex gap-3 pt-1">
            <button className="flex items-center gap-2 text-zinc-200 hover:text-white text-sm font-medium transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              Pesquisar
            </button>
            <button
              onClick={() => { onOpenAdmin?.(); setMenuOpen(false); }}
              className="flex items-center gap-2 text-zinc-200 hover:text-white text-sm font-medium transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Entrar
            </button>
          </div>

          <button
            onClick={() => handleNav("simulador")}
            className="mt-1 px-5 py-2.5 text-sm font-semibold rounded-full bg-amber-500 text-zinc-950 w-full"
          >
            Simular Agora
          </button>
        </div>
      )}
    </nav>
  );
}

