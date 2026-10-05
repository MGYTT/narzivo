export default function AdminLoading() {
  return (
    <main className="min-h-screen bg-[#fafbfc]">
      <div className="container py-10">
        <div className="grid animate-pulse gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden h-[420px] rounded-[18px] border border-[#e7e9ee] bg-white lg:block" />

          <section>
            <div className="h-4 w-32 rounded bg-[#e9ebef]" />

            <div className="mt-4 h-10 w-72 max-w-full rounded-[10px] bg-[#e9ebef]" />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({
                length:
                  8,
              }).map(
                (
                  _,
                  index,
                ) => (
                  <div
                    key={
                      index
                    }
                    className="h-[135px] rounded-[18px] border border-[#e7e9ee] bg-white"
                  />
                ),
              )}
            </div>

            <div className="mt-7 h-[360px] rounded-[18px] border border-[#e7e9ee] bg-white" />
          </section>
        </div>
      </div>
    </main>
  );
}