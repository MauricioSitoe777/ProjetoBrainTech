import { useState, useEffect } from "react";

const VEHICLE_RETURN_KEY = "rentcar:last-route";

/**
 * Minimal client-side router based on window.location.pathname.
 * Supports: "/" (landing), "/admin" (users) and "/admin/reservas" (reservations).
 */
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: string) => {
    if (to.startsWith("/veiculo/") && !path.startsWith("/veiculo/")) {
      sessionStorage.setItem(VEHICLE_RETURN_KEY, path);
    }
    window.history.pushState({}, "", to);
    setPath(to);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo(0, 0);
  };

  return { path, navigate };
}