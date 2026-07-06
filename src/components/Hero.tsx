import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AnimatePresenceProps, MotionProps, Transition } from "motion/react";
import { useScrollTo } from "../hooks";
import { ArrowRight, Clock, Gauge } from "lucide-react";

import { useReservations } from '../context/ReservationsContext';

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
            className={cn("flex", splitBy === "lines" ? "flex-col w-full" : "flex-nowrap")}
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
      className="text-center text-4xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-5xl md:text-left lg:text-6xl xl:text-7xl"
    >
      O Seu
      <br />
      Carro
      {/* Linha com texto rotativo — altura fixa evita reflow */}
      <span
        className="relative mt-1 block"
        style={{ height: "1.1em", color, clipPath: "inset(0 -200% 0 -200%)" }}
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
  { id: "publico",      title: "Público",      subtitle: "Sem entrada obrigatória", tag: "Funcionário",  rotDeg: -3, glowColor: "rgba(228,180,46,0.25)", warranty: true  },
  { id: "privado",      title: "Privado",      subtitle: "Entrada de 10% a 50%",   tag: "Funcionário",  rotDeg:  3, glowColor: "rgba(226,196,122,0.20)", warranty: true  },
  { id: "empreendedor", title: "Empreendedor", subtitle: "Posse com 75% entrada",  tag: "Empresário",   rotDeg:  2, glowColor: "rgba(228,180,46,0.18)", warranty: true  },
  { id: "aluguer",      title: "Aluguer",      subtitle: "Diário ou Mensal",        tag: "Flexibilidade",rotDeg: -2, glowColor: "rgba(226,196,122,0.22)", warranty: false },
];

const CARD_SIMULATOR_NAV: Record<string, { category?: string; flow?: "compra" | "aluguer" }> = {
  publico:      { category: "func_publico",  flow: "compra"  },
  privado:      { category: "func_privado",  flow: "compra"  },
  empreendedor: { category: "empreendedor",  flow: "compra"  },
  aluguer:      {                            flow: "aluguer" },
};

function navigateToSimulator(cardId: string) {
  window.dispatchEvent(
    new CustomEvent("rentcar:open-simulator-category", { detail: CARD_SIMULATOR_NAV[cardId] })
  );
  window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal"));
}

