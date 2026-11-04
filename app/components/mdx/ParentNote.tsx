type ParentNoteProps = {
  children: React.ReactNode;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function ParentNote({ children, design = "classic" }: ParentNoteProps) {
  // Comic-accent design: the caption box from the homepage concepts canvas's
  // "Article components" board, in light blue rather than the canvas's
  // caption yellow (Graham, 4 Nov 2026): yellow is kept for "Football Parent
  // asks", and a note in the same yellow next to a question read as one block.
  if (design === "comic") {
    return (
      <aside className="my-8 rounded-[14px] border-[3px] border-[#201E1D] bg-[#E3EDFF] px-[22px] pt-[18px] pb-[22px] shadow-[5px_5px_0_#201E1D]">
        <p className="m-0 mb-2.5 flex items-center gap-2.5 font-display text-[21px] font-extrabold leading-[1.2] text-[#201E1D]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/parent/icon/parent-icon-256.png" alt="" width={38} height={38} className="h-[38px] w-[38px]" />
          Football Parent note
        </p>
        <div className="text-[18px] leading-[1.7] text-[#201E1D] [&_p:last-child]:mb-0">{children}</div>
      </aside>
    );
  }

  return (
    <div className="my-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
      <div className="mb-1 text-sm font-semibold text-blue-800">
        Football Parent note
      </div>
      <div className="text-gray-700 leading-8">{children}</div>
    </div>
  );
}
