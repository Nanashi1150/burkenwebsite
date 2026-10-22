import type { Access, FieldAccess } from "payload"

export type AppRole = "customer" | "staff" | "admin" | "rider"

type RoleUser = {
  collection?: string
  role?: AppRole
}

export const isCMSAdmin = (user: RoleUser | null | undefined) =>
  user?.collection === "admins"

export const hasAppRole = (
  user: RoleUser | null | undefined,
  roles: AppRole[],
) => user?.collection === "users" && !!user.role && roles.includes(user.role)

export const staffOrAdmin: Access = ({ req }) =>
  isCMSAdmin(req.user) || hasAppRole(req.user, ["staff", "admin"])

export const adminOnly: Access = ({ req }) =>
  isCMSAdmin(req.user) || hasAppRole(req.user, ["admin"])

export const adminFieldAccess: FieldAccess = ({ req }) =>
  isCMSAdmin(req.user) || hasAppRole(req.user, ["admin"])
