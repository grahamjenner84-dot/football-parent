"use client";

import { useEffect } from "react";
import Script from "next/script";

declare global {
  interface Window {
    instgrm?: {
      Embeds: { process: () => void };
    };
  }
}

type InstagramEmbedProps = {
  url: string;
  caption?: string;
};

export default function InstagramEmbed({ url, caption }: InstagramEmbedProps) {
  // Handles the case where this is a second (or third) embed on the page,
  // mounting after embed.js has already loaded and fired its own onLoad.
  useEffect(() => {
    window.instgrm?.Embeds.process();
  }, [url]);

  return (
    <figure className="my-8 flex flex-col items-center">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          borderRadius: 3,
          margin: "0 auto",
          maxWidth: 540,
          width: "100%",
        }}
      />
      {caption && (
        <figcaption className="mt-2 text-center text-sm text-gray-500">
          {caption}
        </figcaption>
      )}
      <Script
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onLoad={() => window.instgrm?.Embeds.process()}
      />
    </figure>
  );
}
