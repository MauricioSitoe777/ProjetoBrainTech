import { useEffect, useState } from "react";
import { useScrolled } from "./hooks";
import { useRoute } from "./hooks/useRoute";
import Navbar          from "./components/Navbar";
import Hero from "./components/Hero";
import CatalogSection  from "./components/CatalogSection";
import HowItWorks      from "./components/HowItWorks";
import XitiqueSection   from "./components/XitiqueSection";
import AboutSection     from "./components/AboutSection";
import XitiqueModal     from "./components/XitiqueModal";
import XitiqueRegulationsModal from "./components/XitiqueRegulationsModal";
import Simulator       from "./components/Simulator";
import PaymentsSection from "./components/PaymentsSection";
import Footer          from "./components/Footer";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UsersProvider } from "./context/UsersContext";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ClientProfilePage } from "./pages/ClientProfilePage";
import { ReservationsPage } from "./pages/ReservationsPage";
import { ReservationsProvider } from "./context/ReservationsContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { GuestsProvider } from "./context/GuestsContext";
import { VehiclesProvider } from "./context/VehiclesContext";
import { VehiclesPage } from "./pages/VehiclesPage";
import VehicleDetailsPage from "./components/VehicleDetailsPage";
import { InvitesProvider } from "./context/InvitesContext";
import { InvitePage } from "./pages/InvitePage";
import { XitiqueProvider } from "./context/XitiqueContext";
import { XitiquePage } from "./pages/XitiquePage";
import { XitiqueClientPage } from "./pages/XitiqueClientPage";
import { FinanceProvider } from "./context/FinanceContext";
import { FinancePage } from "./pages/FinancePage";
import { AluguerPage } from "./pages/AluguerPage";
import { CompraPage } from "./pages/CompraPage";
import { MotoristasProvider } from "./context/MotoristasContext";
import { MotoristasPage } from "./pages/MotoristasPage";
import { AdminNav } from "./components/AdminNav";
import { AdminSidebar } from "./components/AdminSidebar";
import { DashboardPage } from "./pages/DashboardPage";

type SimulatorFlow = "aluguer" | "compra";

