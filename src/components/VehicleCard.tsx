import { useState } from "react";
import type { Vehicle } from "../data/constants";
import { useRoute } from "../hooks/useRoute";

interface VehicleCardProps {
  vehicle: Vehicle;
  onAction?: (vehicle: Vehicle) => void;
}

export default function VehicleCard({ vehicle }: VehicleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { navigate } = useRoute();

  const isUnavailable = (vehicle as any).available === false;
  const motivo = (vehicle as any).motivoIndisponibilidade as string | undefined;
  const dataDisp = (vehicle as any).dataDisponibilidade as string | undefined;

  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${d} ${months[m - 1]} ${y}`;
  };

  const handleNavigate = () => {
    sessionStorage.setItem("rentcar:returnScroll", String(window.scrollY));
    navigate(`/veiculo/${vehicle.id}`);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative rounded-3xl overflow-hidden bg-zinc-900 border transition-all duration-500 ${
        isUnavailable
          ? "border-red-500/30 opacity-75"
          : hovered
            ? "border-amber-500/60 shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_24px_rgba(228,180,46,0.15)] -translate-y-2"
            : "border-zinc-800 shadow-xl"
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-52">
        {!imgFailed ? (
          <img
            src={vehicle.img}
            alt={vehicle.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className={`w-full h-full object-cover transition-transform duration-700 ease-out ${hovered ? "scale-105" : "scale-100"}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl filter grayscale opacity-40">🚗</div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Imagem Indisponível</span>
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />

        {/* Indisponível overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-zinc-950/70 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] px-4">
            <div className="bg-red-500/90 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
              Indisponível
            </div>
            {motivo && (
              <p className="text-white/90 text-[11px] font-medium text-center leading-tight">
                {motivo}
              </p>
            )}
            {dataDisp && (
              <div className="flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg px-2.5 py-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400 shrink-0">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-amber-400 text-[10px] font-bold">Disponível a partir de {formatDate(dataDisp)}</span>
              </div>
            )}
          </div>
        )}

        {/* Mode badge */}
        <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${
          vehicle.mode === "aluguer" ? "bg-blue-600 text-white" : "bg-amber-500 text-zinc-950"
        }`}>
          {vehicle.mode}
        </div>

        {/* Left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <div className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-zinc-950/80 text-zinc-300 border border-zinc-700/50 backdrop-blur-md uppercase tracking-widest">
            {vehicle.cat}
          </div>
          {vehicle.mode === "compra" && (
            <div className="px-2.5 py-1 rounded-full text-[9px] font-black bg-emerald-600 text-white border border-emerald-400/30 shadow-lg uppercase tracking-widest">
              Garantia 15 Dias
            </div>
          )}
          {vehicle.discount && vehicle.discount > 0 && (
            <div className="px-2.5 py-1 rounded-full text-[9px] font-black bg-red-600 text-white border border-red-400/30 shadow-lg animate-pulse uppercase tracking-widest">
              -{vehicle.discount}% OFF
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col gap-3">
        {/* Name + brand */}
        <div>
          <h3 className="text-white font-black text-base leading-snug tracking-tight group-hover:text-amber-400 transition-colors duration-300 line-clamp-2">
            {vehicle.name}
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
            {vehicle.brand}
          </p>
        </div>

        {/* Price */}
        <div className="text-amber-400 font-black text-xl leading-none">
          {vehicle.price}
        </div>

        {/* CTA button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate();
          }}
          className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all duration-200 ${
            isUnavailable
              ? "bg-red-500/20 text-white border border-red-500/40"
              : "bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-[0.97] shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30"
          }`}
        >
          {isUnavailable ? "Temporariamente Indisponível" : "Ver Detalhe"}
        </button>
      </div>
    </div>
  );
}
