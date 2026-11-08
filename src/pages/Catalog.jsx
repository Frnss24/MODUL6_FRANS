import { useState, useMemo, useEffect, lazy, Suspense } from 'react'
import {
  RefreshCw,
  Plus,
  Loader,
  AlertCircle,
  PackageOpen,
  Database,
} from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import AdvancedFilter from '../components/common/AdvancedFilter'
import Pagination from '../components/common/Pagination'
import ConfirmModal from '../components/modals/ConfirmModal'
import gunService from '../services/gunService'
import { archiveGun, useArchive } from '../utils/archiveStorage'

const GunDetail = lazy(() => import('../components/gun/GunDetail'))
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
  paginateItems,
  getGunQueryParam,
  setGunQueryParam,
} from '../utils/helpers'

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns() (with dual-layer Query Caching)
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * Features:
 *   - Search, category filter, sort
 *   - Client/Hybrid Pagination with page size selector
 *   - Sharelink deep-linking (?gun=<id>)
 *   - CRUD actions & confirmation modal
 */
export default function Catalog({ onNavigate }) {
  // ---- API data (with Query Caching) ----
  const {
    guns: apiGuns,
    loading,
    error,
    fromCache,
    refetch,
  } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)
  const { ids: archivedIds } = useArchive()

  // Decide data source
  const rawGuns = useMemo(() => {
    if (useLocal || (error && apiGuns.length === 0)) {
      // Enrich local data with synthetic ids so FavoriteButton, ShareButton and detail work
      return GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` })).filter(
        (g) => !archivedIds.has(String(g.id)),
      )
    }
    // Archived (soft-deleted) catalogs are hidden from the list
    return apiGuns.filter((g) => !archivedIds.has(String(g.id)))
  }, [apiGuns, error, useLocal, archivedIds])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  // ---- pagination state ----
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(3)

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    const result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  const paginationData = useMemo(
    () => paginateItems(filteredGuns, currentPage, pageSize),
    [filteredGuns, currentPage, pageSize],
  )

  // ---- detail view & Sharelink deep-link (?gun=<id>) ----
  const [selectedGun, setSelectedGun] = useState(null)

  useEffect(() => {
    const sharedGunParam = getGunQueryParam()
    if (!sharedGunParam || rawGuns.length === 0) return

    const found = rawGuns.find(
      (g) =>
        String(g.id) === String(sharedGunParam) ||
        String(g.name).toLowerCase() === String(sharedGunParam).toLowerCase(),
    )
    if (found) {
      setSelectedGun(found)
    }
  }, [rawGuns])

  const handleSelectGun = (gun) => {
    setSelectedGun(gun)
    setGunQueryParam(gun ? gun.id || gun.name : null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ---- delete ----
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError('')
      await gunService.deleteGun(deleteTarget.id)
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete.')
    } finally {
      setDeleting(false)
    }
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <Suspense
        fallback={
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading product details…</p>
          </div>
        }
      >
        <GunDetail
          gun={selectedGun}
          onBack={() => handleSelectGun(null)}
          onEdit={(g) => onNavigate && onNavigate('Edit', g)}
          onDelete={(g) => {
            handleSelectGun(null)
            setDeleteTarget(g)
          }}
          onArchive={(g) => {
            archiveGun(g)
            handleSelectGun(null)
          }}
        />
      </Suspense>
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span
              className={`cache-badge ${fromCache ? 'cache-badge--hit' : 'cache-badge--live'}`}
              title={
                fromCache
                  ? 'Data served instantly from Query Cache (in-memory + localStorage)'
                  : 'Data fetched from live API'
              }
            >
              <Database size={13} />
              {fromCache ? 'Cached' : 'Live API'}
            </span>

            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>

            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={refetch}
              disabled={loading}
              title="Invalidate cache & fetch fresh catalog data"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>

            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <AdvancedFilter
          search={search}
          onSearch={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={(cat) => {
            setActiveCategory(cat)
            setCurrentPage(1)
          }}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
            setCurrentPage(1)
          }}
        />

        {/* States */}
        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {/* Paginated Product Grid */}
        {paginationData.items.length > 0 && (
          <>
            <ul className="stock">
              {paginationData.items.map((gun) => (
                <GunCard
                  key={gun.id || gun.name}
                  gun={gun}
                  onSelect={handleSelectGun}
                  onEdit={
                    onNavigate ? (g) => onNavigate('Edit', g) : undefined
                  }
                  onDelete={setDeleteTarget}
                  onArchive={archiveGun}
                />
              ))}
            </ul>

            <Pagination
              currentPage={paginationData.currentPage}
              totalPages={paginationData.totalPages}
              totalItems={paginationData.totalItems}
              startIndex={paginationData.startIndex}
              endIndex={paginationData.endIndex}
              pageSize={paginationData.pageSize}
              onPageChange={(page) => {
                setCurrentPage(page)
                window.scrollTo({ top: 180, behavior: 'smooth' })
              }}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
            />
          </>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setUseLocal(false)
                refetch()
              }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError('')
        }}
      />
      {deleteError && (
        <div className="toast toast--error">{deleteError}</div>
      )}
    </>
  )
}
