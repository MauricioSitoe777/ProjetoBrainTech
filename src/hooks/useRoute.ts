import { useState, useEffect } from "react";

const VEHICLE_RETURN_KEY = "rentcar:last-route";

function readRoute() {
  const { pathname, search } = window.location;
  return `${pathname}${search}`;
}

/**
 * Minimal client-side router based on window.location.pathname.
 * Supports: "/" (landing), "/admin" (users) and "/admin/reservas" (reservations).
 */
export function useRoute() {
  const [path, setPath] = useState(() => readRoute());

  useEffect(() => {
    const onPop = () => setPath(readRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: string) => {
    const target = to.startsWith("/") ? to : `/${to}`;
    if (target.startsWith("/veiculo/") && !path.startsWith("/veiculo/")) {
      sessionStorage.setItem(VEHICLE_RETURN_KEY, path);
    }
    window.history.pushState({}, "", target);
    setPath(readRoute());
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo(0, 0);
  };

  return { path, navigate };
}