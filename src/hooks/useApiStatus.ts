import { useEffect, useState } from "react";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export type ApiStatus = "online" | "offline" | "checking";

export function useApiStatus(intervalMs = 30_000): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${BASE}/health-check`, {
          method: "GET",
          signal: AbortSignal.timeout(4000),
          headers: { Accept: "application/json" },
        });
        if (!cancelled) setStatus(res.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setStatus("offline");
      }
    }

    check();
    const id = setInterval(check, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return status;
}
