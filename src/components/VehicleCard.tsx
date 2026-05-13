import { useState } from "react";
import type { Vehicle } from "../data/constants";

interface VehicleCardProps {
  vehicle: Vehicle;
  onAction?: (vehicle: Vehicle) => void;
}

/**
 * Individual vehicle card with hover animations.
 * Used inside CatalogSection's grid.
 */
export default function VehicleCard({ vehicle, onAction }: VehicleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative rounded-2xl overflow-hidden bg-zinc-900 border transition-all duration-300 cursor-pointer ${
        hovered
          ? "border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)] -translate-y-1"
          : "border-zinc-800"
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-48">
        {!imgFailed ? (
          <div className="relative w-full h-full bg-zinc-800 animate-pulse">
            <img
              src={vehicle.img}
              alt={vehicle.name}
              loading="lazy"
              onLoad={(e) => (e.currentTarget.parentElement!.classList.remove('animate-pulse'))}
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover transition-all duration-700 ${
                hovered ? "scale-110" : "scale-100"
              }`}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl filter grayscale opacity-50">🚗</div>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">Imagem Indisponível</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

        {/* Mode badge */}
        <div
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            vehicle.mode === "aluguer"
              ? "bg-blue-500/90 text-white"
              : "bg-amber-500/90 text-zinc-950"
          }`}
        >
          {vehicle.mode}
        </div>

        {/* Category badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-950/70 text-zinc-300 border border-zinc-700/50">
          {vehicle.cat}
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-base">{vehicle.name}</h3>
            <p className="text-zinc-500 text-xs mt-0.5">
              {vehicle.year} · {vehicle.fuel} · {vehicle.seats} lugares
            </p>
          </div>
          <div className="text-right">
            <div className="text-amber-400 font-black text-sm leading-tight">
              {vehicle.price}
            </div>
          </div>
        </div>

        <button
          onClick={() => onAction?.(vehicle)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-zinc-700 text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 transition-all duration-200"
        >
          {vehicle.mode === "aluguer" ? "Reservar Agora" : "Ver Detalhes"}
        </button>
      </div>
    </div>
  );
}
