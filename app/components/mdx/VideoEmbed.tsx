"use client";

import { useState } from "react";

type VideoEmbedProps = {
  // The 11-character YouTube video id (the v= value in a watch URL).
  id: string;
  title: string;
  // One or two sentences on what the video shows. Used as the caption and
  // in the VideoObject schema, so write it for a reader, not a crawler.
  description: string;
  // ISO date the video was uploaded to YouTube (required by Google for
  // video rich results).
  uploadDate: string;
  // ISO 8601 duration, e.g. "PT1M45S". Optional.
  duration?: string;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

// A click-to-load YouTube embed. The page shows only YouTube's thumbnail
// and a play button until the reader taps it, so an article with a video
// costs no YouTube JavaScript and no third-party cookies on load (the
// iframe uses youtube-nocookie.com once played). Emits VideoObject JSON-LD
// so the page can appear in Google's video results.
export default function VideoEmbed({
  id,
  title,
  description,
  uploadDate,
  duration,
  design = "classic",
}: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    thumbnailUrl: thumbnail,
    uploadDate,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    contentUrl: `https://www.youtube.com/watch?v=${id}`,
    ...(duration ? { duration } : {}),
  };

  const frame =
    design === "comic"
      ? "overflow-hidden rounded-xl border-[3px] border-[#201E1D] bg-black"
      : "overflow-hidden rounded-xl border border-gray-200 bg-black";

  return (
    <figure className="my-8">
      <div className={`relative aspect-video w-full ${frame}`}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={`Play video: ${title}`}
            className="group absolute inset-0 h-full w-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnail}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-red-600 shadow-lg transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <figcaption
        className={`mt-3 text-sm ${design === "comic" ? "text-[#3A3836]" : "text-gray-600"}`}
      >
        {description}
      </figcaption>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </figure>
  );
}
