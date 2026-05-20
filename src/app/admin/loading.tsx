export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-48 bg-ink-200 rounded-lg" />
        <div className="mt-2 h-4 w-72 bg-ink-100 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-24 bg-ink-100 rounded" />
            <div className="mt-2 h-8 w-20 bg-ink-200 rounded" />
          </div>
        ))}
      </div>

      <div className="card p-6">
        <div className="h-5 w-32 bg-ink-200 rounded" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <div className="h-4 w-1/3 bg-ink-100 rounded" />
              <div className="h-4 w-1/4 bg-ink-100 rounded" />
              <div className="h-4 w-1/4 bg-ink-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
