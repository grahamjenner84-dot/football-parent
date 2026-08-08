type ExpertOpinionProps = {
  name: string;
  role?: string;
  children: React.ReactNode;
};

export default function ExpertOpinion({ name, role, children }: ExpertOpinionProps) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-4">
      <div className="mb-1 text-sm font-semibold text-amber-800">
        Expert opinion — {name}
        {role ? `, ${role}` : ""}
      </div>
      <div className="text-gray-700 leading-8">{children}</div>
    </div>
  );
}
