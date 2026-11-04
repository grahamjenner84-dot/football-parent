import React from "react";

// One question and one answer of an expert interview article, e.g.
//
//   <InterviewQuestion>What do coaches notice at a trial?</InterviewQuestion>
//
//   <InterviewAnswer name="David Jervis" org="Premier Football UK"
//     role="Founder" photoSrc="/images/people/david-jervis-premier-football-uk-400.jpg">
//   The answer, in markdown, in the expert's own words.
//   </InterviewAnswer>
//
// On a comic-accent page (design: "comic") the question is a yellow caption
// and the answer a speech bubble pointing at the expert's photo, as on the
// homepage concepts canvas's "Interview" board. On a classic page they render
// like the hand-written boxes in the older interviews. `design` is set by
// MDXContent, never authored in MDX.

type Design = "classic" | "comic";

type InterviewQuestionProps = {
  children: React.ReactNode;
  design?: Design;
};

export function InterviewQuestion({ children, design = "classic" }: InterviewQuestionProps) {
  if (design === "comic") {
    return (
      <div className="mb-6 max-w-[640px] rounded-xl border-[3px] border-[#201E1D] bg-[#FFE89A] px-[18px] py-[14px]">
        <p className="m-0 text-[13px] font-bold leading-[1.4] text-[#5A4A00]">
          Football Parent asks
        </p>
        <p className="m-0 mt-1 text-lg font-bold leading-normal text-[#201E1D]">{children}</p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
      <p className="mb-3 text-sm font-semibold text-blue-700">Football Parent asks</p>
      <p className="m-0 text-slate-700">{children}</p>
    </div>
  );
}

type InterviewAnswerProps = {
  name: string;
  // Shown after the name on the line under the bubble ("David Jervis,
  // Premier Football UK").
  org?: string;
  // Used on classic pages, in the attribution line above the answer.
  role?: string;
  photoSrc?: string;
  // "contain" for a logo standing in for a photo (Girls United), so it is
  // shown whole on white rather than cropped to the circle.
  photoFit?: "cover" | "contain";
  children: React.ReactNode;
  design?: Design;
};

export function InterviewAnswer({
  name,
  org,
  role,
  photoSrc,
  photoFit = "cover",
  children,
  design = "classic",
}: InterviewAnswerProps) {
  if (design === "comic") {
    return (
      <figure className="m-0 mb-12">
        <blockquote className="fp-bubble m-0 px-[26px] pt-[22px] pb-[6px] text-[#201E1D] [&_p]:mb-4">
          {children}
        </blockquote>
        <figcaption className="mt-[34px] flex items-center gap-3 pl-9 text-[15px] leading-[1.4]">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt=""
              width={52}
              height={52}
              className={`h-[52px] w-[52px] shrink-0 rounded-full border-[3px] border-[#201E1D] ${
                photoFit === "contain" ? "bg-white object-contain p-1" : "object-cover"
              }`}
            />
          ) : null}
          <span>
            <strong className="font-bold text-[#201E1D]">{name}</strong>
            {org ? `, ${org}` : ""}
          </span>
        </figcaption>
      </figure>
    );
  }

  return (
    <>
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {name}
        {role || org ? ` • ${[role, org].filter(Boolean).join(", ")}` : ""}
      </p>
      {children}
    </>
  );
}
