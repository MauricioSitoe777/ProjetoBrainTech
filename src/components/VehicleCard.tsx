import { useState } from "react";
import type { Vehicle } from "../data/constants";
import { useRoute } from "../hooks/useRoute";

interface VehicleCardProps {
  vehicle: Vehicle;
  onAction?: (vehicle: Vehicle) => void;
}

/**
 * Simplified vehicle card that navigates to the details page.
 */
export default function VehicleCard({ vehicle, onAction }: VehicleCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const { navigate } = useRoute();

  const handleNavigate = () => {
    sessionStorage.setItem("rentcar:returnScroll", String(window.scrollY));
    navigate(`/veiculo/${vehicle.id}`);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleNavigate}
      className={`group relative rounded-3xl overflow-hidden bg-zinc-900 border transition-all duration-500 cursor-pointer ${
        hovered
          ? "border-amber-500/50 shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_20px_rgba(216,160,32,0.1)] -translate-y-2"
          : "border-zinc-800 shadow-xl"
      }`}
    >
      {/* Image */}
      <div className="relative overflow-hidden h-56">
        {!imgFailed ? (
          <div className="relative w-full h-full bg-zinc-800">
            <img
              src={vehicle.img}
              alt={vehicle.name}
              loading="lazy"
              onError={() => setImgFailed(true)}
              className={`w-full h-full object-cover transition-all duration-1000 ease-out ${
                hovered ? "scale-110 blur-[2px] opacity-40" : "scale-100"
              }`}
            />
            {/* View Details Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="px-6 py-2.5 rounded-full bg-amber-500 text-zinc-950 font-black text-xs uppercase tracking-widest shadow-2xl">
                Ver Detalhes
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="text-4xl filter grayscale opacity-50">🚗</div>
              <span className="text-[10px] text-white font-bold uppercase tracking-tighter">Imagem Indisponível</span>
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />

        {/* Mode badge */}
        <div
          className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${
            vehicle.mode === "aluguer"
              ? "bg-blue-600 text-white"
              : "bg-amber-500 text-zinc-950"
          }`}
        >
          {vehicle.mode}
        </div>

        {/* Category badge */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-zinc-950/80 text-white border border-zinc-700/50 backdrop-blur-md uppercase tracking-widest">
            {vehicle.cat}
          </div>
          {vehicle.mode === "compra" && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white border border-emerald-400/50 shadow-lg shadow-emerald-600/20 uppercase tracking-widest">
              Garantia 15 Dias
            </div>
          )}
          {vehicle.discount && vehicle.discount > 0 && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black bg-red-600 text-white border border-red-400/50 shadow-lg shadow-red-600/20 animate-pulse uppercase tracking-widest">
              -{vehicle.discount}% OFF
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-black text-lg tracking-tight group-hover:text-amber-500 transition-colors">{vehicle.name}</h3>
              {vehicle.mode === "aluguer" && (
                <div className={`w-2 h-2 rounded-full shrink-0 ${vehicle.available !== false ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} title={vehicle.available !== false ? 'Disponível' : 'Indisponível'} />
              )}
            </div>
            <p className="text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              {vehicle.brand}
            </p>
          </div>
          <div className="text-right">
            <div className="text-amber-500 font-black text-lg leading-tight">
              {vehicle.price}
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction?.(vehicle);
          }}
          disabled={vehicle.mode === "aluguer" && vehicle.available === false}
          className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all duration-300 ${
            vehicle.mode === "aluguer" && vehicle.available === false
              ? "border-zinc-800 bg-zinc-900/50 text-white cursor-not-allowed"
              : "border-zinc-800 text-white hover:bg-amber-500 hover:text-zinc-950 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20"
          }`}
        >
          {vehicle.mode === "aluguer" 
            ? (vehicle.available === false ? "Indisponível" : "Reservar Agora") 
            : "Comprar"}
        </button>
      </div>
    </div>
  );
}
