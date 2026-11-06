"use client";

import { useState, type ReactNode } from "react";

// The filter chips above a category page's grouped guides (Academy Pathway).
// Every group is rendered on the server and is in the HTML when the page
// loads, so crawlers and readers without JavaScript see every guide link;
// picking a chip only hides the other groups. Never load a group after the
// page opens: the links have to be there from the start.
export type GuideFilterGroup = {
  id: string;
  label: string;
  count: number;
  content: ReactNode;
};

export default function GuideFilter({ groups }: { groups: GuideFilterGroup[] }) {
  const [filter, setFilter] = useState("all");
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const chips = [{ id: "all", label: "All guides", count: total }, ...groups];

  return (
    <>
      <div role="group" aria-label="Show guides about" className="flex flex-wrap gap-2.5">
        {chips.map((chip) => {
          const on = filter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(chip.id)}
              className={`inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full border-2 border-[#201E1D] pl-4 pr-2 text-[15px] font-bold text-[#201E1D] ${
                on ? "bg-[#FFC400] shadow-[3px_3px_0_#201E1D]" : "bg-white"
              }`}
            >
              {chip.label}
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#201E1D] px-2 text-[13px] text-white">
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {groups.map((group) => (
        <div key={group.id} hidden={filter !== "all" && filter !== group.id}>
          {group.content}
        </div>
      ))}
    </>
  );
}