// ─── Admin shell (login gate) ────────────────────────────────────────────────
function AdminShell({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const { path } = useRoute();

  if (!user) return <LoginPage onCancel={onExit} />;
  if (user.role === "cliente") return <ClientProfilePage onExit={onExit} />;

  const renderPage = () => {
    if (path === "/admin" || path === "/admin/dashboard") return <DashboardPage />;
    if (path.startsWith("/admin/utilizadores") || path.startsWith("/admin/visitantes")) return <UsersPage />;
    if (path.startsWith("/admin/aluguer"))    return <AluguerPage />;
    if (path.startsWith("/admin/compra"))     return <CompraPage />;
    if (path.startsWith("/admin/veiculos"))   return <VehiclesPage />;
    if (path.startsWith("/admin/xitique"))    return <XitiquePage />;
    if (path.startsWith("/admin/financas"))   return <FinancePage />;
    if (path.startsWith("/admin/motoristas")) return <MotoristasPage />;
    return <DashboardPage />;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <AdminNav onExit={onExit} />
      <div className="flex flex-1">
        <div className="hidden md:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <AdminSidebar />
        </div>
        <main className="flex-1 min-w-0 overflow-x-hidden">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

// ─── Landing page (original, untouched) ──────────────────────────────────────
function LandingPage({
  onOpenAdmin,
}: {
  onShowSimulator?: () => void;
  onOpenAdmin: () => void;
}) {
  const scrolled = useScrolled(40);
  const [showXitiqueModal, setShowXitiqueModal] = useState(false);
  const [showXitiqueRegs, setShowXitiqueRegs] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);
  const [simulatorFlowLock, setSimulatorFlowLock] = useState<SimulatorFlow | undefined>();

  const scrollToSimulator = () =>
    document.getElementById('simulador')?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    const handleOpenXitique = () => setShowXitiqueModal(true);
    const handleOpenRegs = () => setShowXitiqueRegs(true);
    const openFlowHandler = (event: Event) => {
      setSimulatorFlowLock((event as CustomEvent<SimulatorFlow | undefined>).detail);
      setFlowModalOpen(true);
    };

    window.addEventListener("rentcar:open-xitique-modal", handleOpenXitique);
    window.addEventListener("rentcar:open-xitique-regs", handleOpenRegs);
    window.addEventListener("rentcar:open-flow-modal", openFlowHandler as EventListener);

    return () => {
      window.removeEventListener("rentcar:open-xitique-modal", handleOpenXitique);
      window.removeEventListener("rentcar:open-xitique-regs", handleOpenRegs);
      window.removeEventListener("rentcar:open-flow-modal", openFlowHandler as EventListener);
    };
  }, []);

  return (
    <div
      className="min-h-screen bg-zinc-950 antialiased"
    >
      <Navbar
        scrolled={scrolled}
        onShowSimulator={scrollToSimulator}
        onOpenAdmin={onOpenAdmin}
      />
      <main>
        <Hero />
        <CatalogSection
          onShowSimulator={scrollToSimulator}
          onOpenFlowModal={(lockedFlow) => {
            setSimulatorFlowLock(lockedFlow);
            setFlowModalOpen(true);
          }}
        />
        <HowItWorks onShowSimulator={scrollToSimulator} />
        <XitiqueSection onShowSimulator={scrollToSimulator} />
        <Simulator showClose={false} />
        <PaymentsSection onShowSimulator={scrollToSimulator} />
        <AboutSection />
      </main>
      <Footer />
      {showXitiqueModal && <XitiqueModal onClose={() => setShowXitiqueModal(false)} />}
      {showXitiqueRegs && <XitiqueRegulationsModal onClose={() => setShowXitiqueRegs(false)} />}

      {flowModalOpen ? (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setFlowModalOpen(false);
              setSimulatorFlowLock(undefined);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
                <div className="text-white font-bold">Simulador</div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => {
                    setFlowModalOpen(false);
                    setSimulatorFlowLock(undefined);
                  }}
                  className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950/60 text-white hover:text-white hover:border-zinc-600 transition flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <div className="max-h-[calc(90vh-64px)] overflow-auto">
                <Simulator showClose={false} lockedFlow={simulatorFlowLock} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SCROLL_KEY = "rentcar:returnScroll";

function saveScroll() {
  sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
}

function restoreScroll() {
  const y = Number(sessionStorage.getItem(SCROLL_KEY) || "0");
  sessionStorage.removeItem(SCROLL_KEY);
  if (y > 0) setTimeout(() => window.scrollTo({ top: y, behavior: "smooth" }), 60);
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const { path, navigate } = useRoute();
  const isAdmin = path.startsWith("/admin");
  const isVehicleDetails = path.startsWith("/veiculo/");
  const isInvite = path.startsWith("/convite/");
  const vehicleId = isVehicleDetails ? parseInt(path.split("/").pop() || "0") : 0;
  const inviteToken = isInvite ? path.split("/convite/")[1] ?? "" : "";

  const goBack = () => { navigate("/"); restoreScroll(); };

  return (
    <AuthProvider>
      <UsersProvider>
        <NotificationsProvider>
          <GuestsProvider>
          <ReservationsProvider>
            <VehiclesProvider>
              <FinanceProvider>
              <MotoristasProvider>
              <XitiqueProvider>
              <InvitesProvider>
                {isInvite ? (
                  <InvitePage
                    token={inviteToken}
                    onSuccess={() => navigate("/")}
                  />
                ) : isAdmin ? (
                  <AdminShell onExit={goBack} />
                ) : isVehicleDetails ? (
                  <VehicleDetailsPage
                    vehicleId={vehicleId}
                    onExit={goBack}
                    onOpenFlowModal={(lockedFlow) => {
                      navigate("/");
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal", { detail: lockedFlow }));
                      }, 100);
                    }}
                  />
                ) : (
                  <LandingPage
                    onOpenAdmin={() => { saveScroll(); navigate("/admin"); }}
                  />
                )}
              </InvitesProvider>
              </XitiqueProvider>
              </MotoristasProvider>
              </FinanceProvider>
            </VehiclesProvider>
          </ReservationsProvider>
          </GuestsProvider>
        </NotificationsProvider>
      </UsersProvider>
    </AuthProvider>
  );
}


