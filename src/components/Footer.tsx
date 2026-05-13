const SERVICES = [
  "Aluguer de Viaturas",
  "Venda de Veículos",
  "Financiamento",
  "Frota Empresarial",
] as const;

const CONTACTS = [
  "Maputo · Av. Julius Nyerere",
  "+258 84 000 0000",
  "info@rentcar.co.mz",
] as const;

const PAYMENT_BADGES = ["M-Pesa", "e-Mola"] as const;

/**
 * Site footer with brand blurb, service links, contact details
 * and payment method badges.
 */
export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-12">
      <div className="max-w-7xl mx-auto px-6">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M5 17H3a2 2 0 01-2-2V9a2 2 0 012-2h11l5 5v3a2 2 0 01-2 2h-1M14 17a2 2 0 11-4 0 2 2 0 014 0zM8 17a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span
                className="font-black text-white text-xl"
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                Rent<span className="text-amber-500">Car</span>
              </span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">
              Ecossistema híbrido de gestão automóvel em Moçambique.
              Aluguer, venda e financiamento digital.
            </p>
          </div>

          {/* Services */}
          <div>
            <div className="text-white font-semibold text-sm mb-4">Serviços</div>
            {SERVICES.map((s) => (
              <div
                key={s}
                className="text-zinc-500 text-sm mb-2 hover:text-zinc-300 cursor-pointer transition-colors"
              >
                {s}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div className="text-white font-semibold text-sm mb-4">Contacto</div>
            {CONTACTS.map((c) => (
              <div key={c} className="text-zinc-500 text-sm mb-2">{c}</div>
            ))}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-900 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-zinc-600 text-xs">
            © 2026 RentCar &amp; Vendas Moçambique. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-3">
            {PAYMENT_BADGES.map((p) => (
              <span
                key={p}
                className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-medium"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
