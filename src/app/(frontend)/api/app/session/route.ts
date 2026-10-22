import { appAuth } from '@/lib/app-auth'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0, must-revalidate', Vary: 'Cookie' }
export async function GET() {
  try {
    const user = await appAuth.currentUser()
    return Response.json(user ? { authenticated: true, user: { id: user.id, name: user.name, role: user.role } }
      : { authenticated: false, user: null }, { headers })
  } catch {
    return Response.json({ authenticated: false, user: null, error: 'Session verification unavailable' }, { status: 503, headers })
  }
}
