export default function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white text-black">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} Football Parent. All rights reserved.</p>
        <div className="flex flex-wrap gap-4">
          <a href="https://www.tiktok.com/@footballparentuk" className="hover:text-black">
            TikTok
          </a>
          <a href="https://www.youtube.com/channel/UCLxRWA0LswKxL0vZuQfrsmA" className="hover:text-black">
            YouTube
          </a>
        </div>
      </div>
    </footer>
  );
}
