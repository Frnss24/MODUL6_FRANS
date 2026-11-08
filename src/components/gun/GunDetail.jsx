import { useState } from 'react'
import { ArrowLeft, Star, Send, Loader, Pencil, Trash2, ThumbsUp, ThumbsDown, Archive } from 'lucide-react'
import FavoriteButton from '../common/FavoriteButton'
import ShareButton from '../common/ShareButton'
import LazyImage from '../common/LazyImage'
import { useReviews, useCreateReview } from '../../hooks/useReviews'
import { getUserIdentifier } from '../../services/userService'
import { formatPrice, averageRating } from '../../utils/helpers'
import reviewService from '../../services/reviewService'
import { invalidateQueryCache } from '../../utils/queryCache'
import { getVotes, toggleVote } from '../../utils/reviewVotes'

/**
 * Full-screen product detail view.
 *
 * @param {Object}   props
 * @param {Object}   props.gun       — product data
 * @param {Function} props.onBack    — return to catalog
 * @param {Function} [props.onEdit]  — navigate to edit page
 * @param {Function} [props.onDelete]— trigger delete flow
 */
export default function GunDetail({ gun, onBack, onEdit, onDelete, onArchive }) {
  const gallery = gun.images && gun.images.length ? gun.images : [gun.image_url || gun.image || '/guns/pistol.svg']
  const [activeImg, setActiveImg] = useState(0)
  const imgSrc = gallery[Math.min(activeImg, gallery.length - 1)]
  const category = gun.type || gun.category || '—'
  const caliber = gun.caliber || gun.difficulty || ''
  const price = gun.price ?? gun.cook_time ?? 0

  // Reviews
  const { reviews, loading: reviewsLoading, refetch: refetchReviews } = useReviews(gun.id)
  const { createReview, loading: submitting } = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')

  // Own-review edit / delete + like/dislike on others' reviews
  const myId = getUserIdentifier()
  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')
  const [votes, setVotes] = useState(getVotes)
  const [busyId, setBusyId] = useState(null)

  const startEdit = (rev) => {
    setEditingId(rev.id)
    setEditRating(rev.rating)
    setEditComment(rev.comment || '')
  }

  const saveEdit = async (rev) => {
    setBusyId(rev.id)
    try {
      await reviewService.updateReview(rev.id, { rating: editRating, comment: editComment.trim() })
      invalidateQueryCache(`reviews:${gun.id}`)
      setEditingId(null)
      await refetchReviews()
    } catch (err) {
      setReviewError(err.message || 'Could not update review.')
    } finally {
      setBusyId(null)
    }
  }

  const removeReview = async (rev) => {
    if (!window.confirm('Delete this review?')) return
    setBusyId(rev.id)
    try {
      await reviewService.deleteReview(rev.id)
      invalidateQueryCache(`reviews:${gun.id}`)
      await refetchReviews()
    } catch (err) {
      setReviewError(err.message || 'Could not delete review.')
    } finally {
      setBusyId(null)
    }
  }

  const avgRating = gun.average_rating || averageRating(reviews)
  const reviewCount = gun.review_count ?? reviews.length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    setReviewError('')
    setReviewSuccess('')

    if (rating < 1 || rating > 5) {
      setReviewError('Rating must be between 1 and 5.')
      return
    }

    const result = await createReview(gun.id, {
      user_identifier: getUserIdentifier(),
      rating,
      comment: comment.trim(),
    })

    if (result) {
      setReviewSuccess('Review submitted!')
      setComment('')
      setRating(5)
      refetchReviews()
    } else {
      setReviewError('Could not submit review. The server may be unavailable.')
    }
  }

  return (
    <div className="detail">
      {/* Back button */}
      <button type="button" className="detail-back" onClick={onBack}>
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero */}
      <div className="detail-hero">
        <div className="detail-gallery">
          <LazyImage key={imgSrc.slice(-40)} className="detail-img" src={imgSrc} alt={gun.name} />
          {gallery.length > 1 && (
            <div className="gallery-thumbs">
              {gallery.map((u, i) => (
                <button
                  key={`${i}-${u.slice(-20)}`}
                  type="button"
                  className={i === activeImg ? 'gallery-thumb gallery-thumb--active' : 'gallery-thumb'}
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show image ${i + 1}`}
                >
                  <img src={u} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          <h1 className="display">{gun.name}</h1>
          <p className="type">
            {category}
            {caliber ? ` · ${caliber}` : ''}
          </p>
          <p className="price detail-price">{formatPrice(price)}</p>

          {avgRating > 0 && (
            <p className="detail-rating">
              <Star size={16} fill="var(--brass)" stroke="var(--brass)" />
              {avgRating.toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
            </p>
          )}

          <div className="detail-actions">
            <FavoriteButton gunId={gun.id || gun.name} />
            <ShareButton gun={gun} withLabel />
            {onEdit && (
              <button type="button" className="btn btn--outline" onClick={() => onEdit(gun)}>
                Edit
              </button>
            )}
            {onArchive && (
              <button type="button" className="btn btn--outline" onClick={() => onArchive(gun)}>
                <Archive size={14} /> Archive
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn--danger" onClick={() => onDelete(gun)}>
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <section className="detail-section">
        <h2>Description</h2>
        <p>{gun.description || 'No description available.'}</p>
      </section>

      {/* Specifications (from ingredients / steps if present) */}
      {gun.ingredients && gun.ingredients.length > 0 && (
        <section className="detail-section">
          <h2>Specifications</h2>
          <ul className="detail-specs">
            {gun.ingredients.map((ing, i) => (
              <li key={ing.id || i}>
                <strong>{ing.name}</strong> — {ing.quantity}
              </li>
            ))}
          </ul>
        </section>
      )}

      {gun.steps && gun.steps.length > 0 && (
        <section className="detail-section">
          <h2>Assembly / Maintenance Steps</h2>
          <ol className="detail-steps">
            {gun.steps.map((step, i) => (
              <li key={step.id || i}>
                {step.instruction || step}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Reviews Section */}
      <section className="detail-section">
        <h2>Reviews</h2>

        {/* Submit review */}
        <form className="review-form" onSubmit={handleSubmitReview}>
          <div className="review-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="star-btn"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                <Star
                  size={22}
                  fill={n <= rating ? 'var(--brass)' : 'none'}
                  stroke={n <= rating ? 'var(--brass)' : 'var(--steel)'}
                />
              </button>
            ))}
          </div>

          <textarea
            className="review-input"
            rows="3"
            placeholder="Write a short review (optional)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting || !gun.id}
          >
            {submitting ? (
              <><Loader size={16} className="spin" /> Submitting…</>
            ) : (
              <><Send size={16} /> Submit Review</>
            )}
          </button>

          {reviewError && <p className="form-error">{reviewError}</p>}
          {reviewSuccess && <p className="form-success">{reviewSuccess}</p>}
          {!gun.id && (
            <p className="form-hint">
              Reviews require a server-generated product ID. This product is local-only.
            </p>
          )}
        </form>

        {/* Existing reviews */}
        {reviewsLoading ? (
          <p className="detail-loading">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <ul className="review-list">
            {reviews.map((rev) => {
              const mine = rev.user_identifier === myId || rev.user_id === myId
              const vote = votes[rev.id]
              const isEditing = editingId === rev.id
              return (
                <li key={rev.id} className="review-item">
                  <div className="review-head">
                    <span className="review-user">
                      {mine ? 'You' : rev.user_identifier || rev.user_id || 'Anonymous'}
                    </span>
                    <span className="review-stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < (isEditing ? editRating : rev.rating) ? 'var(--brass)' : 'none'}
                          stroke={i < (isEditing ? editRating : rev.rating) ? 'var(--brass)' : 'var(--line)'}
                          style={isEditing ? { cursor: 'pointer' } : undefined}
                          onClick={isEditing ? () => setEditRating(i + 1) : undefined}
                        />
                      ))}
                    </span>
                  </div>

                  {isEditing ? (
                    <>
                      <textarea
                        className="review-input"
                        rows="3"
                        value={editComment}
                        onChange={(e) => setEditComment(e.target.value)}
                        maxLength={500}
                      />
                      <div className="review-actions">
                        <button type="button" className="btn btn--primary btn--sm" disabled={busyId === rev.id} onClick={() => saveEdit(rev)}>
                          Save
                        </button>
                        <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {rev.comment && <p className="review-comment">{rev.comment}</p>}
                      <div className="review-actions">
                        {mine ? (
                          <>
                            <button type="button" className="btn btn--outline btn--sm" onClick={() => startEdit(rev)}>
                              <Pencil size={13} /> Edit
                            </button>
                            <button type="button" className="btn btn--danger-ghost btn--sm" disabled={busyId === rev.id} onClick={() => removeReview(rev)}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={vote === 'up' ? 'vote-btn vote-btn--on' : 'vote-btn'}
                              aria-pressed={vote === 'up'}
                              aria-label="Like review"
                              onClick={() => setVotes({ ...toggleVote(rev.id, 'up') })}
                            >
                              <ThumbsUp size={14} /> {vote === 'up' ? 1 : 0}
                            </button>
                            <button
                              type="button"
                              className={vote === 'down' ? 'vote-btn vote-btn--on' : 'vote-btn'}
                              aria-pressed={vote === 'down'}
                              aria-label="Dislike review"
                              onClick={() => setVotes({ ...toggleVote(rev.id, 'down') })}
                            >
                              <ThumbsDown size={14} /> {vote === 'down' ? 1 : 0}
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="detail-empty">No reviews yet. Be the first!</p>
        )}
      </section>
    </div>
  )
}
