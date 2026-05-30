import crypto from "crypto"
import fs from "fs"
import path from "path"

const root = process.cwd()
const manifestPath = path.join(root, "public", "build", "manifest.json")
const swPath = path.join(root, "public", "firebase-messaging-sw.js")
const versionJsonPath = path.join(root, "public", "pwa", "version.json")

let version = process.env.APP_VERSION || process.env.VITE_APP_VERSION || ""

if (!version && fs.existsSync(manifestPath)) {
  version = crypto
    .createHash("md5")
    .update(fs.readFileSync(manifestPath))
    .digest("hex")
    .slice(0, 16)
}

if (!version) {
  version = "dev"
}

if (fs.existsSync(swPath)) {
  let sw = fs.readFileSync(swPath, "utf8")
  sw = sw.replace(/const CACHE_NAME = "pwa-cache-[^"]+"/, `const CACHE_NAME = "pwa-cache-${version}"`)
  sw = sw.replace(/\/\/ @version .+\n/, "")
  sw = `// @version ${version}\n${sw}`
  fs.writeFileSync(swPath, sw)
}

fs.mkdirSync(path.dirname(versionJsonPath), { recursive: true })
fs.writeFileSync(
  versionJsonPath,
  JSON.stringify({ version, builtAt: new Date().toISOString() }, null, 2) + "\n",
)

console.log(`[PWA] Stamped version ${version}`)
