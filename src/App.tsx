import { useEffect, useState } from "react";
import { useScrolled } from "./hooks";
import { useRoute } from "./hooks/useRoute";
import Navbar          from "./components/Navbar";
import Hero            from "./components/Hero";
import CatalogSection  from "./components/CatalogSection";
import HowItWorks      from "./components/HowItWorks";
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

// ─── Admin shell (login gate) ────────────────────────────────────────────────
function AdminShell({ onExit }: { onExit: () => void }) {
  const { user } = useAuth();
  const { path } = useRoute();
  if (!user) return <LoginPage onCancel={onExit} />;
  if (user.role === "cliente") return <ClientProfilePage onExit={onExit} />;
  if (path.startsWith("/admin/reservas")) return <ReservationsPage onExit={onExit} />;
  return <UsersPage onExit={onExit} />;
}

// ─── Landing page (original, untouched) ──────────────────────────────────────
function LandingPage({
  onOpenAdmin,
}: {
  onShowSimulator?: () => void;
  onOpenAdmin: () => void;
}) {
  const scrolled = useScrolled(40);
  const [showSimulator, setShowSimulator] = useState(false);
  const [flowModalOpen, setFlowModalOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setShowSimulator(false);
      setFlowModalOpen(false);
    };
    window.addEventListener("rentcar:close-simulator", handler as EventListener);
    return () => window.removeEventListener("rentcar:close-simulator", handler as EventListener);
  }, []);

  return (
    <div
      className="min-h-screen bg-zinc-950 antialiased"
      style={{ fontFamily: "'Archivo', sans-serif" }}
    >
      <Navbar
        scrolled={scrolled}
        onShowSimulator={() => setShowSimulator(true)}
        onOpenAdmin={onOpenAdmin}
      />
      <main>
        <Hero onShowSimulator={() => setShowSimulator(true)} />
        <CatalogSection
          onShowSimulator={() => setShowSimulator(true)}
          onOpenFlowModal={() => setFlowModalOpen(true)}
        />
        <HowItWorks />
        <div id="simulador" />
        {showSimulator ? <Simulator /> : null}
        <PaymentsSection />
      </main>
      <Footer />

      {flowModalOpen ? (
        <div className="fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setFlowModalOpen(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-zinc-800 bg-zinc-950/80">
                <div className="text-white font-bold">Simulador</div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setFlowModalOpen(false)}
                  className="w-10 h-10 rounded-full border border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-white hover:border-zinc-600 transition flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <div className="max-h-[calc(90vh-64px)] overflow-auto">
                <Simulator showClose={false} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
export default function App() {
  const { path, navigate } = useRoute();
  const isAdmin = path.startsWith("/admin");

  return (
    <AuthProvider>
      <UsersProvider>
        <ReservationsProvider>
          {isAdmin ? (
            <AdminShell onExit={() => navigate("/")} />
          ) : (
            <LandingPage onOpenAdmin={() => navigate("/admin")} />
          )}
        </ReservationsProvider>
      </UsersProvider>
    </AuthProvider>
  );
}
