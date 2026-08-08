type ParentNoteProps = {
  children: React.ReactNode;
};

export default function ParentNote({ children }: ParentNoteProps) {
  return (
    <div className="my-6 rounded-xl border-l-4 border-blue-500 bg-blue-50 p-4">
      <div className="mb-1 text-sm font-semibold text-blue-800">
        Football Parent note
      </div>
      <div className="text-gray-700 leading-8">{children}</div>
    </div>
  );
}
