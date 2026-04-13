const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")

function findCachedChromeExecutable() {
  const chromeCacheDir = path.join(os.homedir(), ".cache", "puppeteer", "chrome")

  if (!fs.existsSync(chromeCacheDir)) {
    return undefined
  }

  const versions = fs
    .readdirSync(chromeCacheDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name.startsWith("linux-"))
    .map(entry => entry.name)
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))

  for (const version of versions) {
    const executablePath = path.join(chromeCacheDir, version, "chrome-linux64", "chrome")

    if (fs.existsSync(executablePath)) {
      return executablePath
    }
  }

  return undefined
}

module.exports = {
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || findCachedChromeExecutable(),
}
