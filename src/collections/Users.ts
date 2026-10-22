import type { Access, CollectionConfig } from "payload"
import {
  adminFieldAccess,
  adminOnly,
  hasAppRole,
  isCMSAdmin,
} from "@/access/appRoles"

const readUsers: Access = ({ req }) => {
  if (isCMSAdmin(req.user) || hasAppRole(req.user, ["staff", "admin"]))
    return true
  if (req.user?.collection === "users") return { id: { equals: req.user.id } }
  return false
}

const updateUsers: Access = ({ req }) => {
  if (isCMSAdmin(req.user) || hasAppRole(req.user, ["admin"])) return true
  if (req.user?.collection === "users") return { id: { equals: req.user.id } }
  return false
}

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  endpoints: [{
    path: "/first-register",
    method: "post",
    handler: () => Response.json({ error: "Use normal signup." }, { status: 403 }),
  }],
  access: {
    create: () => true,
    delete: adminOnly,
    read: readUsers,
    update: updateUsers,
  },
  admin: {
    group: "Restaurant",
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "phone",
      type: "text",
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "customer",
      options: [
        { label: "Customer", value: "customer" },
        { label: "Staff", value: "staff" },
        { label: "Administrator", value: "admin" },
        { label: "Rider", value: "rider" },
      ],
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
    },
    {
      name: "points",
      type: "number",
      defaultValue: 0,
      min: 0,
      access: {
        create: adminFieldAccess,
        update: adminFieldAccess,
      },
    },
  ],
}
