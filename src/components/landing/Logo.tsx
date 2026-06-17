export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#home" className={`inline-flex items-baseline gap-0 font-display text-xl font-semibold tracking-tight ${className}`}>
      <span>KABSA CALL</span>
      <span className="text-lime">.ai</span>
    </a>
  );
}
