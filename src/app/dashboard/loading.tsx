export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-9 w-64 bg-ink-200 rounded-lg" />
        <div className="mt-2 h-4 w-80 bg-ink-100 rounded" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-20 bg-ink-100 rounded" />
            <div className="mt-2 h-8 w-24 bg-ink-200 rounded" />
            <div className="mt-1 h-3 w-32 bg-ink-100 rounded" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5">
            <div className="h-5 w-40 bg-ink-200 rounded" />
            <div className="mt-4 space-y-2">
              <div className="h-3 w-full bg-ink-100 rounded" />
              <div className="h-3 w-4/5 bg-ink-100 rounded" />
              <div className="h-3 w-3/5 bg-ink-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
