import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Pagination — Reusable pagination bar with page numbers, Prev/Next buttons,
 * item range summary, and page-size selector.
 *
 * @param {Object}   props
 * @param {number}   props.currentPage  — 1-based current page
 * @param {number}   props.totalPages   — total number of pages
 * @param {number}   props.totalItems   — total filtered items
 * @param {number}   props.startIndex   — 1-based first item index on current page
 * @param {number}   props.endIndex     — 1-based last item index on current page
 * @param {number}   props.pageSize     — items per page
 * @param {Function} props.onPageChange — (newPage: number) => void
 * @param {Function} [props.onPageSizeChange] — (newSize: number) => void
 */
export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  if (totalItems === 0) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <nav className="pagination" aria-label="Catalog pagination">
      <div className="pagination__info">
        <span>
          Showing <strong>{startIndex}</strong>–<strong>{endIndex}</strong> of{' '}
          <strong>{totalItems}</strong> piece{totalItems !== 1 ? 's' : ''}
        </span>

        {onPageSizeChange && (
          <label className="pagination__size-label">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="pagination__size-select"
              aria-label="Items per page"
            >
              <option value={3}>3</option>
              <option value={6}>6</option>
              <option value={9}>9</option>
              <option value={12}>12</option>
            </select>
          </label>
        )}
      </div>

      <div className="pagination__controls">
        <button
          type="button"
          className="pagination__btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        <div className="pagination__pages">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={`pagination__page ${p === currentPage ? 'pagination__page--active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="pagination__btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  )
}

