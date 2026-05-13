import { useState, useEffect } from "react";

/**
 * Minimal client-side router based on window.location.pathname.
 * Supports: "/" (landing) and "/admin" (user management).
 */
export function useRoute() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  };

  return { path, navigate };
}