import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white text-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} Football Parent. All rights reserved.
        </p>

        <div className="flex flex-wrap gap-4">
          <Link href="/about" className="hover:text-black">
            About
          </Link>

          <Link href="/author/graham-jenner" className="hover:text-black">
            Graham Jenner
          </Link>

          <Link href="/editorial-policy" className="hover:text-black">
            Editorial Policy
          </Link>

          <a
            href="mailto:footballparentuk@gmail.com"
            className="hover:text-black"
          >
            Contact
          </a>

          <a
            href="https://www.tiktok.com/@footballparentuk"
            className="hover:text-black"
            target="_blank"
            rel="noopener noreferrer"
          >
            TikTok
          </a>

          <a
            href="https://www.youtube.com/channel/UCLxRWA0LswKxL0vZuQfrsmA"
            className="hover:text-black"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube
          </a>
        </div>
      </div>
    </footer>
  );
}