export default function StudioLoading() {
  return (
    <div
      className="flex h-dvh min-h-0 animate-pulse flex-col overflow-hidden"
      aria-busy="true"
      aria-label="Carregando o estúdio de planos"
    >
      <div className="flex h-20 shrink-0 items-center border-b border-border-neutral px-6">
        <div className="h-10 w-10 rounded-xl bg-surface-neutral" />
        <div className="ml-3 space-y-2">
          <div className="h-4 w-40 rounded bg-surface-neutral" />
          <div className="h-3 w-28 rounded bg-surface-neutral" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="hidden w-64 shrink-0 border-r border-border-neutral p-4 lg:block">
          <div className="mb-4 h-10 rounded-xl bg-surface-neutral" />
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="h-20 rounded-xl bg-surface-neutral" />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-6 lg:p-10">
          <div className="mx-auto max-w-4xl space-y-5">
            <div className="h-9 w-64 rounded-lg bg-surface-neutral" />
            <div className="h-16 rounded-2xl bg-surface-neutral" />
            <div className="h-[28rem] rounded-2xl border border-border-neutral bg-card-bg" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        Abrindo o estúdio de planos…
      </span>
    </div>
  );
}
