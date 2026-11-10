"use client";

import { useState } from "react";

const SITE_URL = "https://www.footballparent.co.uk";

type VideoEmbedProps = {
  title: string;
  // One or two sentences on what the video shows. Used as the caption and
  // in the VideoObject schema, so write it for a reader, not a crawler.
  description: string;
  // ISO date the video was published (required by Google for video results).
  uploadDate: string;
  // ISO 8601 duration, e.g. "PT33S". Optional.
  duration?: string;
  // Either a YouTube video id (the v= value in a watch URL)...
  id?: string;
  // ...or a video file in /public, e.g. "/videos/clip.mp4", with a poster
  // image (also in /public). Self-hosted suits short, silent app clips.
  src?: string;
  poster?: string;
  // A phone screen recording: shown narrow and tall, not 16:9.
  portrait?: boolean;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

// A video in an article that costs nothing until the reader plays it.
// YouTube: only the thumbnail loads until tapped, then a youtube-nocookie
// iframe. Self-hosted: a native <video> with preload="none" and a poster.
// Either way it emits VideoObject JSON-LD for Google's video results.
export default function VideoEmbed({
  title,
  description,
  uploadDate,
  duration,
  id,
  src,
  poster,
  portrait = false,
  design = "classic",
}: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  const comic = design === "comic";

  const thumbnail = id
    ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    : poster
      ? `${SITE_URL}${poster}`
      : undefined;

  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    ...(thumbnail ? { thumbnailUrl: thumbnail } : {}),
    uploadDate,
    ...(id
      ? {
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
          contentUrl: `https://www.youtube.com/watch?v=${id}`,
        }
      : src
        ? { contentUrl: `${SITE_URL}${src}` }
        : {}),
    ...(duration ? { duration } : {}),
  };

  const frame = comic
    ? "overflow-hidden rounded-xl border-[3px] border-[#201E1D] bg-black"
    : "overflow-hidden rounded-xl border border-gray-200 bg-black";
  const shape = portrait
    ? "mx-auto aspect-[540/1170] w-full max-w-[300px]"
    : "aspect-video w-full";

  let player: React.ReactNode = null;
  if (src) {
    player = (
      <video
        src={src}
        poster={poster}
        controls
        muted
        playsInline
        preload="none"
        aria-label={title}
        className="absolute inset-0 h-full w-full object-contain"
      />
    );
  } else if (id && playing) {
    player = (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  } else if (id) {
    player = (
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
    );
  }

  if (!player) return null;

  return (
    <figure className="my-8">
      <div className={`relative ${shape} ${frame}`}>{player}</div>
      <figcaption
        className={`mx-auto mt-3 text-sm ${portrait ? "max-w-[420px] text-center" : ""} ${
          comic ? "text-[#3A3836]" : "text-gray-600"
        }`}
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
