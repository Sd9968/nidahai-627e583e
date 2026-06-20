export function Logo({ className = "" }: { className?: string }) {
  return (
    <a href="#home" className={`inline-flex flex-col font-display font-semibold tracking-tight leading-[0.85] ${className}`}>
      <span className="text-[1.35em]">Yaran</span>
      <span className="inline-flex items-baseline gap-0 text-base">
        <span>Arabia</span>
        <span className="text-lime">.ai</span>
      </span>
    </a>
  );
}
