import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import {
  getCachedQuery,
  setCachedQuery,
  invalidateQueryCache,
} from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — fetch the paginated / filtered product list from the API
// with dual-layer Query Caching (in-memory Map + localStorage TTL).
//
// Returns { guns, loading, error, pagination, fromCache, refetch }.
// ---------------------------------------------------------------------------

export function useGuns(params = {}) {
  const paramKey = JSON.stringify(params)
  const cacheKey = `guns:${paramKey}`

  const initialCache = getCachedQuery(cacheKey)
  const [guns, setGuns] = useState(() => initialCache?.data?.items || [])
  const [loading, setLoading] = useState(() => !initialCache || initialCache.isStale)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(() => initialCache?.data?.pagination || null)
  const [fromCache, setFromCache] = useState(() => Boolean(initialCache && !initialCache.isStale))

  const fetchGuns = useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) {
          invalidateQueryCache(cacheKey)
        } else {
          const cached = getCachedQuery(cacheKey)
          if (cached && !cached.isStale && Array.isArray(cached.data?.items)) {
            setGuns(cached.data.items)
            setPagination(cached.data.pagination || null)
            setFromCache(true)
            setError(null)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        setError(null)
        setFromCache(false)

        const response = await gunService.getGuns(params)

        if (response.success) {
          const items = response.data || []
          const pageMeta = response.pagination || null
          setGuns(items)
          setPagination(pageMeta)
          setCachedQuery(cacheKey, { items, pagination: pageMeta })
        } else {
          setError(response.message || 'Failed to fetch products.')
        }
      } catch (err) {
        // If offline/failed but stale cache exists, serve stale cache gracefully
        const staleCache = getCachedQuery(cacheKey)
        if (staleCache?.data?.items?.length) {
          setGuns(staleCache.data.items)
          setPagination(staleCache.data.pagination || null)
          setFromCache(true)
          setError(null)
        } else {
          setError(err.message || 'An error occurred while fetching products.')
          setGuns([])
        }
      } finally {
        setLoading(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cacheKey],
  )

  useEffect(() => {
    fetchGuns(false)
  }, [fetchGuns])

  return {
    guns,
    loading,
    error,
    pagination,
    fromCache,
    refetch: () => fetchGuns(true),
  }
}

// ---------------------------------------------------------------------------
// useGunById — fetch a single product by its ID with Query Caching.
//
// Returns { gun, loading, error, fromCache, refetch }.
// ---------------------------------------------------------------------------

export function useGunById(id) {
  const cacheKey = id ? `gun:${id}` : ''
  const initialCache = cacheKey ? getCachedQuery(cacheKey) : null

  const [gun, setGun] = useState(() => initialCache?.data || null)
  const [loading, setLoading] = useState(() => Boolean(id) && (!initialCache || initialCache.isStale))
  const [error, setError] = useState(null)
  const [fromCache, setFromCache] = useState(() => Boolean(initialCache && !initialCache.isStale))

  const fetchGun = useCallback(
    async (forceRefresh = false) => {
      if (!id) {
        setLoading(false)
        return
      }
      try {
        if (forceRefresh) {
          invalidateQueryCache(cacheKey)
        } else {
          const cached = getCachedQuery(cacheKey)
          if (cached && !cached.isStale && cached.data) {
            setGun(cached.data)
            setFromCache(true)
            setError(null)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        setError(null)
        setFromCache(false)

        const response = await gunService.getGunById(id)

        if (response.success) {
          setGun(response.data)
          setCachedQuery(cacheKey, response.data)
        } else {
          setError(response.message || 'Product not found.')
        }
      } catch (err) {
        setError(err.message || 'Failed to load product details.')
        setGun(null)
      } finally {
        setLoading(false)
      }
    },
    [id, cacheKey],
  )

  useEffect(() => {
    fetchGun(false)
  }, [fetchGun])

  return {
    gun,
    loading,
    error,
    fromCache,
    refetch: () => fetchGun(true),
  }
}
