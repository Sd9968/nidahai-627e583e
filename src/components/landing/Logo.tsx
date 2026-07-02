export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#home" className={`inline-flex items-baseline gap-0 font-display text-xl font-semibold tracking-tight ${className}`}>
      <span>Nidah</span>
      <span className="text-pop">AI</span>
    </a>
  );
}
