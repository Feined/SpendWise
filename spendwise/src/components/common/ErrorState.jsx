export function ErrorState({ error, onRetry, onReset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-8 text-center">
      <div className="w-full max-w-md rounded-xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {error || 'Unable to access or parse SpendWise application data.'}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-5 text-sm font-medium text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              Try Again
            </button>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              Reset to Defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
