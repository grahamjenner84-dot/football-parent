type InfoTableItem = {
  label: string;
  value: string;
};

type InfoTableProps = {
  data?: string;
  // Set by MDXContent on pages using the comic-accent design
  // (lib/comic-design.ts); never authored in MDX.
  design?: "classic" | "comic";
};

export default function InfoTable({ data = "[]", design = "classic" }: InfoTableProps) {
  let items: InfoTableItem[] = [];

  try {
    items = JSON.parse(data);
  } catch {
    items = [];
  }

  if (!items.length) return null;

  // Comic: drawn like the comic tables in MDXContent (ink outline, cream
  // stripes, warm grey row rules), with the label column a little narrower
  // than the answer column.
  if (design === "comic") {
    return (
      <div className="my-6 overflow-hidden rounded-xl border-[3px] border-[#201E1D] bg-white">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className={`grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-6 ${
              index % 2 === 1 ? "bg-[#FFF8E1]" : ""
            } ${index > 0 ? "border-t border-[#C9C4BA]" : ""}`}
          >
            <div className="font-bold text-[#201E1D]">{item.label}</div>
            <div className="text-[#3A3836]">{item.value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
      {items.map((item, index) => (
        <div
          key={`${item.label}-${index}`}
          className={`grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 ${
            index !== items.length - 1 ? "border-b border-gray-200" : ""
          }`}
        >
          <div className="font-semibold text-gray-900">{item.label}</div>
          <div className="text-gray-700">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
