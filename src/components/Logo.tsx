import Link from "next/link"

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      aria-label="Burken หน้าแรก"
      className={`inline-flex items-center gap-2 font-black tracking-[-0.06em] ${
        inverse ? "text-white" : "text-[var(--brand-red)]"
      }`}
      href="/"
    >
      <span
        aria-hidden="true"
        className={`grid size-10 place-items-center rounded-full border-4 text-lg ${
          inverse
            ? "border-white bg-white text-[var(--brand-red)]"
            : "border-[var(--brand-red)] bg-[var(--brand-cream)]"
        }`}
      >
        B
      </span>
      <span className="text-2xl">BURKEN</span>
    </Link>
  )
}
