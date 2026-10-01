export default function Input({ label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input className="rounded border px-3 py-2" {...props} />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
