import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import type { ReactNode } from "react";

export function SectionReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  /* ── ENTRADA ──────────────────────────────────────────────────────────────
     Sobe 130 px + blur que limpa + scale que cresce de 0.91 para 1            */
  const y      = useTransform(scrollYProgress, [0, 0.32], [130, 0]);
  const blur   = useTransform(scrollYProgress, [0, 0.24], [12, 0]);
  const filter = useTransform(blur, v => `blur(${v}px)`);

  /* ── SCALE multi-paragem: cresce na entrada → estável → encolhe na saída ─ */
  const scale = useTransform(
    scrollYProgress,
    [0,    0.22, 0.46, 0.96],
    [0.91, 1,    1,    0.75]
  );

  /* ── SAÍDA ────────────────────────────────────────────────────────────────
     Bordas arredondadas + película escura à medida que a próxima cobre        */
  const radius  = useTransform(scrollYProgress, [0.46, 0.96], [0, 38]);
  const overlay = useTransform(scrollYProgress, [0.50, 0.96], [0, 0.75]);

  return (
    <div ref={ref}>
      <motion.div
        className="relative overflow-hidden"
        style={{
          y,
          scale,
          filter,
          borderRadius: radius,
          transformOrigin: "50% 0%",
          willChange: "transform, filter",
        }}
      >
        {children}

        {/* película que cobre a secção ao ser ultrapassada */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-zinc-950"
          style={{ opacity: overlay }}
        />
      </motion.div>
    </div>
  );
}
