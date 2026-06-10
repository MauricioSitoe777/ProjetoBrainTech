import { useState } from "react";
import { NAV_LINKS } from "../data/constants";
import { useScrollTo } from "../hooks";
import { useRoute } from "../hooks/useRoute";
import { useVehicles } from "../context/VehiclesContext";
import { BrandLogo } from "./BrandLogo";

interface NavbarProps {
  scrolled: boolean;
  onShowSimulator?: () => void;
  onOpenAdmin?: () => void;
}

export default function Navbar({ scrolled: _scrolled, onShowSimulator, onOpenAdmin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const scrollTo = useScrollTo();
  const { path, navigate } = useRoute();
  const { searchTerm, setSearchTerm } = useVehicles();

  const handleNav = (id: string) => {
    setMenuOpen(false);

    if (path !== "/") {
      navigate("/");
      // Aguarda a navegação e renderização da landing page antes de fazer scroll
      setTimeout(() => {
        if (id === "simulador") onShowSimulator?.();
        scrollTo(id);
      }, 100);
    } else {
      if (id === "simulador") onShowSimulator?.();
      scrollTo(id);
    }
  };

  const handleSearchClick = () => {
    setShowSearchInput(!showSearchInput);
    if (!showSearchInput) {
      // If we are on details page and start searching, go back to catalog
      if (path !== "/") {
        navigate("/");
        setTimeout(() => scrollTo("catalogo"), 100);
      } else {
        scrollTo("catalogo");
      }
    }
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
        <div 
          className="flex items-center cursor-pointer"
          onClick={() => navigate("/")}
          aria-label="Ir para a página inicial"
        >
          <BrandLogo className="h-12 w-auto max-w-[155px] sm:max-w-[190px]" />
        </div>

        {/* Links desktop */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(([id, label]) => (
            <li key={id}>
              <button
                onClick={() => handleNav(id)}
                className="text-white hover:text-amber-500 text-sm font-bold transition-colors tracking-wide"
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-2">

          {/* Pesquisa */}
          <div className={`flex items-center transition-all duration-500 overflow-hidden ${showSearchInput ? "max-w-xs bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1" : "max-w-0"}`}>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white placeholder:text-zinc-500 w-32"
              autoFocus={showSearchInput}
            />
          </div>
          <button
            aria-label="Pesquisar"
            onClick={handleSearchClick}
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ${showSearchInput ? "text-amber-500" : "text-white hover:text-white hover:bg-zinc-800"}`}
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
            className="w-9 h-9 flex items-center justify-center rounded-full text-white hover:text-white hover:bg-zinc-800 transition-all duration-200"
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
          className="md:hidden text-white hover:text-white"
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
              className="text-white hover:text-amber-500 text-left text-base font-bold transition-colors"
            >
              {label}
            </button>
          ))}

          {/* Pesquisa + Login mobile */}
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar veículos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-500 ml-3 flex-1"
              />
            </div>
            
            <button
              onClick={() => { onOpenAdmin?.(); setMenuOpen(false); }}
              className="flex items-center gap-3 px-4 py-2 text-white hover:text-white text-base font-bold transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Entrar no Painel
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
