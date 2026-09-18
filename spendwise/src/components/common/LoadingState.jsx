export function LoadingState({ message = 'Loading SpendWise...' }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-teal-700 animate-spin" />
      </div>
      <p className="mt-4 text-base font-medium text-slate-700">{message}</p>
      <p className="mt-1 text-sm text-slate-500">Preparing your financial overview</p>
    </div>
  );
}
