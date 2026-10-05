export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Ładowanie strony"
    >
      <section className="border-b border-[#eceef2] bg-white">
        <div className="container py-16 md:py-20">
          <div className="max-w-3xl animate-pulse">
            <div className="h-3 w-28 rounded-full bg-[#eef0f3]" />

            <div className="mt-6 h-14 max-w-2xl rounded-[14px] bg-[#eef0f3] md:h-20" />

            <div className="mt-4 h-14 max-w-xl rounded-[12px] bg-[#f3f4f6]" />
          </div>
        </div>
      </section>

      <section className="container py-10 md:py-14">
        <div className="grid animate-pulse gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({
            length:
              6,
          }).map(
            (_, index) => (
              <div
                key={
                  index
                }
                className="h-[260px] rounded-[18px] border border-[#eceef2] bg-white p-5"
              >
                <div className="h-10 w-10 rounded-[10px] bg-[#eef0f3]" />

                <div className="mt-6 h-5 w-2/3 rounded bg-[#eef0f3]" />

                <div className="mt-4 h-3 w-full rounded bg-[#f3f4f6]" />

                <div className="mt-2 h-3 w-5/6 rounded bg-[#f3f4f6]" />

                <div className="mt-10 h-10 w-full rounded-[10px] bg-[#eef0f3]" />
              </div>
            ),
          )}
        </div>
      </section>
    </main>
  );
}