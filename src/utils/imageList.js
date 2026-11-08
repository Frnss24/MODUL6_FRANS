// ---------------------------------------------------------------------------
// imageList.js — multi-image support without a DB schema change.
// The `image_url` text column stores either a single URL (legacy) or a JSON
// array string when a catalog has more than one image. First item = cover.
// ---------------------------------------------------------------------------

export const parseImages = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value !== 'string' || !value) return []
  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      const arr = JSON.parse(trimmed)
      if (Array.isArray(arr)) return arr.filter((u) => typeof u === 'string' && u)
    } catch {
      /* not JSON — treat as a plain URL */
    }
  }
  return [value]
}

export const encodeImages = (list) => {
  const clean = (list || []).filter(Boolean)
  if (clean.length === 0) return null
  return clean.length === 1 ? clean[0] : JSON.stringify(clean)
}
