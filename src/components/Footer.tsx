import { BrandLogo } from "./BrandLogo";
import { useRoute } from "../hooks/useRoute";
import { useScrollTo } from "../hooks";

const SERVICES: { label: string; section: string }[] = [
  { label: "Aluguer de Viaturas",  section: "catalogo" },
  { label: "Venda de Veículos",    section: "catalogo" },
  { label: "Como Funciona",        section: "como-funciona" },
  { label: "Xitique",              section: "xitique" },
  { label: "Simulador",            section: "simulador" },
];

const CONTACTS = [
  "Maputo · Av. 25 de Setembro",
  "+258 86 884 4283",
  "info@rentcar.co.mz",
] as const;

/* ── Ícones de redes sociais (SVG paths do Simple Icons — simpleicons.org) ── */
const SOCIALS = [
  {
    label: "WhatsApp",
    href: "https://wa.me/258868844283",
    color: "#25D366",
    textColor: "text-[#25D366]",
    bgColor: "bg-[#25D366]/15",
    borderColor: "border-[#25D366]/35",
    glowColor: "rgba(37,211,102,0.25)",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/sos_motors_mz?igsh=MXN3OTcxOGhjbHlmcA==",
    color: "#E1306C",
    textColor: "text-[#E1306C]",
    bgColor: "bg-[#E1306C]/15",
    borderColor: "border-[#E1306C]/35",
    glowColor: "rgba(225,48,108,0.25)",
    path: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 3.252.148 4.771 1.691 4.919 4.919.049 1.265.064 1.645.064 4.849 0 3.205-.015 3.585-.074 4.85-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.072-4.85.072-3.204 0-3.584-.014-4.849-.072-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.072-1.644-.072-4.849 0-3.204.013-3.583.072-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.071 4.849-.071zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@sosmortors",
    color: "#ffffff",
    textColor: "text-white",
    bgColor: "bg-white/12",
    borderColor: "border-white/30",
    glowColor: "rgba(255,255,255,0.15)",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
] as const;

export default function Footer() {
  const { path, navigate } = useRoute();
  const scrollTo = useScrollTo();

  const handleService = (section: string) => {
    if (section === "xitique") {
      navigate("/xitique");
      return;
    }
    if (path !== "/") {
      navigate("/");
      setTimeout(() => scrollTo(section), 100);
    } else {
      scrollTo(section);
    }
  };

  return (
    <footer className="bg-zinc-900 border-t border-zinc-800 py-10">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <BrandLogo className="h-14 w-auto max-w-[200px]" />
            </div>
            <p className="text-white text-sm leading-relaxed max-w-sm">
              Ecossistema híbrido de gestão automóvel em Moçambique.
              Aluguer, venda e financiamento digital.
            </p>
          </div>

          {/* Services */}
          <div>
            <div className="text-white font-semibold text-sm mb-4">Serviços</div>
            {SERVICES.map(({ label, section }) => (
              <button
                key={label}
                onClick={() => handleService(section)}
                className="block text-white hover:text-amber-400 text-sm mb-2.5 transition-colors text-left"
              >
                {label}
              </button>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div className="text-white font-semibold text-sm mb-4">Contacto</div>
            {CONTACTS.map((c) => (
              <div key={c} className="text-white text-sm mb-2">{c}</div>
            ))}

            {/* Redes sociais */}
            <div className="mt-4 flex items-center gap-2.5 flex-wrap">
              <p className="text-amber-400 text-xs font-semibold">Siga-nos:</p>
              {SOCIALS.map(({ label, href, textColor, bgColor, borderColor, glowColor, path }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl border ${bgColor} ${borderColor} ${textColor} transition-all duration-200 hover:scale-110 active:scale-95`}
                  style={{ boxShadow: `0 0 12px ${glowColor}` }}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800 pt-6 flex items-center justify-between gap-4">
          <p className="text-white text-xs">
            © 2026 SOS Motors e Vendas Moçambique. Todos os direitos reservados.
          </p>
          <img src="/braintech-logo.png" alt="Braintech" className="h-10 w-auto shrink-0 opacity-80 hover:opacity-100 transition-opacity" />
        </div>

      </div>
    </footer>
  );
}
