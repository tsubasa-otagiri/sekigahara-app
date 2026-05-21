export default function PlaceholderView({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-4xl mb-3">🚧</p>
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs mt-1">次フェーズで実装予定</p>
    </div>
  );
}
