import Link from "next/link"

/**
 * Custom not-found page for the frontend.
 * This renders when `notFound()` is called from any page in the (frontend) route group.
 *
 * Customize this component to match your app's design and provide helpful navigation.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center bg-[var(--surface)] px-8 py-16 text-center">
      <p className="text-sm font-black tracking-[0.2em] text-[var(--brand-red)]">
        404
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">เมนูนี้หาไม่เจอ</h1>
      <p className="mt-4 text-black/55">
        หน้าที่คุณกำลังมองหาอาจถูกย้าย หรือไม่มีอยู่ในระบบ Burken
      </p>
      <Link
        className="mt-7 inline-flex min-h-12 items-center rounded-full bg-[var(--brand-red)] px-6 font-black text-white"
        href="/"
      >
        กลับหน้าร้าน
      </Link>
    </main>
  )
}
