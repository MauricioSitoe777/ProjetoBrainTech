import { useEffect, useState } from "react";
import { useRoute } from "./hooks/useRoute";
import { useAuth } from "./context/AuthContext";
import { useNotifications } from "./context/NotificationsContext";
import { AppHeader } from "./components/AppHeader";
import Hero            from "./components/Hero";
import CatalogSection  from "./components/CatalogSection";
import HowItWorks      from "./components/HowItWorks";
import AboutModal      from "./components/AboutModal";
import XitiqueModal    from "./components/XitiqueModal";
import XitiqueRegulationsModal from "./components/XitiqueRegulationsModal";
import Simulator       from "./components/Simulator";
import PaymentsSection from "./components/PaymentsSection";
import Footer          from "./components/Footer";
import { AuthProvider } from "./context/AuthContext";
import { UsersProvider } from "./context/UsersContext";
import { LoginPage } from "./pages/LoginPage";
import { UsersPage } from "./pages/UsersPage";
import { ClientProfilePage } from "./pages/ClientProfilePage";
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
import { FinanceProvider } from "./context/FinanceContext";
import { FinancePage } from "./pages/FinancePage";
import { AluguerPage } from "./pages/AluguerPage";
import { CompraPage } from "./pages/CompraPage";
import { MotoristasProvider } from "./context/MotoristasContext";
import { MotoristasPage } from "./pages/MotoristasPage";
import { AdminSidebar } from "./components/AdminSidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { ToastContainer } from "./components/ToastContainer";
import { RecuperarSenhaPage } from "./pages/RecuperarSenhaPage";
import { RedefinirSenhaPage } from "./pages/RedefinirSenhaPage";
import { SectionReveal } from "./components/SectionReveal";
import { XitiqueInfoPage } from "./pages/XitiqueInfoPage";

type SimulatorFlow = "aluguer" | "compra";

const SCROLL_KEY = "rentcar:returnScroll";
function saveScroll()    { sessionStorage.setItem(SCROLL_KEY, String(window.scrollY)); }
function restoreScroll() {
  const y = Number(sessionStorage.getItem(SCROLL_KEY) || "0");
  sessionStorage.removeItem(SCROLL_KEY);
  if (y > 0) setTimeout(() => window.scrollTo({ top: y, behavior: "smooth" }), 60);
}

