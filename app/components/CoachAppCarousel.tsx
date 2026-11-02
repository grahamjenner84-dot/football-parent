"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Mirrors the FEATURES list on the Coach App's own sign-in landing screen
// (coach-app repo, src/ui/pages/AuthGate.tsx) so the two stay recognisably
// the same set of screens. Screenshots are copies of that app's
// public/marketing/*.webp, all 780x1560.
const FEATURES = [
  {
    title: "Auto-generate the team",
    body: "Set your formation and rules once, then generate a fair lineup in one tap.",
    image: "team-selection-auto.webp",
    alt: "Coach App team selection screen showing an auto-picked lineup on the pitch, with the auto-pick rules above and subs below",
  },
  {
    title: "Track availability",
    body: "Send the availability link and see who's in, who's out and who hasn't replied, at a glance.",
    image: "confirm-squad.webp",
    alt: "Coach App confirm squad screen showing each player's availability from the parent link: eight available and one who can't play",
  },
  {
    title: "Track goals and assists live",
    body: "Log goals, assists and cards from the touchline in a couple of taps, no clipboard needed.",
    image: "live-match.webp",
    alt: "Coach App live match screen, 2-1 up in the 2nd quarter with the clock running, Goal for and Goal against buttons and the players on the pitch",
  },
  {
    title: "Track all your team's stats at the touch of a button",
    body: "Results, goals, top scorers and more, all worked out for you the moment a match is saved.",
    image: "stats-team-overview.webp",
    alt: "Coach App team stats: win, draw and loss record, top scorer, top assister and player of the match, and goals for and against",
  },
  {
    title: "Monitor every player's game time",
    body: "See each player's share of the available minutes update automatically, so game time stays fair without you doing the maths.",
    image: "stats-team.webp",
    alt: "Coach App game time stats: the squad's average share of minutes and the fair play time table with every player's share",
  },
];

export default function CoachAppCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // One dot per screenshot, lit when its screenshot is on screen. Each slide
  // is the full width of the scroller, so exactly one shows (and one dot
  // lights) at a time on every screen size.
  const [visible, setVisible] = useState<boolean[]>(() =>
    FEATURES.map((_, i) => i === 0),
  );

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const cards = Array.from(scroller.children) as HTMLElement[];
    if (!cards.length) return;

    const viewStart = scroller.scrollLeft;
    const viewEnd = viewStart + scroller.clientWidth;
    setVisible(
      cards.map((card) => {
        const cardStart = card.offsetLeft;
        const cardEnd = cardStart + card.offsetWidth;
        const overlap =
          Math.min(cardEnd, viewEnd) - Math.max(cardStart, viewStart);
        // A card barely peeking in from the edge is not "on screen" for this
        // purpose, or the trailing dot would light the moment you nudged.
        return overlap / card.offsetWidth >= 0.6;
      }),
    );
  }, []);

  useEffect(() => {
    measure();
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [measure]);

  function scrollToCard(index: number) {
    const scroller = scrollerRef.current;
    const cards = scroller ? (Array.from(scroller.children) as HTMLElement[]) : [];
    const card = cards[index];
    if (!scroller || !card) return;
    scroller.scrollTo({
      left: card.offsetLeft - cards[0].offsetLeft,
      behavior: "smooth",
    });
  }

  const first = visible.indexOf(true);
  const last = visible.lastIndexOf(true);

  return (
    <section className="border-b-[3px] border-[#201E1D] bg-[#FFF8E1] py-12 text-[#201E1D] lg:py-16">
      <div className="mx-auto flex max-w-[1120px] items-end justify-between gap-4 px-5 lg:px-6">
        <h2 className="font-display text-[32px] font-extrabold leading-[1.05] lg:text-[40px]">
          Everything You Need on the Touchline
        </h2>
        {/* Arrows from sm up: on a phone a swipe is the natural move and the
            dots below already say there is more. */}
        <div className="hidden shrink-0 gap-3 sm:flex">
          <ArrowButton
            direction="previous"
            disabled={first <= 0}
            onClick={() => scrollToCard(Math.max(0, first - 1))}
          />
          <ArrowButton
            direction="next"
            disabled={last === -1 || last >= FEATURES.length - 1}
            onClick={() => scrollToCard(Math.min(FEATURES.length - 1, first + 1))}
          />
        </div>
      </div>

      {/* `relative` matters: it makes the scroller the offsetParent, so the
          slides' offsetLeft is measured against it rather than the page.
          Each slide is full width with its card centred inside, and the
          slide's padding leaves room for the card's offset shadow, which
          overflow-x would otherwise clip. */}
      <div
        ref={scrollerRef}
        onScroll={measure}
        className="relative mx-auto mt-8 flex max-w-[1120px] snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.image}
            className="flex w-full flex-none snap-start justify-center px-5 pb-4 lg:px-6"
          >
            {/* A card on phones. On desktop the white card goes: one short
                caption in a wide box left a big empty panel beside the
                screenshot, so the text sits on the section background and
                the screenshot carries the frame and shadow. */}
            <div className="flex w-full max-w-[340px] flex-col rounded-[20px] border-2 border-[#201E1D] bg-white p-4 pb-5 shadow-[5px_5px_0_#201E1D] lg:max-w-[760px] lg:flex-row lg:items-center lg:gap-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pb-2 lg:shadow-none">
              <div className="lg:flex-1">
                <h3 className="font-display text-[22px] font-extrabold leading-[1.1] lg:text-[40px] lg:leading-[1.05]">
                  {feature.title}
                </h3>
                <p className="mb-4 mt-2 text-[15px] leading-relaxed text-[#3A3836] lg:mb-0 lg:mt-4 lg:text-[19px]">
                  {feature.body}
                </p>
              </div>
              {/* Slides stretch to the tallest, so pushing the image to the
                  bottom keeps every screenshot starting at the same height
                  however many lines the title and body wrap to. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- static
                  screenshots, sized and lazy; next/image adds nothing here. */}
              <img
                src={`/coach-app-screens/${feature.image}`}
                alt={feature.alt}
                width={780}
                height={1560}
                loading="lazy"
                className="mt-auto h-auto w-full rounded-2xl border-2 border-[#201E1D] lg:mt-0 lg:w-[300px] lg:flex-none lg:rounded-[24px] lg:shadow-[8px_8px_0_#201E1D]"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-2.5">
        {FEATURES.map((feature, i) => (
          <button
            key={feature.image}
            type="button"
            onClick={() => scrollToCard(i)}
            aria-label={`Show screenshot ${i + 1} of ${FEATURES.length}: ${feature.title}`}
            aria-current={i === first}
            // A 24px tap target around a 12px dot.
            className="flex h-6 w-6 items-center justify-center"
          >
            <span
              className={`block h-3 w-3 rounded-full border-2 border-[#201E1D] transition-colors ${
                visible[i] ? "bg-[#201E1D]" : "bg-white hover:bg-[#FFC400]"
              }`}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "next" ? "Next screenshot" : "Previous screenshot"}
      className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#201E1D] bg-[#FFC400] shadow-[3px_3px_0_#201E1D] transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#201E1D] disabled:translate-x-0 disabled:translate-y-0 disabled:bg-white disabled:opacity-40 disabled:shadow-none"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#201E1D"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {direction === "next" ? <path d="M9 5l7 7-7 7" /> : <path d="M15 5l-7 7 7 7" />}
      </svg>
    </button>
  );
}
