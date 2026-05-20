import { useState } from "react";
import type { Vehicle } from "../data/constants";

interface VehicleCardProps {
  vehicle: Vehicle;
  onAction?: (vehicle: Vehicle) => void;
}

/**
 * Individual vehicle card with hover animations and multi-image carousel.
 * Used inside CatalogSection's grid.
 */
export default function VehicleCard({ vehicle, onAction }: VehicleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [currentImg, setCurrentImg] = useState(0);

  // Use images array if available, otherwise fall back to single img
  const allImages = vehicle.images && vehicle.images.length > 0
    ? vehicle.images
    : [vehicle.img];

  const hasMultiple = allImages.length > 1;

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImg((i) => (i + 1) % allImages.length);
    setImgFailed(false);
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length);
    setImgFailed(false);
  };

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
              src={allImages[currentImg]}
              alt={`${vehicle.name} - imagem ${currentImg + 1}`}
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
              <span className="text-[10px] text-zinc-300 font-bold uppercase tracking-tighter">Imagem Indisponível</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

        {/* Carousel arrows (only when multiple images) */}
        {hasMultiple && hovered && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              aria-label="Imagem anterior"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              aria-label="Próxima imagem"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}

        {/* Dot indicators (only when multiple images) */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
            {allImages.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentImg(idx); setImgFailed(false); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  idx === currentImg
                    ? "bg-amber-400 w-3"
                    : "bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Ver imagem ${idx + 1}`}
              />
            ))}
          </div>
        )}

        {/* Image counter badge (only when multiple images) */}
        {hasMultiple && (
          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded-md bg-black/60 text-[10px] text-white font-semibold">
            {currentImg + 1}/{allImages.length}
          </div>
        )}

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
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-950/70 text-white border border-zinc-700/50">
          {vehicle.cat}
        </div>
      </div>

      {/* Details */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-bold text-base">{vehicle.name}</h3>
            <p className="text-zinc-300 text-xs mt-0.5">
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
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-zinc-700 text-white hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 transition-all duration-200"
        >
          {vehicle.mode === "aluguer" ? "Reservar Agora" : "Comprar"}
        </button>
      </div>
    </div>
  );
}
