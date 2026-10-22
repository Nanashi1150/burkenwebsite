import type { CollectionConfig } from "payload"
import { staffOrAdmin } from "@/access/appRoles"
import { revalidateTag } from "next/cache"

export const MenuItems: CollectionConfig = {
  slug: "menu-items",
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
      name: "description",
      type: "textarea",
      required: true,
    },
    {
      name: "price",
      type: "number",
      required: true,
      min: 0,
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "menu-categories",
      required: true,
    },
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      required: true,
    },
    {
      name: "badge",
      type: "select",
      options: [
        { label: "Best seller", value: "best-seller" },
        { label: "New", value: "new" },
        { label: "Hot", value: "hot" },
        { label: "Value", value: "value" },
      ],
    },
    {
      name: "spiceLevel",
      type: "select",
      defaultValue: "mild",
      options: [
        { label: "Mild", value: "mild" },
        { label: "Medium", value: "medium" },
        { label: "Hot", value: "hot" },
      ],
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "available",
      type: "checkbox",
      defaultValue: true,
    },
  ],
}
