import { BrandLogo } from "./BrandLogo";

const SERVICES = [
  "Aluguer de Viaturas",
  "Venda de Veículos",
  "Aluguer para Empresas",
] as const;

const CONTACTS = [
  "Maputo · Av. 25 de Setembro",
  "+258 86 884 4283",
  "info@rentcar.co.mz",
] as const;

/**
 * Site footer with brand blurb, service links and contact details.
 */
export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 py-10">
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
            {SERVICES.map((s) => (
              <div
                key={s}
                className="text-white text-sm mb-2 hover:text-white cursor-pointer transition-colors"
              >
                {s}
              </div>
            ))}
          </div>

          {/* Contact */}
          <div>
            <div className="text-white font-semibold text-sm mb-4">Contacto</div>
            {CONTACTS.map((c) => (
              <div key={c} className="text-white text-sm mb-2">{c}</div>
            ))}
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-900 pt-6">
          <p className="text-white text-xs">
            © 2026 RentCar &amp; Vendas Moçambique. Todos os direitos reservados.
          </p>
        </div>

      </div>
    </footer>
  );
}
