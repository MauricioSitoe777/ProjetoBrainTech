import { useState, useEffect } from "react";
import { useVehicles, type VehicleData } from "../context/VehiclesContext";
import { useScrollTo } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useRoute } from "../hooks/useRoute";
import Navbar from "./Navbar";
import Footer from "./Footer";

type SimulatorFlow = "aluguer" | "compra";

interface VehicleDetailsPageProps {
  vehicleId: number;
  onExit: () => void;
  onOpenFlowModal?: (lockedFlow?: SimulatorFlow) => void;
  onShowSimulator?: () => void;
}

export default function VehicleDetailsPage({
  vehicleId,
  onExit,
  onOpenFlowModal,
  onShowSimulator,
}: VehicleDetailsPageProps) {
  const { vehicles } = useVehicles();
  const { user } = useAuth();
  const { navigate } = useRoute();
  const scrollTo = useScrollTo();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [currentImg, setCurrentImg] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const v = vehicles.find((v) => v.id === vehicleId);
    if (v) {
      setVehicle(v);
    }
  }, [vehicleId, vehicles]);

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl mb-4">Veículo não encontrado.</p>
          <button
            onClick={onExit}
            className="px-6 py-2 rounded-full bg-amber-500 text-zinc-950 font-bold"
          >
            Voltar ao Catálogo
          </button>
        </div>
      </div>
    );
  }

  const allImages = vehicle.images && vehicle.images.length > 0 ? vehicle.images : [vehicle.img];

  const handleAction = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

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
    onExit(); // Go back to landing to see simulator
    setTimeout(() => scrollTo("simulador"), 100);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans antialiased">
      <Navbar scrolled={true} onOpenAdmin={() => {}} onShowSimulator={onShowSimulator} />
      
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-20">
        {/* Breadcrumb / Back */}
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-zinc-400 hover:text-amber-500 transition-colors mb-8 group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:-translate-x-1 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-bold text-sm uppercase tracking-widest">Voltar ao Catálogo</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Images */}
          <div className="space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl">
              <img
                src={allImages[currentImg]}
                alt={vehicle.name}
                className="w-full h-full object-cover transition-all duration-500"
              />
              
              {/* Badges */}
              <div className="absolute top-6 left-6 flex flex-col gap-3">
                <div className="px-4 py-1.5 rounded-full text-[10px] font-black bg-amber-500 text-zinc-950 shadow-xl uppercase tracking-wider">
                  {vehicle.mode}
                </div>
                <div className="px-4 py-1.5 rounded-full text-[10px] font-bold bg-zinc-950/80 text-white border border-zinc-700/50 backdrop-blur-md uppercase tracking-wider">
                  3RD PARTY seller
                </div>
              </div>

              {/* Image Counter */}
              <div className="absolute bottom-6 left-6 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-widest">
                {currentImg + 1} / {allImages.length}
              </div>

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((i) => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentImg((i) => (i + 1) % allImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-amber-500 hover:text-zinc-950 transition-all"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImg(idx)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      idx === currentImg ? "border-amber-500 scale-95" : "border-zinc-800 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Social Share Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 justify-center">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3b5998] hover:bg-[#2d4373] transition-colors text-white text-xs font-bold">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Share
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7360f2] hover:bg-[#5a48d1] transition-colors text-white text-xs font-bold">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.66 1.434 5.172L2 22l4.945-1.402C8.385 21.494 10.136 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.734 0-3.348-.459-4.743-1.258l-2.812.798.812-2.732C4.43 15.42 4 13.766 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                Share
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#128C7E] transition-colors text-white text-xs font-bold">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Share
              </button>
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-amber-500 font-black text-xs uppercase tracking-[0.2em]">{vehicle.brand}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
                {vehicle.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-amber-500">📅</span> {vehicle.year}
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-amber-500">⛽</span> {vehicle.fuel}
                </div>
                <div className="flex items-center gap-1.5 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                  <span className="text-amber-500">👤</span> {vehicle.seats} Lugares
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 mb-6">
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mb-1">Preço Sugerido</p>
                  <div className="flex items-baseline gap-2">
                    <div className="text-4xl font-black text-amber-500">{vehicle.price}</div>
                  </div>
                  <div className="text-xs text-green-500 font-bold mt-1">
                    (Approx. { (Number(String(vehicle.price).replace(/[^\d]/g, "")) * 1.1).toLocaleString() } MT total com taxas)
                  </div>
                </div>
                
                <div className="h-px bg-zinc-800" />
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Preço Final</p>
                    <p className="text-xl font-black text-white">Sob Consulta</p>
                  </div>
                  {vehicle.discount && vehicle.discount > 0 && (
                    <div className="px-4 py-2 rounded-xl bg-red-500 text-white font-black text-xs animate-pulse shadow-lg shadow-red-500/20">
                      -{vehicle.discount}% OFF
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p className="font-bold text-white uppercase text-[10px] tracking-[0.2em] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Descrição do Veículo
                </p>
                <p className="opacity-80">
                  {vehicle.description || "Nenhuma descrição detalhada disponível para este veículo no momento."}
                </p>
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-3">
              <button
                onClick={handleAction}
                disabled={vehicle.mode === "aluguer" && vehicle.available === false}
                className={`w-full py-5 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-xl ${
                  vehicle.mode === "aluguer" && vehicle.available === false
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                    : "bg-amber-500 text-zinc-950 hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99] shadow-amber-500/20"
                }`}
              >
                {vehicle.mode === "aluguer" 
                  ? (vehicle.available === false ? "Indisponível" : "Reservar Agora") 
                  : "Solicitar Cotação"}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Favorito
                </button>
                <button className="py-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 text-white font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                  </svg>
                  Chat Agora
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Login Suggestion Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setShowLoginPrompt(false)}
          />
          <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d8a020" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Autenticação Necessária</h3>
              <p className="text-zinc-400 text-sm mb-8">
                Para prosseguir com a reserva ou compra deste veículo, por favor inicie sessão na sua conta primeiro.
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full py-4 rounded-2xl bg-amber-500 text-zinc-950 font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
                >
                  Fazer Login
                </button>
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-4 rounded-2xl border border-zinc-800 text-zinc-400 font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Continuar a Explorar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
