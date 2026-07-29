import { useEffect, useState } from "react";
import { useRoute } from "./hooks/useRoute";
import { useAuth } from "./context/AuthContext";
import { useNotifications } from "./context/NotificationsContext";
import { AppHeader } from "./components/AppHeader";
import Hero            from "./components/Hero";
import CatalogSection  from "./components/CatalogSection";
import HowItWorks      from "./components/HowItWorks";
import AboutSection    from "./components/AboutSection";
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
import { MovimentosFinanceirosPage } from "./pages/MovimentosFinanceirosPage";
import { AluguerPage } from "./pages/AluguerPage";
import { CompraPage } from "./pages/CompraPage";
import { MotoristasProvider } from "./context/MotoristasContext";
import { MotoristasPage } from "./pages/MotoristasPage";
import { NotificacoesAdminPage } from "./pages/NotificacoesAdminPage";
import { ViaturaEmUsoPage } from "./pages/ViaturaEmUsoPage";
import { AdminSidebar } from "./components/AdminSidebar";
import { DashboardPage } from "./pages/DashboardPage";
import { ChangePasswordModal } from "./components/ChangePasswordModal";
import { ToastContainer } from "./components/ToastContainer";
import { RecuperarSenhaPage } from "./pages/RecuperarSenhaPage";
import { RedefinirSenhaPage } from "./pages/RedefinirSenhaPage";
import { SectionReveal } from "./components/SectionReveal";
import { XitiqueInfoPage } from "./pages/XitiqueInfoPage";
import { useClientReminders } from "./hooks/useClientReminders";
import { useAdminNotifier } from "./hooks/useAdminNotifier";

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

  useClientReminders();
  useAdminNotifier();

  // Sidebar drawer (admin mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Password change (client)
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Shared modal state (dispatched via window events)
  const [showXitiqueModal,  setShowXitiqueModal]  = useState(false);
  const [showXitiqueRegs,   setShowXitiqueRegs]   = useState(false);
  const [flowModalOpen,     setFlowModalOpen]      = useState(false);
  const [simulatorFlowLock, setSimulatorFlowLock]  = useState<SimulatorFlow | undefined>();

  // ── Route flags ────────────────────────────────────────────────────────────
  const currentPath = path.split("?")[0];
  const isRecuperar      = currentPath === "/recuperar-senha";
  const isRedefinir      = currentPath.startsWith("/recuperar-senha/") && currentPath.length > "/recuperar-senha/".length;
  const isInvite         = currentPath.startsWith("/convite/");
  const isAdminPath      = currentPath.startsWith("/admin");
  const isVehicleDetails = currentPath.startsWith("/veiculo/");
  const isXitiqueInfo    = currentPath === "/xitique";

  const vehicleId    = isVehicleDetails ? (currentPath.split("/veiculo/")[1]  ?? "") : "";
  const inviteToken  = isInvite         ? (currentPath.split("/convite/")[1]  ?? "") : "";
  const resetToken   = isRedefinir      ? (currentPath.split("/recuperar-senha/")[1] ?? "") : "";

  const isAdmin  = user?.role === "admin";
  const isClient = user?.role === "cliente";

  // Show header everywhere except special auth flows
  const showHeader = !isRecuperar && !isRedefinir && !isInvite;

  const goBack = () => {
    const shouldReturnToLast = currentPath.startsWith("/veiculo/");
    const lastRoute = shouldReturnToLast ? sessionStorage.getItem("rentcar:last-route") : null;
    navigate(lastRoute || "/");
    restoreScroll();
  };

  // ── Global window events ───────────────────────────────────────────────────
  useEffect(() => {
    const onAbout     = () => navigate('/sobre');
    const onXitique   = () => setShowXitiqueModal(true);
    const onRegs      = () => setShowXitiqueRegs(true);
    const onFlow      = (e: Event) => {
      setSimulatorFlowLock((e as CustomEvent<SimulatorFlow | undefined>).detail);
      setFlowModalOpen(true);
    };
    const onCloseFlow = () => { setFlowModalOpen(false); setSimulatorFlowLock(undefined); };

    window.addEventListener("rentcar:open-about",         onAbout);
    window.addEventListener("rentcar:open-xitique-modal", onXitique);
    window.addEventListener("rentcar:open-xitique-regs",  onRegs);
    window.addEventListener("rentcar:open-flow-modal",    onFlow as EventListener);
    window.addEventListener("rentcar:close-flow-modal",   onCloseFlow);
    return () => {
      window.removeEventListener("rentcar:open-about",         onAbout);
      window.removeEventListener("rentcar:open-xitique-modal", onXitique);
      window.removeEventListener("rentcar:open-xitique-regs",  onRegs);
      window.removeEventListener("rentcar:open-flow-modal",    onFlow as EventListener);
      window.removeEventListener("rentcar:close-flow-modal",   onCloseFlow);
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
          if (path.startsWith("/admin/financas"))    return <FinancePage />;
          if (path.startsWith("/admin/financeiro"))  return <MovimentosFinanceirosPage />;
          if (path.startsWith("/admin/motoristas"))     return <MotoristasPage />;
          if (path.startsWith("/admin/notificacoes"))   return <NotificacoesAdminPage />;
          if (path.startsWith("/admin/viaturas-em-uso")) return <ViaturaEmUsoPage />;
          return <DashboardPage />;
        };
        return (
          <div className="app-ui pt-16 min-h-screen bg-zinc-950 text-white flex flex-col">
            <div className="flex flex-1">
              {/* Desktop sidebar */}
              <div className="hidden md:block shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
                <AdminSidebar />
              </div>
              <main className="flex-1 min-w-0">
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

    // About page
    if (currentPath === "/sobre") return (
      <div className="pt-16">
        <AboutSection />
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

    const openSimulatorModal = () => window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal"));

    // Landing page (default)
    return (
      <div className="min-h-screen bg-zinc-950 antialiased">
        <div className="pt-16">
          <Hero />
          <SectionReveal>
            <CatalogSection
              onShowSimulator={openSimulatorModal}
              onOpenFlowModal={(lockedFlow) => {
                setSimulatorFlowLock(lockedFlow);
                setFlowModalOpen(true);
              }}
            />
          </SectionReveal>
          <SectionReveal>
            <HowItWorks onShowSimulator={openSimulatorModal} />
          </SectionReveal>
          <SectionReveal>
            <PaymentsSection onShowSimulator={openSimulatorModal} />
          </SectionReveal>
        </div>
        <Footer />

        {/* Floating WhatsApp button */}
        <a
          href="https://wa.me/258868844283"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar via WhatsApp"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
          style={{ backgroundColor: '#25D366' }}
        >
          <svg viewBox="0 0 24 24" fill="white" width="28" height="28" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
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
            <VehiclesProvider>
              <FinanceProvider>
                <ReservationsProvider>
                  <MotoristasProvider>
                    <XitiqueProvider>
                      <InvitesProvider>
                        <AppInner />
                      </InvitesProvider>
                    </XitiqueProvider>
                  </MotoristasProvider>
                </ReservationsProvider>
              </FinanceProvider>
            </VehiclesProvider>
          </GuestsProvider>
        </NotificationsProvider>
      </UsersProvider>
    </AuthProvider>
  );
}
