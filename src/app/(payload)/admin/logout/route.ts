import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
export async function GET() {
  ;(await cookies()).delete('payload-token')
  return new NextResponse(null, { status: 303, headers: { Location: '/admin/login' } })
}
