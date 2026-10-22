import type { CollectionConfig } from "payload"
import { createFolderField, createTagField } from "payload"
import { staffOrAdmin } from "@/access/appRoles"
import { revalidateTag } from "next/cache"
import path from "node:path"

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    create: staffOrAdmin,
    delete: staffOrAdmin,
    read: () => true,
    update: staffOrAdmin,
  },
  hooks: {
    afterChange: [() => revalidateTag("burken-menu", "max")],
    afterDelete: [() => revalidateTag("burken-menu", "max")],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
    },
    createFolderField({ relationTo: "folders" }),
    createTagField({ relationTo: "tags" }),
  ],
  upload: { staticDir: path.resolve(process.cwd(), "media"), mimeTypes: ["image/*"] },
}
