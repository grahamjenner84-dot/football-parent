type ParentNoteProps = {
  children: React.ReactNode;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function ParentNote({ children, design = "classic" }: ParentNoteProps) {
  if (design === "comic") {
    return (
      <div className="my-8 rounded-2xl border-[3px] border-[#201E1D] bg-[#EAF1FF] p-5 shadow-[6px_6px_0_#201E1D]">
        <div className="mb-3 inline-block rounded-full border-2 border-[#201E1D] bg-[#1F5FD6] px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
          Football Parent note
        </div>
        <div className="leading-8 text-[#3A3836]">{children}</div>
      </div>
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
