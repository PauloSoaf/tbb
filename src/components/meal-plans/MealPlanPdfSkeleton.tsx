// Loading state shown INSIDE the paper sheet while the plan/template data
// streams in via Suspense — never a blank tab, never a full-page spinner.
export function MealPlanPdfSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="text-center mb-10 pb-6 border-b-2 border-border-neutral/60">
        <div className="mx-auto mb-3 h-4 w-24 rounded-full bg-gray-200" />
        <div className="mx-auto mb-2 h-8 w-72 rounded-lg bg-gray-200" />
        <div className="mx-auto mb-4 h-5 w-48 rounded-lg bg-gray-100" />
        <div className="flex flex-wrap justify-center gap-6">
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-4 w-32 rounded bg-gray-100" />
          <div className="h-4 w-32 rounded bg-gray-100" />
        </div>
      </div>

      <div className="space-y-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border-neutral/60 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-border-neutral/60 flex items-center justify-between">
              <div className="h-5 w-40 rounded bg-gray-200" />
              <div className="h-6 w-16 rounded-full bg-gray-200" />
            </div>
            <div className="divide-y divide-border-neutral/40">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center justify-between px-4 py-3">
                  <div className="h-4 w-48 rounded bg-gray-100" />
                  <div className="h-4 w-16 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