function ShufflingCards() {
  const { rules } = useReservations();
  const [xitiqueTextIndex, setXitiqueTextIndex] = useState(0);

  const discountTexts = useMemo(() => [
    "Diário ou Mensal",
    `Desconto 7+ dias: ${rules.descontoSemanalPercentual}%`,
    `Desconto 15+ dias: ${rules.descontoQuinzenalPercentual}%`,
    `Desconto 30+ dias: ${rules.descontoMensalPercentual}%`
  ], [rules]);

  const xitiqueTexts = useMemo(() => [
    "Poupança comunitária · Prémio mensal",
    "Grupo de 10 membros · 30mil MT/mês",
    "Sorteio mensal · 300mil MT",
    "Entre no grupo · Receba as chaves"
  ], []);

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      {/* ── 4 cards em grid simétrico ── */}
      {CARDS.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28, delay: i * 0.06 }}
          whileHover={{ scale: 1.04, zIndex: 20 }}
          onClick={() => navigateToSimulator(card.id)}
          style={{
            cursor: "pointer",
            background: "rgba(255,255,255,0.06)",
            boxShadow: `0 4px 24px ${card.glowColor}, inset 0 1px 0 rgba(255,255,255,0.10)`,
          }}
          className="flex flex-col justify-between rounded-2xl border border-white/10 p-3 backdrop-blur-md sm:rounded-[18px] sm:p-3.5 min-h-[110px] sm:min-h-[120px] lg:min-h-[130px]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/15 sm:h-8 sm:w-8">
              <Gauge className="h-3.5 w-3.5 text-amber-400 sm:h-4 sm:w-4" />
            </div>
            <span className="rounded-full border border-white/15 bg-white/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white sm:text-[10px]">
              {card.tag}
            </span>
          </div>
          <div>
            <h3 className="text-lg font-black uppercase leading-none tracking-tight text-white sm:text-xl">
              {card.title}
            </h3>
            {card.id === 'aluguer' ? (
              <div className="h-4 sm:h-5 overflow-hidden">
                <TextRotate
                  texts={discountTexts}
                  rotationInterval={3000}
                  staggerDuration={0.02}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  mainClassName="text-[11px] font-bold text-amber-400 sm:text-xs uppercase tracking-tight"
                  splitBy="words"
                />
              </div>
            ) : (
              <p className="mt-0.5 text-[11px] font-medium text-white sm:text-xs">
                {card.subtitle}
              </p>
            )}
            {card.warranty && (
              <div className="mt-2 flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md w-fit">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
                  Garantia 15 dias
                </span>
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* ── Card Xitique — full-width ── */}
      <motion.div
        key="xitique"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 30, delay: 0.25 }}
        whileHover={{ scale: 1.02, zIndex: 20 }}
        onClick={() => window.dispatchEvent(new CustomEvent("rentcar:open-xitique-modal"))}
        style={{
          cursor: "pointer",
          background:
            "linear-gradient(135deg, rgba(228,180,46,0.22) 0%, rgba(92,61,16,0.22) 44%, rgba(8,8,10,0.56) 100%)",
          boxShadow:
            "0 18px 50px rgba(0,0,0,0.28), 0 8px 34px rgba(228,180,46,0.22), inset 0 1px 0 rgba(255,255,255,0.16)",
        }}
        className="group col-span-2 overflow-hidden flex items-center justify-between gap-3 rounded-2xl border border-amber-400/30 px-4 py-3 backdrop-blur-xl sm:gap-4 sm:rounded-[20px] sm:px-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,214,102,0.20),transparent_32%),linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)] opacity-80" />
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/50 to-transparent" />

        {/* ícone */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/15 shadow-[0_0_24px_rgba(228,180,46,0.22)]">
          <Clock className="h-[18px] w-[18px] text-amber-300" />
        </div>

        {/* info central */}
        <div className="relative flex-1 min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="text-base font-black uppercase tracking-tight text-white sm:text-lg leading-none">
              Xitique
            </h3>
            <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              10 Membros
            </span>
          </div>
          <div className="h-4 overflow-hidden sm:h-5">
            <TextRotate
              texts={xitiqueTexts}
              rotationInterval={3000}
              staggerDuration={0.018}
              transition={{ type: "spring", damping: 24, stiffness: 280 }}
              initial={{ y: "110%", opacity: 0, filter: "blur(4px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-110%", opacity: 0, filter: "blur(4px)" }}
              onNext={setXitiqueTextIndex}
              mainClassName="text-[11px] font-semibold text-white sm:text-xs"
              splitBy="words"
            />
          </div>
          <div className="mt-1.5 hidden items-center gap-1.5 sm:flex">
            {xitiqueTexts.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all duration-500",
                  index === xitiqueTextIndex ? "w-4 bg-amber-300" : "w-1.5 bg-white/20",
                )}
              />
            ))}
          </div>
        </div>

        {/* stats */}
        <div className="relative flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-[9px] text-white uppercase font-bold">Quota</div>
            <div className="text-sm font-black text-white leading-tight">30mil <span className="text-amber-400 text-[10px]">MT</span></div>
          </div>
          <div className="w-px h-6 bg-white/10 hidden sm:block" />
          <div className="text-right">
            <div className="text-[9px] text-white uppercase font-bold">Prémio</div>
            <div className="text-sm font-black text-amber-400 leading-tight">300mil <span className="text-white text-[10px]">MT</span></div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 border border-amber-300/40 shadow-[0_0_22px_rgba(228,180,46,0.20)] transition-transform duration-300 group-hover:translate-x-0.5">
            <ArrowRight className="h-3.5 w-3.5 text-amber-300" strokeWidth={2.5} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Hero principal ────────────────────────────────────────────────────────────

export default function Hero() {
  const scrollTo = useScrollTo();

  return (
    <section id="hero" className="relative min-h-screen overflow-hidden">
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
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center gap-6 px-5 pt-20 pb-10 sm:px-8 md:flex-row md:items-center md:gap-10 lg:gap-14">

        {/* ESQUERDA — heading + descrição + CTAs */}
        <div className="flex w-full flex-col items-center gap-6 md:w-1/2 md:items-start">
          <RotatingHeading />

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="max-w-md text-center text-base font-medium leading-relaxed text-white md:text-left md:text-lg"
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
              className="group flex items-center justify-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-base font-black uppercase tracking-wider text-zinc-950 transition-all hover:-translate-y-0.5 hover:bg-amber-400 active:scale-95"
            >
              Ver Catálogo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => window.dispatchEvent(new CustomEvent("rentcar:open-flow-modal"))}
              className="flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-base font-black uppercase tracking-wider text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-amber-500/50 hover:text-white"
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
