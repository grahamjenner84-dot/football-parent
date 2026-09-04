"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Mirrors the FEATURES list on the Coach App's own sign-in landing screen
// (coach-app repo, src/ui/pages/AuthGate.tsx) so the two stay recognisably
// the same set of screens. Screenshots are copies of that app's
// public/marketing/*.webp, all 780x1560.
const FEATURES = [
  {
    title: "Track all your team's stats at the touch of a button",
    body: "Results, goals, top scorers and more, all worked out for you the moment a match is saved.",
    image: "stats-team-overview.webp",
    alt: "Coach App stats screen showing the Team tab: record, goals, leading the squad and a full player stats table",
  },
  {
    title: "Monitor every player's game time",
    body: "See each player's share of the available minutes update automatically, so game time stays fair without you doing the maths.",
    image: "stats-team.webp",
    alt: "Coach App stats screen showing the Fair Play Time table with every player's share of available minutes",
  },
  {
    title: "Auto-generate the team",
    body: "Set your formation and rules once, then generate a fair lineup in one tap.",
    image: "team-selection-auto.webp",
    alt: "Coach App team selection screen showing an auto-generated lineup on the pitch, with formation and mode controls above",
  },
  {
    title: "Track availability",
    body: "Send the availability link and see who's in, who's out and who hasn't replied, at a glance.",
    image: "confirm-squad.webp",
    alt: "Coach App confirm squad screen showing each player's availability status: available, not available or no reply yet",
  },
  {
    title: "Track goals and assists live",
    body: "Log goals, assists and cards from the touchline in a couple of taps, no clipboard needed.",
    image: "goal-details.webp",
    alt: "Coach App live match goal details sheet showing body part, goal type and assist selection",
  },
];

export default function CoachAppCarousel() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  // One dot per screenshot, and a dot is lit when its screenshot is on
  // screen. Three cards fit side by side on desktop, so three dots light at
  // once there and one on mobile. Anything cleverer (a dot per scroll
  // position) ends up showing fewer dots than there are images, which just
  // reads as a bug.
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

  return (
    <section className="py-12 lg:py-16 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">
          Everything You Need on the Touchline
        </h2>
      </div>

      {/* `relative` matters: it makes the scroller the offsetParent, so the
          cards' offsetLeft is measured against it rather than the page. */}
      <div
        ref={scrollerRef}
        onScroll={measure}
        className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-pl-6 px-6 pb-2 max-w-4xl mx-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.image}
            className="flex-none w-[260px] sm:w-[288px] snap-start flex flex-col"
          >
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {feature.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-3">
              {feature.body}
            </p>
            {/* Cards stretch to the tallest in the row, so pushing the image
                to the bottom keeps every screenshot starting at the same
                height however many lines the title and body wrap to. */}
            <img
              src={`/coach-app-screens/${feature.image}`}
              alt={feature.alt}
              width={780}
              height={1560}
              loading="lazy"
              className="mt-auto w-full h-auto rounded-2xl border border-gray-200 shadow-lg"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-6">
        {FEATURES.map((feature, i) => (
          <button
            key={feature.image}
            type="button"
            onClick={() => scrollToCard(i)}
            aria-label={`Show screenshot ${i + 1} of ${FEATURES.length}: ${feature.title}`}
            // Several dots can be lit at once, but only the leading one is
            // "current" for assistive tech, where a range would be noise.
            aria-current={i === visible.indexOf(true)}
            className={`h-2 w-2 rounded-full transition-colors ${
              visible[i] ? "bg-gray-900" : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
