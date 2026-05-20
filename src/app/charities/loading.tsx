export default function CharitiesLoading() {
  return (
    <main className="container-wide py-16 md:py-20 animate-pulse">
      <div className="max-w-2xl">
        <div className="h-5 w-24 bg-ink-100 rounded-full" />
        <div className="mt-4 h-12 w-3/4 bg-ink-200 rounded-lg" />
        <div className="mt-4 h-4 w-2/3 bg-ink-100 rounded" />
      </div>
      <div className="mt-8 h-11 w-full max-w-md bg-ink-100 rounded-xl" />
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="h-48 bg-ink-200" />
            <div className="p-5">
              <div className="h-4 w-3/5 bg-ink-200 rounded" />
              <div className="mt-2 h-3 w-4/5 bg-ink-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
