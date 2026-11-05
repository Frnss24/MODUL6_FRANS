// ---------------------------------------------------------------------------
// helpers.js — pure utility functions used across the application.
// ---------------------------------------------------------------------------

/**
 * Format a numeric price as "$1,234".
 */
export const formatPrice = (price) => {
  const num = Number(price)
  if (Number.isNaN(num)) return '$0'
  return `$${num.toLocaleString()}`
}

/**
 * Client-side text search — case-insensitive match against name and
 * description.
 */
export const matchesSearch = (item, query) => {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    (item.name || '').toLowerCase().includes(q) ||
    (item.description || '').toLowerCase().includes(q)
  )
}

/**
 * Client-side category / type filter.
 * `category` of '' or 'All' matches everything.
 */
export const matchesCategory = (item, category) => {
  if (!category || category === 'All') return true
  // Support both the local `type` field and the backend `category` field
  return (
    (item.type || '').toLowerCase() === category.toLowerCase() ||
    (item.category || '').toLowerCase() === category.toLowerCase()
  )
}

/**
 * Sort an array of items by a given key.
 * @param {'name'|'price'} key
 * @param {'asc'|'desc'}   order
 */
export const sortItems = (items, key = 'name', order = 'asc') => {
  const sorted = [...items].sort((a, b) => {
    if (key === 'price') return (Number(a.price) || 0) - (Number(b.price) || 0)
    return String(a[key] || '').localeCompare(String(b[key] || ''))
  })
  return order === 'desc' ? sorted.reverse() : sorted
}

/**
 * Truncate a string to `max` characters, adding "…" when clipped.
 */
export const truncate = (str, max = 100) => {
  if (!str || str.length <= max) return str || ''
  return str.slice(0, max).trimEnd() + '…'
}

/**
 * Extract unique category values from a list of items.
 * Returns ['All', ...categories].
 */
export const extractCategories = (items) => {
  const set = new Set()
  items.forEach((i) => {
    const cat = i.type || i.category
    if (cat) set.add(cat)
  })
  return ['All', ...Array.from(set).sort()]
}

/**
 * Compute average rating from an array of review objects that each have a
 * numeric `rating` property.  Returns 0 when empty.
 */
export const averageRating = (reviews) => {
  if (!reviews || reviews.length === 0) return 0
  const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return Math.round((sum / reviews.length) * 10) / 10
}

/**
 * Slice an array of items for client/hybrid pagination and return metadata.
 * @param {Array}  items
 * @param {number} page     — 1-based page index
 * @param {number} pageSize — items per page
 */
export const paginateItems = (items = [], page = 1, pageSize = 3) => {
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages)
  const startIndex = (safePage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)
  const paginatedData = items.slice(startIndex, endIndex)

  return {
    items: paginatedData,
    currentPage: safePage,
    pageSize,
    totalItems,
    totalPages,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex,
    hasPrevPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  }
}

/**
 * Build a shareable deep-link URL for a specific catalog item.
 * Example: https://your-app.vercel.app/?gun=12
 * @param {Object} gun
 * @returns {string}
 */
export const buildGunShareUrl = (gun) => {
  if (typeof window === 'undefined' || !gun) return ''
  const identifier = gun.id ?? gun.name ?? ''
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set('gun', String(identifier))
  return url.toString()
}

/**
 * Read `?gun=<id>` query parameter from current browser URL.
 * @returns {string|null}
 */
export const getGunQueryParam = () => {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('gun')
}

/**
 * Update or clear `?gun=<id>` query parameter in browser address bar
 * without triggering a full page reload.
 * @param {string|number|null} gunIdentifier
 */
export const setGunQueryParam = (gunIdentifier) => {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (gunIdentifier !== null && gunIdentifier !== undefined && gunIdentifier !== '') {
    url.searchParams.set('gun', String(gunIdentifier))
  } else {
    url.searchParams.delete('gun')
  }
  window.history.replaceState({}, '', url.toString())
}
