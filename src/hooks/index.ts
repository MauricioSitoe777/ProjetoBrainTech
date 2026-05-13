import { useState, useEffect, useCallback } from "react";

/**
 * Tracks whether the page has been scrolled past a given threshold.
 */
export function useScrolled(threshold = 40): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return scrolled;
}

/**
 * Smooth-scrolls to a DOM element by id.
 * Returns a stable callback function.
 */
export function useScrollTo(): (id: string) => void {
  return useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);
}

/**
 * Formats a number as Mozambican locale currency (MT).
 */
export function useCurrencyFormatter(): (n: number) => string {
  return useCallback(
    (n: number) => new Intl.NumberFormat("pt-MZ").format(Math.round(n)),
    []
  );
}
