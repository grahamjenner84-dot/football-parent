import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import React from "react";
import Link from "next/link";
import InfoTable from "@/app/components/mdx/InfoTable";

// Custom components for MDX rendering with styling
const components = {
  InfoTable,

  h2: ({ children }: any) => (
    <h2
      id={
        typeof children === "string"
          ? children
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
          : ""
      }
      className="scroll-mt-24 text-3xl font-bold text-gray-900 mb-6 pt-8"
    >
      {children}
    </h2>
  ),

  h3: ({ children }: any) => (
    <h3 className="text-xl font-bold text-gray-900 mb-4 pt-4">
      {children}
    </h3>
  ),

  h4: ({ children }: any) => (
    <h4 className="text-lg font-bold text-gray-900 mb-3">
      {children}
    </h4>
  ),

  p: ({ children }: any) => (
    <p className="leading-8 mb-4">{children}</p>
  ),

  ul: ({ children }: any) => (
    <ul className="list-disc list-inside space-y-2 mb-6 ml-2">
      {children}
    </ul>
  ),

  ol: ({ children }: any) => (
    <ol className="list-decimal list-inside space-y-2 mb-6 ml-2">
      {children}
    </ol>
  ),

  li: ({ children }: any) => (
    <li className="leading-8">{children}</li>
  ),

  strong: ({ children }: any) => (
    <strong className="font-bold">{children}</strong>
  ),

  em: ({ children }: any) => (
    <em className="italic">{children}</em>
  ),

  a: ({ children, href }: any) => (
    <a
      href={href}
      className="font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 transition"
    >
      {children}
    </a>
  ),

  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="w-full border-collapse border border-gray-300">
        {children}
      </table>
    </div>
  ),

  thead: ({ children }: any) => <thead>{children}</thead>,

  tbody: ({ children }: any) => <tbody>{children}</tbody>,

  tr: ({ children }: any) => (
    <tr className="[&:nth-child(even)]:bg-gray-50">
      {children}
    </tr>
  ),

  th: ({ children }: any) => (
    <th className="border border-gray-300 p-3 text-left font-semibold bg-gray-100">
      {children}
    </th>
  ),

  td: ({ children }: any) => (
    <td className="border border-gray-300 p-3">
      {children}
    </td>
  ),

  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-500 bg-blue-50 p-4 my-6">
      {children}
    </blockquote>
  ),
};

interface MDXContentProps {
  content: string;
}

export async function MDXContent({ content }: MDXContentProps) {
  return (
    <div className="space-y-6 text-gray-700 leading-relaxed max-w-none">
      <MDXRemote
        source={content}
        components={components}
        options={{
          mdxOptions: {
            remarkPlugins: [remarkGfm],
          },
        }}
      />
    </div>
  );
}