// ─── Inner app — runs inside all providers ────────────────────────────────────
function AppInner() {
  const { user, allUsers } = useAuth();
  const { path, navigate } = useRoute();
  const { showToast } = useNotifications();

  // Sidebar drawer (admin mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Password change (client)
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Shared modal state (dispatched via window events)
  const [showAbout,         setShowAbout]         = useState(false);
  const [showXitiqueModal,  setShowXitiqueModal]  = useState(false);
  const [showXitiqueRegs,   setShowXitiqueRegs]   = useState(false);
  const [flowModalOpen,     setFlowModalOpen]      = useState(false);
  const [simulatorFlowLock, setSimulatorFlowLock]  = useState<SimulatorFlow | undefined>();

  // ── Route flags ────────────────────────────────────────────────────────────
  const isRecuperar      = path === "/recuperar-senha";
  const isRedefinir      = path.startsWith("/recuperar-senha/") && path.length > "/recuperar-senha/".length;
  const isInvite         = path.startsWith("/convite/");
  const isAdminPath      = path.startsWith("/admin");
  const isVehicleDetails = path.startsWith("/veiculo/");
  const isXitiqueInfo    = path === "/xitique";

  const vehicleId    = isVehicleDetails ? (path.split("/veiculo/")[1]  ?? "") : "";
  const inviteToken  = isInvite         ? (path.split("/convite/")[1]  ?? "") : "";
  const resetToken   = isRedefinir      ? (path.split("/recuperar-senha/")[1] ?? "") : "";

  const isAdmin  = user?.role === "admin";
  const isClient = user?.role === "cliente";

  // Show header everywhere except special auth flows
  const showHeader = !isRecuperar && !isRedefinir && !isInvite;

  const goBack = () => { navigate("/"); restoreScroll(); };

  // ── Global window events ───────────────────────────────────────────────────
  useEffect(() => {
    const onAbout   = () => setShowAbout(true);
    const onXitique = () => setShowXitiqueModal(true);
    const onRegs    = () => setShowXitiqueRegs(true);
    const onFlow    = (e: Event) => {
      setSimulatorFlowLock((e as CustomEvent<SimulatorFlow | undefined>).detail);
      setFlowModalOpen(true);
    };

    window.addEventListener("rentcar:open-about",         onAbout);
    window.addEventListener("rentcar:open-xitique-modal", onXitique);
    window.addEventListener("rentcar:open-xitique-regs",  onRegs);
    window.addEventListener("rentcar:open-flow-modal",    onFlow as EventListener);
    return () => {
      window.removeEventListener("rentcar:open-about",         onAbout);
      window.removeEventListener("rentcar:open-xitique-modal", onXitique);
      window.removeEventListener("rentcar:open-xitique-regs",  onRegs);
      window.removeEventListener("rentcar:open-flow-modal",    onFlow as EventListener);
    };
  }, []);

  // ── Welcome toast on login ─────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const key = `rentcar:welcomed:${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const primeiroNome = user.nome.split(" ")[0];
    showToast(
      `Bem-vindo${isAdmin ? "" : " de volta"}, ${primeiroNome}!`,
      isAdmin ? "Sessão de administrador iniciada." : "A sua conta está activa.",
      "success"
    );
  }, [user?.id]);

  // ── Render page content ────────────────────────────────────────────────────
  const renderPage = () => {
    // Special auth flows — no header
    if (isRecuperar) return <RecuperarSenhaPage onVoltar={() => navigate("/admin")} />;
    if (isRedefinir) return <RedefinirSenhaPage token={resetToken} onVoltar={() => navigate("/admin")} />;
    if (isInvite)    return <InvitePage token={inviteToken} onSuccess={() => navigate("/")} />;

    // Admin area
    if (isAdminPath) {
      if (!user) {
        return (
          <div className="pt-16 min-h-screen bg-zinc-950">
            <LoginPage onCancel={goBack} onRecuperar={() => navigate("/recuperar-senha")} />
          </div>
        );
      }
      if (isClient) {
        const fullUser = allUsers.find(u => u.id === user.id);
        if (fullUser?.mustChangePassword && !passwordChanged) {
          return <ChangePasswordModal onDone={() => setPasswordChanged(true)} />;
        }
        return (
          <div className="app-ui pt-16 min-h-screen bg-zinc-950 text-white">
            <ClientProfilePage onExit={goBack} />
          </div>
        );
      }
      if (isAdmin) {
        const adminPage = () => {
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
          <div className="app-ui pt-16 min-h-screen bg-zinc-950 text-white flex flex-col">
            <div className="flex flex-1">
              {/* Desktop sidebar */}
              <div className="hidden md:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
                <AdminSidebar />
              </div>
              <main className="flex-1 min-w-0 overflow-x-hidden">
                {adminPage()}
              </main>
            </div>
          </div>
        );
      }
    }

    // Xitique info page
    if (isXitiqueInfo) return (
      <div className="pt-16">
        <XitiqueInfoPage />
      </div>
    );

    // Vehicle detail
    if (isVehicleDetails) return (
      <div className="pt-16">
        <VehicleDetailsPage
          vehicleId={vehicleId}
          onExit={goBack}
          onOpenAdmin={() => { saveScroll(); navigate("/admin"); }}
          onOpenFlowModal={(lockedFlow) => {
            window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal", { detail: lockedFlow }));
          }}
        />
      </div>
    );

    // Landing page (default)
    return (
      <div className="min-h-screen bg-zinc-950 antialiased">
        <div className="pt-16">
          <Hero />
          <SectionReveal>
            <CatalogSection
              onShowSimulator={() => document.getElementById("simulador")?.scrollIntoView({ behavior: "smooth" })}
              onOpenFlowModal={(lockedFlow) => {
                setSimulatorFlowLock(lockedFlow);
                setFlowModalOpen(true);
              }}
            />
          </SectionReveal>
          <SectionReveal>
            <HowItWorks onShowSimulator={() => document.getElementById("simulador")?.scrollIntoView({ behavior: "smooth" })} />
          </SectionReveal>
          <SectionReveal>
            <Simulator showClose={false} />
          </SectionReveal>
          <SectionReveal>
            <PaymentsSection onShowSimulator={() => document.getElementById("simulador")?.scrollIntoView({ behavior: "smooth" })} />
          </SectionReveal>
        </div>
        <Footer />
      </div>
    );
  };

  return (
    <>
      {/* Unified header */}
      {showHeader && (
        <AppHeader
          onToggleSidebar={isAdminPath && isAdmin ? () => setSidebarOpen(v => !v) : undefined}
        />
      )}

      {/* Admin sidebar — mobile drawer */}
      {isAdminPath && isAdmin && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden">
            <AdminSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Page */}
      {renderPage()}

      {/* Global modals */}
      {showAbout        && <AboutModal onClose={() => setShowAbout(false)} />}
      {showXitiqueModal && <XitiqueModal onClose={() => setShowXitiqueModal(false)} />}
      {showXitiqueRegs  && <XitiqueRegulationsModal onClose={() => setShowXitiqueRegs(false)} />}

      {flowModalOpen && (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { setFlowModalOpen(false); setSimulatorFlowLock(undefined); }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
                <div className="text-white font-bold">Simulador</div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => { setFlowModalOpen(false); setSimulatorFlowLock(undefined); }}
                  className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950/60 text-white hover:border-zinc-600 transition flex items-center justify-center"
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
      )}

      <ToastContainer />
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
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
                        <AppInner />
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
