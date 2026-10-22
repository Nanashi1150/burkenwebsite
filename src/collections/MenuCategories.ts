import type { CollectionConfig } from "payload"
import { staffOrAdmin } from "@/access/appRoles"
import { revalidateTag } from "next/cache"

export const MenuCategories: CollectionConfig = {
  slug: "menu-categories",
  access: {
    create: staffOrAdmin,
    delete: staffOrAdmin,
    read: () => true,
    update: staffOrAdmin,
  },
  admin: {
    group: "Restaurant",
    useAsTitle: "name",
  },
  hooks: {
    afterChange: [() => revalidateTag("burken-menu", "max")],
    afterDelete: [() => revalidateTag("burken-menu", "max")],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "label",
      type: "text",
      required: true,
    },
    {
      name: "sortOrder",
      type: "number",
      required: true,
      defaultValue: 0,
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
    },
  ],
}
