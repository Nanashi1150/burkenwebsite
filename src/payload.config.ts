import path from "path"
import { buildConfig } from "payload"
import { sqliteAdapter } from "@payloadcms/db-sqlite"
import { lexicalEditor } from "@payloadcms/richtext-lexical"
import { sharpTransformer } from "@payloadcms/transformer-sharp"
import { mkdirSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { en as adminLanguage } from "@payloadcms/translations/languages/en"
import { fileURLToPath } from "url"
import { Admins } from "./collections/Admins"
import { Media } from "./collections/Media"
import { Folders } from "./collections/Folders"
import { Tags } from "./collections/Tags"
import { Posts } from "./collections/Posts"
import { Users } from "./collections/Users"
import { MenuCategories } from "./collections/MenuCategories"
import { MenuItems } from "./collections/MenuItems"
import { Orders } from "./collections/Orders"
import { OrderCounters } from "./collections/OrderCounters"
import { DeliveryPhotos } from "./collections/DeliveryPhotos"

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const dataDir = path.resolve(dirname, "../data")
mkdirSync(dataDir, { recursive: true })
const secret = process.env.PAYLOAD_SECRET
if (!secret) throw new Error("Run npm run setup to configure the local website first.")

export default buildConfig({
  secret,
  editor: lexicalEditor(),
  upload: { transformers: [sharpTransformer({ collections: { media: {} } })] },
  db: sqliteAdapter({
    // Apply schema changes only through the backed-up local upgrade command.
    push: process.env.PAYLOAD_SCHEMA_PUSH === "1",
    client: { url: process.env.DATABASE_URL || pathToFileURL(path.join(dataDir, "burken.db")).href },
    idType: "uuid",
    transactionOptions: {},
    busyTimeout: 5000,
  }),
  admin: {
    user: Admins.slug,
    constrainWidth: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  i18n: {
    fallbackLanguage: "en",
    supportedLanguages: { en: adminLanguage },
  },
  collections: [
    Admins,
    Users,
    Media,
    Folders,
    Tags,
    Posts,
    MenuCategories,
    MenuItems,
    Orders,
    OrderCounters,
    DeliveryPhotos,
  ],
  localization: {
    locales: [{ code: "en", label: "English" }],
    fallback: true,
    defaultLocale: "en",
  },
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
})
