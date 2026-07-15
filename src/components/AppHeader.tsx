import { useState, useEffect } from "react";
import { NAV_LINKS } from "../data/constants";
import { useScrollTo, useScrolled } from "../hooks";
import { useRoute } from "../hooks/useRoute";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "./BrandLogo";
import { NotificationBell } from "./NotificationBell";

function getInitials(nome: string) {
  return nome.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join("").toUpperCase();
}

interface AppHeaderProps {
  onToggleSidebar?: () => void;
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { user, allUsers, logout } = useAuth();
  const { path, navigate } = useRoute();
  const scrollTo   = useScrollTo();
  const scrolled   = useScrolled(40);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  
  useEffect(() => {
    if (path !== "/") {
      setActiveSection(path.substring(1)); // e.g., 'xitique'
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const best = visibleEntries.reduce((prev, current) => 
            (prev.intersectionRatio > current.intersectionRatio) ? prev : current
          );
          setActiveSection(best.target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    const sections = ["hero", "catalogo", "como-funciona", "pagamentos"];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [path]);

  const isAdmin  = user?.role === "admin";
  const isClient = user?.role === "cliente";

  const fullUser = user ? allUsers.find(u => u.id === user.id) : null;
  const initials  = user ? getInitials(user.nome) : "";

  /* ── Handlers ────────────────────────────────────────────────────── */
  const handleNav = (id: string) => {
    setMenuOpen(false);
    if (id === "sobre") {
      window.dispatchEvent(new CustomEvent("rentcar:open-about"));
      return;
    }
    if (id === "xitique") {
      navigate("/xitique");
      return;
    }
    if (path !== "/") {
      navigate("/");
      setTimeout(() => scrollTo(id), 100);
    } else {
      scrollTo(id);
    }
  };

  const handleSimular = () => {
    setMenuOpen(false);
    try {
      sessionStorage.removeItem("rentcar:selectedVehicle:v1");
      localStorage.removeItem("rentcar:selectedVehicle:v1");
    } catch { /* ignore */ }
    if (path !== "/") {
      navigate("/");
      setTimeout(() => window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal")), 150);
    } else {
      window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal"));
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/");
  };

  /* ── Avatar element ───────────────────────────────────────────────── */
  const Avatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
    const cls = size === "sm" ? "w-8 h-8 text-[10px]" : "w-9 h-9 text-[11px]";
    return fullUser?.avatar ? (
      <img src={fullUser.avatar} alt={user!.nome}
        className={`${cls} rounded-full object-cover border-2 border-amber-500/40`} />
    ) : (
      <span className={`${cls} rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 font-black flex items-center justify-center shrink-0`}>
        {initials}
      </span>
    );
  };

  /* ── Header background ────────────────────────────────────────────── */
  let bgClass = "bg-transparent border-transparent";
  
  if (activeSection === "hero" || (!activeSection && !scrolled)) {
    bgClass = "bg-transparent border-transparent";
  } else if (activeSection === "como-funciona") {
    bgClass = "bg-zinc-900 border-zinc-800";
  } else {
    bgClass = "bg-zinc-950 border-zinc-900";
  }

  const headerCls = `fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-500 ${bgClass}`;

  /* ══════════════════════════════════════════════════════════════════
     RIGHT SIDE — Desktop
  ══════════════════════════════════════════════════════════════════ */
  const RightDesktop = () => {
    /* ── NOT LOGGED IN ── */
    if (!user) {
      return (
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-base font-semibold text-white border border-zinc-700 hover:border-zinc-500 hover:text-white transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Entrar
          </button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button
            onClick={handleSimular}
            className="px-5 py-2 text-base font-semibold rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all hover:scale-105 active:scale-95"
          >
            Simular agora
          </button>
        </div>
      );
    }

    /* ── CLIENT LOGGED IN ── */
    if (isClient) {
      return (
        <div className="hidden md:flex items-center gap-2">
          <NotificationBell />
          <div className="w-px h-4 bg-zinc-800" />
          {/* Profile */}
          <button
            onClick={() => navigate("/admin")}
            title={user.nome}
            className="hover:ring-2 hover:ring-amber-500/40 rounded-full transition-all"
          >
            <Avatar />
          </button>
          <span className="text-sm text-white font-medium hidden lg:block max-w-[120px] truncate">
            {user.nome.split(" ")[0]}
          </span>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-base font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair
          </button>
          <div className="w-px h-5 bg-zinc-800 mx-1" />
          <button
            onClick={handleSimular}
            className="px-5 py-2 text-base font-semibold rounded-full bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-all hover:scale-105 active:scale-95"
          >
            Simular agora
          </button>
        </div>
      );
    }

    /* ── ADMIN LOGGED IN ── */
    return (
      <div className="hidden md:flex items-center gap-2">
        {/* Role badge */}
        <span className="text-[11px] font-bold border rounded-md px-2 py-0.5 bg-amber-400/10 text-amber-400 border-amber-400/20 hidden lg:inline">
          Administrador
        </span>
        <div className="w-px h-4 bg-zinc-800" />
        <NotificationBell />
        <div className="w-px h-4 bg-zinc-800" />
        {/* Avatar */}
        <button
          onClick={() => navigate("/admin")}
          title={user.nome}
          className="hover:ring-2 hover:ring-amber-500/40 rounded-full transition-all"
        >
          <Avatar />
        </button>
        <div className="w-px h-4 bg-zinc-800" />
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair
        </button>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     MOBILE MENU
  ══════════════════════════════════════════════════════════════════ */
  const MobileMenu = () => (
    <div className="md:hidden bg-zinc-950 border-t border-zinc-800 px-5 py-4 flex flex-col gap-1">

      {/* Nav links (non-admin) */}
      {!isAdmin && (
        <>
          {NAV_LINKS.map(([id, label]) => (
            <button key={id} onClick={() => handleNav(id)}
              className={`text-left text-base font-bold py-2.5 transition-colors ${
                activeSection === id ? "text-amber-400" : "text-white hover:text-amber-400"
              }`}>
              {label}
            </button>
          ))}
          <div className="h-px bg-zinc-800 my-1" />
        </>
      )}

      {/* Admin nav links */}
      {isAdmin && (
        <>
          {[
            ["/admin/dashboard",    "Painel"],
            ["/admin/utilizadores", "Utilizadores"],
            ["/admin/aluguer",      "Aluguer"],
            ["/admin/compra",       "Compra"],
            ["/admin/veiculos",     "Veículos"],
            ["/admin/xitique",      "Xitique"],
            ["/admin/financas",     "Relatórios"],
            ["/admin/motoristas",   "Motoristas"],
          ].map(([href, label]) => (
            <button key={href}
              onClick={() => { navigate(href); setMenuOpen(false); }}
              className={`text-left text-base font-bold py-2.5 transition-colors ${
                path.startsWith(href) ? "text-amber-400" : "text-white hover:text-amber-400"
              }`}>
              {label}
            </button>
          ))}
          <div className="h-px bg-zinc-800 my-1" />
        </>
      )}

      {/* Auth block */}
      {user ? (
        <>
          <div className="flex items-center gap-3 py-2">
            <Avatar size="sm" />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold leading-tight truncate">{user.nome}</p>
              <p className="text-white text-[11px]">{isAdmin ? "Administrador" : "Cliente"}</p>
            </div>
          </div>
          {isClient && (
            <button onClick={() => { navigate("/admin"); setMenuOpen(false); }}
              className="text-left text-sm font-medium py-2 text-white hover:text-white transition-colors">
              Minha Conta
            </button>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-left text-sm font-bold py-2 text-red-400 hover:text-red-300 transition-colors mt-1">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sair da conta
          </button>
        </>
      ) : (
        <>
          <button onClick={() => { navigate("/admin"); setMenuOpen(false); }}
            className="flex items-center gap-2 text-left text-sm font-bold py-2.5 text-white hover:text-amber-400 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            Entrar
          </button>
        </>
      )}

      {/* Simular CTA */}
      {!isAdmin && (
        <button onClick={handleSimular}
          className="mt-3 px-5 py-3 text-base font-bold rounded-full bg-amber-500 text-zinc-950 w-full hover:bg-amber-400 active:scale-95 transition-all">
          Simular agora
        </button>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <nav className={headerCls}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* LEFT: admin mobile hamburger (sidebar) + logo */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-700 hover:border-zinc-500 text-white hover:text-white transition-colors"
              aria-label="Abrir menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6"  x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          )}
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            <BrandLogo className="h-12 w-auto max-w-[155px] sm:max-w-[190px]" />
          </div>
        </div>

        {/* CENTER: nav links desktop (non-admin) */}
        {!isAdmin && (
          <ul className="hidden md:flex items-center gap-7 flex-1 justify-center">
            {NAV_LINKS.map(([id, label]) => (
              <li key={id}>
                <button
                  onClick={() => handleNav(id)}
                  className={`text-base font-bold transition-colors tracking-wide ${
                    activeSection === id ? "text-amber-500" : "text-white hover:text-amber-500"
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* If admin, spacer so right side aligns */}
        {isAdmin && <div className="flex-1" />}

        {/* RIGHT: desktop actions */}
        <RightDesktop />

        {/* Mobile toggle (escondido para admin — a sidebar já tem navegação) */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className={`${isAdmin ? 'hidden' : 'md:hidden'} text-white ml-2`}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen
              ? <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
              : <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
            }
          </svg>
        </button>
      </div>

      {menuOpen && <MobileMenu />}
    </nav>
  );
}
