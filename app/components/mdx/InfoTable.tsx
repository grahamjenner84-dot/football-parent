type InfoTableItem = {
  label: string;
  value: string;
};

type InfoTableProps = {
  data?: string;
};

export default function InfoTable({ data = "[]" }: InfoTableProps) {
  let items: InfoTableItem[] = [];

  try {
    items = JSON.parse(data);
  } catch {
    items = [];
  }

  if (!items.length) return null;

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