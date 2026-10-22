import "server-only"

import { unstable_cache } from "next/cache"
import type { Media, MenuCategory, MenuItem } from "@/payload-types"
import { getPayloadClient } from "@/lib/payload"

export type StoreMenuItem = Pick<MenuItem, "id" | "name" | "description" | "price" | "badge" | "spiceLevel" | "featured" | "available"> & {
  category: Pick<MenuCategory, "id" | "name" | "label">
  image: Pick<Media, "url" | "alt" | "width" | "height">
}

export const getStoreMenu = unstable_cache(async () => {
  const payload = await getPayloadClient()
  const [categoriesResult, itemsResult] = await Promise.all([
    payload.find({
      collection: "menu-categories",
      where: { active: { equals: true } },
      sort: "sortOrder",
      limit: 20,
      depth: 0,
      overrideAccess: false,
    }),
    payload.find({
      collection: "menu-items",
      where: { available: { equals: true } },
      sort: "-featured",
      limit: 50,
      depth: 1,
      overrideAccess: false,
    }),
  ])

  const categories = categoriesResult.docs.map(({ id, name, label }) => ({
    id,
    name,
    label,
  }))

  const items = itemsResult.docs.flatMap((item) => {
    if (
      typeof item.category === "string" ||
      typeof item.image === "string" ||
      !item.image.url
    ) {
      return []
    }

    return [
      {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        badge: item.badge,
        spiceLevel: item.spiceLevel,
        featured: item.featured,
        available: item.available,
        category: {
          id: item.category.id,
          name: item.category.name,
          label: item.category.label,
        },
        image: {
          url: item.image.url,
          alt: item.image.alt,
          width: item.image.width,
          height: item.image.height,
        },
      } satisfies StoreMenuItem,
    ]
  })

  return { categories, items }
}, ["burken-menu"], {
  revalidate: false,
  tags: ["burken-menu"],
})
