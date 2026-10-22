import { Storefront } from "@/components/Storefront"
import { SiteHeader } from "@/components/SiteHeader"
import { SiteFooter } from "@/components/SiteFooter"
import { getStoreMenu } from "@/lib/burken-data"

export default async function HomePage() {
  const menu = await getStoreMenu()

  return (
    <>
      <SiteHeader />
      <Storefront categories={menu.categories} items={menu.items} />
      <SiteFooter />
    </>
  )
}
