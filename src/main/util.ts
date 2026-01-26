import { URL } from 'url'
import os from 'os'
import path from 'path'

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212
    const url = new URL(`http://localhost:${port}`)
    url.pathname = htmlFileName
    return url.href
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`
}

// Returns an absolute normalized path.
export function normalizePath(relativePath: string) {
  let normalizedPath = relativePath
  normalizedPath = normalizedPath.replace('~', os.homedir)
  normalizedPath = normalizedPath.replace('$PWD', process.cwd())
  normalizedPath = normalizedPath.replace('$HOME', os.homedir())
  // Replace all environment variables like $VAR or ${VAR}
  normalizedPath = normalizedPath.replace(/\$(\w+)|\$\{(\w+)\}/g, (_, var1, var2) => {
    const varName = var1 || var2
    return process.env[varName] || ''
  })
  return path.normalize(normalizedPath)
}
