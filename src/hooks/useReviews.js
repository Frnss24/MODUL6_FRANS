import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import {
  getCachedQuery,
  setCachedQuery,
  invalidateQueryCache,
} from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useReviews — fetch reviews for a specific product with Query Caching.
// ---------------------------------------------------------------------------

export function useReviews(gunId) {
  const cacheKey = gunId ? `reviews:${gunId}` : ''
  const initialCache = cacheKey ? getCachedQuery(cacheKey) : null

  const [reviews, setReviews] = useState(() => initialCache?.data || [])
  const [loading, setLoading] = useState(
    () => Boolean(gunId) && (!initialCache || initialCache.isStale),
  )
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(
    async (forceRefresh = false) => {
      if (!gunId) {
        setLoading(false)
        return
      }
      try {
        if (forceRefresh) {
          invalidateQueryCache(cacheKey)
        } else {
          const cached = getCachedQuery(cacheKey)
          if (cached && !cached.isStale && Array.isArray(cached.data)) {
            setReviews(cached.data)
            setError(null)
            setLoading(false)
            return
          }
        }

        setLoading(true)
        setError(null)

        const response = await reviewService.getReviews(gunId)

        if (response.success) {
          const list = response.data || []
          setReviews(list)
          setCachedQuery(cacheKey, list)
        } else {
          setError(response.message || 'Failed to fetch reviews.')
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching reviews.')
        setReviews([])
      } finally {
        setLoading(false)
      }
    },
    [gunId, cacheKey],
  )

  useEffect(() => {
    fetchReviews(false)
  }, [fetchReviews])

  return {
    reviews,
    loading,
    error,
    refetch: () => fetchReviews(true),
  }
}

// ---------------------------------------------------------------------------
// useCreateReview — submit a new review for a product and invalidate cache.
// ---------------------------------------------------------------------------

export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const response = await reviewService.createReview(gunId, reviewData)

      if (response.success) {
        invalidateQueryCache(`reviews:${gunId}`)
        setSuccess(true)
        return response.data
      } else {
        setError(response.message || 'Failed to submit review.')
        return null
      }
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}
