import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AnimatePresenceProps, MotionProps, Transition } from "motion/react";
import { useScrollTo } from "../hooks";
import { ArrowRight, Gauge } from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── TextRotate ────────────────────────────────────────────────────────────────

interface TextRotateProps {
  texts: string[];
  rotationInterval?: number;
  initial?: MotionProps["initial"];
  animate?: MotionProps["animate"];
  exit?: MotionProps["exit"];
  animatePresenceMode?: AnimatePresenceProps["mode"];
  animatePresenceInitial?: boolean;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | number | "random";
  transition?: Transition;
  loop?: boolean;
  auto?: boolean;
  splitBy?: "words" | "characters" | "lines" | string;
  onNext?: (index: number) => void;
  mainClassName?: string;
  splitLevelClassName?: string;
  elementLevelClassName?: string;
}

export interface TextRotateRef {
  next: () => void;
  previous: () => void;
  jumpTo: (index: number) => void;
  reset: () => void;
}

interface WordObject {
  characters: string[];
  needsSpace: boolean;
}

const TextRotate = forwardRef<TextRotateRef, TextRotateProps>(
  (
    {
      texts,
      transition = { type: "spring", damping: 25, stiffness: 300 },
      initial = { y: "100%", opacity: 0 },
      animate = { y: 0, opacity: 1 },
      exit = { y: "-120%", opacity: 0 },
      animatePresenceMode = "wait",
      animatePresenceInitial = false,
      rotationInterval = 2000,
      staggerDuration = 0,
      staggerFrom = "first",
      loop = true,
      auto = true,
      splitBy = "characters",
      onNext,
      mainClassName,
      splitLevelClassName,
      elementLevelClassName,
      ...props
    },
    ref,
  ) => {
    const [currentTextIndex, setCurrentTextIndex] = useState(0);

    const splitIntoCharacters = (text: string): string[] => {
      if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
        const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
        return Array.from(segmenter.segment(text), ({ segment }) => segment);
      }
      return Array.from(text);
    };

    const elements = useMemo(() => {
      const currentText = texts[currentTextIndex];
      if (splitBy === "characters") {
        const words = currentText.split(" ");
        return words.map((word, i) => ({
          characters: splitIntoCharacters(word),
          needsSpace: i !== words.length - 1,
        }));
      }
      return splitBy === "words"
        ? currentText.split(" ")
        : splitBy === "lines"
          ? currentText.split("\n")
          : currentText.split(splitBy);
    }, [texts, currentTextIndex, splitBy]);

    const getStaggerDelay = useCallback(
      (index: number, totalChars: number) => {
        if (staggerFrom === "first") return index * staggerDuration!;
        if (staggerFrom === "last") return (totalChars - 1 - index) * staggerDuration!;
        if (staggerFrom === "center") {
          const center = Math.floor(totalChars / 2);
          return Math.abs(center - index) * staggerDuration!;
        }
        if (staggerFrom === "random") {
          const randomIndex = Math.floor(Math.random() * totalChars);
          return Math.abs(randomIndex - index) * staggerDuration!;
        }
        return Math.abs((staggerFrom as number) - index) * staggerDuration!;
      },
      [staggerFrom, staggerDuration],
    );

    const handleIndexChange = useCallback(
      (newIndex: number) => {
        setCurrentTextIndex(newIndex);
        onNext?.(newIndex);
      },
      [onNext],
    );

    const next = useCallback(() => {
      const nextIndex =
        currentTextIndex === texts.length - 1
          ? loop
            ? 0
            : currentTextIndex
          : currentTextIndex + 1;
      if (nextIndex !== currentTextIndex) handleIndexChange(nextIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const previous = useCallback(() => {
      const prevIndex =
        currentTextIndex === 0
          ? loop
            ? texts.length - 1
            : currentTextIndex
          : currentTextIndex - 1;
      if (prevIndex !== currentTextIndex) handleIndexChange(prevIndex);
    }, [currentTextIndex, texts.length, loop, handleIndexChange]);

    const jumpTo = useCallback(
      (index: number) => {
        const validIndex = Math.max(0, Math.min(index, texts.length - 1));
        if (validIndex !== currentTextIndex) handleIndexChange(validIndex);
      },
      [texts.length, currentTextIndex, handleIndexChange],
    );

    const reset = useCallback(() => {
      if (currentTextIndex !== 0) handleIndexChange(0);
    }, [currentTextIndex, handleIndexChange]);

    useImperativeHandle(ref, () => ({ next, previous, jumpTo, reset }), [
      next,
      previous,
      jumpTo,
      reset,
    ]);

    useEffect(() => {
      if (!auto) return;
      const id = setInterval(next, rotationInterval);
      return () => clearInterval(id);
    }, [next, rotationInterval, auto]);

    return (
      <motion.span
        className={cn("flex flex-wrap whitespace-pre-wrap", mainClassName)}
        {...props}
        transition={transition}
      >
        <span className="sr-only">{texts[currentTextIndex]}</span>

        <AnimatePresence mode={animatePresenceMode} initial={animatePresenceInitial}>
          <motion.div
            key={currentTextIndex}
            className={cn("flex flex-wrap", splitBy === "lines" && "flex-col w-full")}
            aria-hidden="true"
          >
            {(splitBy === "characters"
              ? (elements as WordObject[])
              : (elements as string[]).map((el, i) => ({
                  characters: [el],
                  needsSpace: i !== elements.length - 1,
                }))
            ).map((wordObj, wordIndex, array) => {
              const previousCharsCount = array
                .slice(0, wordIndex)
                .reduce((sum, word) => sum + word.characters.length, 0);

              return (
                <span key={wordIndex} className={cn("inline-flex", splitLevelClassName)}>
                  {wordObj.characters.map((char, charIndex) => (
                    <motion.span
                      initial={initial}
                      animate={animate}
                      exit={exit}
                      key={charIndex}
                      transition={{
                        ...transition,
                        delay: getStaggerDelay(
                          previousCharsCount + charIndex,
                          array.reduce((sum, word) => sum + word.characters.length, 0),
                        ),
                      }}
                      className={cn("inline-block", elementLevelClassName)}
                    >
                      {char}
                    </motion.span>
                  ))}
                  {wordObj.needsSpace && <span className="whitespace-pre"> </span>}
                </span>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </motion.span>
    );
  },
);

TextRotate.displayName = "TextRotate";

// ─── RotatingHeading ───────────────────────────────────────────────────────────

const WORDS: { text: string; color: string }[] = [
  { text: "Alugue",   color: "#d8a020" },
  { text: "Compre",   color: "#f0c840" },
  { text: "SUVs",     color: "#e8b830" },
  { text: "Pick-ups", color: "#d8a020" },
  { text: "Sedans",   color: "#f0c840" },
];

function RotatingHeading() {
  const [index, setIndex] = useState(0);
  const color = WORDS[index].color;

  return (
    <motion.h1
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      style={{ fontFamily: "'Archivo', sans-serif" }}
      className="text-center text-4xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-5xl md:text-left lg:text-6xl xl:text-7xl"
    >
      O Seu
      <br />
      Carro
      {/* Linha com texto rotativo — altura fixa evita reflow */}
      <span
        className="relative mt-1 block overflow-hidden"
        style={{ height: "1.1em", color }}
      >
        <TextRotate
          texts={WORDS.map((w) => w.text)}
          rotationInterval={2500}
          staggerDuration={0.035}
          staggerFrom="first"
          splitBy="characters"
          transition={{ type: "spring", damping: 20, stiffness: 250 }}
          initial={{ y: "110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-110%", opacity: 0 }}
          mainClassName="absolute inset-0 flex items-center"
          onNext={setIndex}
        />

        {/* Traço animado — muda de cor junto com a palavra */}
        <motion.svg
          className="absolute -bottom-1 left-0 w-full"
          viewBox="0 0 300 16"
          fill="none"
          animate={{ color }}
          transition={{ duration: 0.4 }}
        >
          <path
            d="M4 12C60 4 120 4 296 12"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </motion.svg>
      </span>
    </motion.h1>
  );
}

// ─── ShufflingCards ────────────────────────────────────────────────────────────

const CARDS = [
  { id: "suv",     title: "SUV",      subtitle: "Espaço & Força",       tag: "Popular",       rotDeg: -3, glowColor: "rgba(216,160,32,0.25)" },
  { id: "pickup",  title: "Pick-up",  subtitle: "Robustez Total",        tag: "Tendência",     rotDeg:  3, glowColor: "rgba(240,200,64,0.20)" },
  { id: "sedan",   title: "Sedan",    subtitle: "Conforto & Estilo",     tag: "Clássico",      rotDeg:  2, glowColor: "rgba(216,160,32,0.18)" },
  { id: "aluguer", title: "Aluguer",  subtitle: "Flexibilidade Máxima",  tag: "Diário/Mensal", rotDeg: -2, glowColor: "rgba(240,200,64,0.22)" },
];

function shuffleDifferent<T>(arr: T[]): T[] {
  let next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  if (next.every((v, i) => v === arr[i])) return shuffleDifferent(arr);
  return next;
}

function ShufflingCards() {
  const [order, setOrder] = useState([0, 1, 2, 3]);
  const [locked, setLocked] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const children = Array.from(gridRef.current.children) as HTMLElement[];
      const parent = gridRef.current.getBoundingClientRect();
      setSlots(
        children.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - parent.left, y: r.top - parent.top };
        }),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const handleHover = () => {
    if (locked || slots.length < 4) return;
    setLocked(true);
    setOrder((prev) => shuffleDifferent(prev));
    setTimeout(() => setLocked(false), 520);
  };

  const lastIdx = slots.length - 1;
  const containerH =
    slots.length === 4
      ? slots[lastIdx].y +
        ((gridRef.current?.children[lastIdx] as HTMLElement | undefined)?.offsetHeight ?? 200)
      : undefined;

  return (
    <div className="relative w-full">
      {/* grid invisível — referência para medir posições dos 4 slots */}
      <div
        ref={gridRef}
        className="invisible grid grid-cols-2 gap-2 sm:gap-3"
        aria-hidden="true"
      >
        {CARDS.map((c) => (
          <div key={c.id} className="min-h-[120px] sm:min-h-[135px] lg:min-h-[150px]" />
        ))}
      </div>

      {/* container absoluto com a altura medida */}
      <div className="absolute inset-x-0 top-0" style={{ height: containerH }}>
        {slots.length === 4 &&
          order.map((cardIdx, slotIdx) => {
            const card = CARDS[cardIdx];
            const { x, y } = slots[slotIdx];
            const el = gridRef.current?.children[slotIdx] as HTMLElement | undefined;
            const w = el?.offsetWidth ?? 0;
            const h = el?.offsetHeight ?? 150;

            return (
              <motion.div
                key={card.id}
                animate={{ x, y, rotate: card.rotDeg }}
                whileHover={{ scale: 1.04, rotate: 0, zIndex: 20 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                onHoverStart={handleHover}
                style={{
                  position: "absolute",
                  width: w,
                  height: h,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: `0 4px 24px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.10)`,
                }}
                className="flex flex-col justify-between rounded-2xl border border-white/10 p-3.5 backdrop-blur-md sm:rounded-[20px] sm:p-4"
              >
                {/* topo: ícone + tag */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/15 sm:h-8 sm:w-8">
                    <Gauge className="h-3.5 w-3.5 text-amber-400 sm:h-4 sm:w-4" />
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/70 sm:text-[10px]">
                    {card.tag}
                  </span>
                </div>

                {/* base: título + subtítulo */}
                <div>
                  <h3 className="text-lg font-black uppercase leading-none tracking-tight text-white sm:text-xl">
                    {card.title}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-medium text-white/55 sm:text-xs">
                    {card.subtitle}
                  </p>
                </div>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Hero principal ────────────────────────────────────────────────────────────

export default function Hero({ onShowSimulator }: { onShowSimulator?: () => void }) {
  const scrollTo = useScrollTo();

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Vídeo */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Overlay escuro */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.10) 60%, rgba(0,0,0,0.30) 100%)",
        }}
      />

      {/* Brilho dourado sutil no topo-esquerdo */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Conteúdo */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-10 px-5 py-24 sm:px-8 md:flex-row md:items-center md:gap-12 lg:gap-16">

        {/* ESQUERDA — heading + descrição + CTAs */}
        <div className="flex w-full flex-col items-center gap-6 md:w-1/2 md:items-start">
          <RotatingHeading />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-md text-center text-base font-medium leading-relaxed text-white/70 md:text-left md:text-lg"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            Descubra o veículo certo para si — para comprar ou alugar.
            Catálogo completo, preços transparentes e entrega rápida em Moçambique.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex w-full flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start"
          >
            <button
              onClick={() => scrollTo("catalogo")}
              className="group flex items-center justify-center gap-2 rounded-full bg-amber-500 px-8 py-4 text-sm font-black uppercase tracking-wider text-zinc-950 transition-all hover:-translate-y-1 hover:bg-amber-400 active:scale-95"
              style={{ fontFamily: "'Archivo', sans-serif" }}
            >
              Ver Catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => {
                onShowSimulator?.();
                scrollTo("simulador");
              }}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-8 py-4 text-sm font-black uppercase tracking-wider text-zinc-300 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-amber-500/50 hover:text-white"
              style={{ fontFamily: "'Archivo', sans-serif" }}
            >
              Simular Prestações
            </button>
          </motion.div>
        </div>

        {/* DIREITA — cards embaralhados */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
          className="w-full max-w-sm sm:max-w-md md:max-w-none md:w-1/2"
        >
          <ShufflingCards />
        </motion.div>
      </div>
    </section>
  );
}
