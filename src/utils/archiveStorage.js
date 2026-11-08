// ---------------------------------------------------------------------------
// archiveStorage.js — soft delete (archive) for catalogs.
// Archived catalogs are hidden from the catalog but kept (with a snapshot) so
// they can be restored or permanently deleted from the Profile > Archive.
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react'

const KEY = 'bb_archived_guns'
const EVENT = 'bb-archive-change'

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

const write = (map) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* storage full / unavailable */
  }
  window.dispatchEvent(new Event(EVENT))
}

export const getArchived = () => Object.values(read())
export const isArchived = (id) => Boolean(read()[String(id)])

export const archiveGun = (gun) => {
  const map = read()
  map[String(gun.id)] = { gun, archivedAt: new Date().toISOString() }
  write(map)
}

export const restoreGun = (id) => {
  const map = read()
  delete map[String(id)]
  write(map)
}

// Removes the local archive entry only (caller deletes the record on the server).
export const removeArchived = restoreGun

export function useArchive() {
  const [items, setItems] = useState(getArchived)
  useEffect(() => {
    const sync = () => setItems(getArchived())
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])
  const ids = new Set(items.map((i) => String(i.gun.id)))
  return { items, ids }
}
