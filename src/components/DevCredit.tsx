export function DevCredit({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 text-xs ${className}`}>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 shadow-card">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <rect width="24" height="24" rx="6" fill="#0f9d7a" />
          <path d="M7 6h5.2a3 3 0 0 1 1.6 5.5A3.2 3.2 0 0 1 12.8 18H7V6Zm2.2 2v2.6h2.8a1.3 1.3 0 0 0 0-2.6H9.2Zm0 4.6V16h3.1a1.7 1.7 0 0 0 0-3.4H9.2Z" fill="#fff" />
        </svg>
        <span className="font-semibold text-[11px] text-foreground tracking-tight">BR Intelligence</span>
      </div>
      <span className="opacity-80">
        Desenvolvido por <b>Brunno Almeida</b>
      </span>
    </div>
  );
}
