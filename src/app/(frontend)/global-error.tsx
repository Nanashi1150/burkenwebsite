"use client"

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="th">
      <body className="grid min-h-screen place-items-center bg-[#fff8f0] p-6 text-[#241916]">
        <main className="max-w-lg text-center">
          <p className="text-sm font-black tracking-[0.2em] text-[#c92822]">
            BURKEN
          </p>
          <h1 className="mt-3 text-4xl font-black">ครัวสะดุดนิดหน่อย</h1>
          <p className="mt-3 text-sm leading-6 opacity-60">
            ระบบกำลังพักหายใจ ลองโหลดข้อมูลอีกครั้งได้เลย
          </p>
          <button
            className="mt-7 min-h-12 rounded-full bg-[#c92822] px-6 font-black text-white"
            onClick={() => unstable_retry()}
            type="button"
          >
            ลองอีกครั้ง
          </button>
        </main>
      </body>
    </html>
  )
}
