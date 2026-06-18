import { useEffect, useState } from "react";
import { CalendarDays, Fuel, IdCard, UsersRound } from "lucide-react";
import { useVehicles, type VehicleData } from "../context/VehiclesContext";
import { useScrollTo } from "../hooks";
import Navbar from "./Navbar";
import Footer from "./Footer";

type SimulatorFlow = "aluguer" | "compra";

interface VehicleDetailsPageProps {
  vehicleId: string | number;
  onExit: () => void;
  onOpenFlowModal?: (lockedFlow?: SimulatorFlow) => void;
  onShowSimulator?: () => void;
  onOpenAdmin?: () => void;
}

export default function VehicleDetailsPage({
  vehicleId,
  onExit,
  onOpenFlowModal,
  onShowSimulator,
  onOpenAdmin,
}: VehicleDetailsPageProps) {
  const { vehicles } = useVehicles();
  const scrollTo = useScrollTo();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [currentImg, setCurrentImg] = useState(0);

  useEffect(() => {
    const v = vehicles.find((item) => String(item.id) === String(vehicleId));
    if (v) {
      setVehicle(v);
    }
  }, [vehicleId, vehicles]);

  if (!vehicle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="mb-4 text-xl">Veículo não encontrado.</p>
          <button
            onClick={onExit}
            className="rounded-full bg-amber-500 px-6 py-2 font-bold text-zinc-950"
          >
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    );
  }

  const allImages = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [vehicle.img];

  const handleAction = () => {
    const mt = Number(String(vehicle.price).replace(/[^\d]/g, "")) || 0;
    const payload = {
      id: vehicle.id,
      mode: vehicle.mode as "aluguer" | "compra",
      dailyRate: vehicle.mode === "aluguer" ? mt : undefined,
      vehiclePrice: vehicle.mode === "compra" ? mt : undefined,
    };

    try {
      sessionStorage.setItem("rentcar:selectedVehicle:v1", JSON.stringify(payload));
    } catch {
      // ignore
    }

    if (onOpenFlowModal) {
      onOpenFlowModal(vehicle.mode === "aluguer" ? "aluguer" : undefined);
      return;
    }

    onShowSimulator?.();
    onExit();
    setTimeout(() => scrollTo("simulador"), 100);
  };

  const suggestedPrice = Number(String(vehicle.price).replace(/[^\d]/g, "")) || 0;
  const estimatedTotal = Math.round(suggestedPrice * 1.1)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white antialiased">
      <Navbar scrolled={true} onOpenAdmin={onOpenAdmin ?? (() => {})} onShowSimulator={onShowSimulator} />

      <main className="mx-auto max-w-7xl px-6 pb-20 pt-32">
        <button
          onClick={onExit}
          className="group mb-8 flex w-fit items-center gap-3 rounded-full border border-zinc-800/80 bg-zinc-900/50 py-2 pl-2 pr-5 text-zinc-300 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:bg-zinc-800/80 hover:text-white hover:shadow-amber-500/5 active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 transition-all duration-300 group-hover:bg-amber-500 group-hover:text-zinc-950">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="transition-transform duration-300 group-hover:-translate-x-0.5"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.15em]">Voltar ao Catálogo</span>
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] lg:items-start xl:gap-10">
          <div className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-2xl">
              <img
                src={allImages[currentImg]}
                alt={vehicle.name}
                className="h-full w-full object-cover transition-all duration-500"
              />

              <div className="absolute left-6 top-6 flex flex-col gap-3">
                <div className="rounded-full bg-amber-500 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-zinc-950 shadow-xl">
                  {vehicle.mode}
                </div>
                <div className="rounded-full border border-zinc-700/50 bg-zinc-950/80 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                  3RD PARTY seller
                </div>
              </div>

              <div className="absolute bottom-6 left-6 rounded-lg border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-md">
                {currentImg + 1} / {allImages.length}
              </div>

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-amber-500 hover:text-zinc-950"
                    aria-label="Imagem anterior"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImg((i) => (i + 1) % allImages.length)}
                    className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white backdrop-blur-md transition-all hover:bg-amber-500 hover:text-zinc-950"
                    aria-label="Próxima imagem"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.map((img, idx) => (
                  <button
                    key={img}
                    onClick={() => setCurrentImg(idx)}
                    className={`relative aspect-video overflow-hidden rounded-xl border-2 transition-all ${
                      idx === currentImg ? "scale-95 border-amber-500" : "border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Ver imagem ${idx + 1}`}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex h-full flex-col">
            <div className="mb-4">
              <div className="mb-2.5 flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-500">
                  {vehicle.brand}
                </span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <h1 className="mb-4 text-[28px] font-black leading-none tracking-tight text-white md:text-[34px]">
                {vehicle.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em]">
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-white shadow-lg shadow-black/10">
                  <CalendarDays size={12} className="text-amber-500" strokeWidth={2.4} />
                  <span>{vehicle.year}</span>
                </div>
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-white shadow-lg shadow-black/10">
                  <Fuel size={12} className="text-amber-500" strokeWidth={2.4} />
                  <span>{vehicle.fuel}</span>
                </div>
                <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-white shadow-lg shadow-black/10">
                  <UsersRound size={12} className="text-amber-500" strokeWidth={2.4} />
                  <span>{vehicle.seats} Lugares</span>
                </div>
                {vehicle.matricula && (
                  <div className="flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-zinc-900 px-2.5 text-white shadow-lg shadow-black/10">
                    <IdCard size={12} className="text-amber-500" strokeWidth={2.4} />
                    <span className="text-[9px] text-zinc-300">Matrícula</span>
                    <span className="font-mono text-[10px] font-black tracking-[0.12em] text-amber-400">
                      {vehicle.matricula}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-3 flex flex-col rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4 shadow-xl shadow-black/20">
              <div className="flex flex-col gap-3.5">
                <div>
                  <p className="mb-1 text-[9px] font-black uppercase tracking-[0.17em] text-white">
                    Preço Sugerido
                  </p>
                  <div className="flex items-baseline gap-2">
                    <div className="text-[28px] font-black leading-none text-amber-500 md:text-[34px]">
                      {vehicle.price}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-green-500">
                    (Approx. {estimatedTotal} MT total com taxas)
                  </div>
                </div>

                {vehicle.mode === "compra" && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                      Garantia de 15 dias após a venda
                    </span>
                  </div>
                )}

                <div className="h-px bg-zinc-800/80" />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white">Preço Final</p>
                    <p className="mt-0.5 text-lg font-black text-white">Sob Consulta</p>
                  </div>
                  {Boolean(vehicle.discount && vehicle.discount > 0) && (
                    <div className="rounded-xl bg-red-500 px-4 py-2 text-xs font-black text-white shadow-lg shadow-red-500/20">
                      -{vehicle.discount}% OFF
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-zinc-800/80 pt-4 text-white">
                <p className="mb-2.5 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-white">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  Descrição do Veículo
                </p>
                <p className="max-w-[56ch] text-[13px] leading-6 text-zinc-300">
                  {vehicle.description || "Nenhuma descrição detalhada disponível para este veículo no momento."}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-row gap-3">
              <button
                onClick={handleAction}
                disabled={vehicle.mode === "aluguer" && vehicle.available === false}
                className={`flex-1 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest shadow-xl transition-all ${
                  vehicle.mode === "aluguer" && vehicle.available === false
                    ? "cursor-not-allowed border border-zinc-700 bg-zinc-800 text-white"
                    : "bg-amber-500 text-zinc-950 shadow-amber-500/20 hover:scale-[1.01] hover:bg-amber-400 active:scale-[0.99]"
                }`}
              >
                {vehicle.mode === "aluguer" ? (vehicle.available === false ? "Indisponível" : "Reservar Agora") : "Comprar"}
              </button>

              <a
                href={`https://wa.me/258877744283?text=${encodeURIComponent(`Olá! Tenho interesse na viatura *${vehicle.name}*. Podem dar-me mais informações?`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 shadow-lg shadow-[#25D366]/20 transition-all hover:bg-[#20bc5a] active:scale-[0.98]"
              >
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-xs font-black uppercase tracking-widest text-white">Chat - WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
