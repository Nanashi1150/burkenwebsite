import "server-only"

import { cookies } from "next/headers"
import type { User } from "@/payload-types"
import { getPayloadClient } from "@/lib/payload"
import { localWrite } from "@/lib/local-write"
import { createPayloadRequest, logoutOperation } from "payload"

const APP_SESSION_COOKIE = "app-session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

export function createAppAuth(collection: "users") {
  return {
    async currentUser(): Promise<User | null> {
      const token = (await cookies()).get(APP_SESSION_COOKIE)?.value
      if (!token) return null

      const payload = await getPayloadClient()
      const authHeaders = new Headers({ Authorization: `JWT ${token}`, DisableAutologin: "true" })
      const { user } = await payload.auth({ headers: authHeaders })

      if (!user || user.collection !== collection) return null
      return user
    },

    async login(email: string, password: string): Promise<User> {
      const payload = await getPayloadClient()
      const result = await localWrite(() => payload.login({
        collection,
        data: { email, password },
      }))

      if (!result.token || !result.user || result.user.collection !== collection) {
        throw new Error("ไม่สามารถเข้าสู่ระบบได้")
      }
      ;(await cookies()).set(APP_SESSION_COOKIE, result.token, {
        httpOnly: true,
        maxAge: SESSION_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })

      return result.user
    },

    async logout() {
      const cookieStore = await cookies()
      const token = cookieStore.get(APP_SESSION_COOKIE)?.value
      try {
        if (token) {
          const payload = await getPayloadClient()
          const { user } = await payload.auth({ headers: new Headers({ Authorization: `JWT ${token}`, DisableAutologin: "true" }) })
          if (user?.collection === collection) {
            await localWrite(async () => {
              const req = await createPayloadRequest({ payload, user })
              await logoutOperation({ collection: payload.collections[collection], req })
            })
          }
        }
      } finally {
      ;(await cookies()).set(APP_SESSION_COOKIE, "", {
        httpOnly: true,
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
      }
    },
  }
}

export const appAuth = createAppAuth("users")
