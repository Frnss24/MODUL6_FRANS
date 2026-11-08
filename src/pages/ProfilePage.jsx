import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Save,
  Heart,
  FileText,
  Camera,
  Play,
  Pencil,
  ArrowLeft,
  Archive,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import userService from '../services/userService'
import { useFavorites } from '../hooks/useFavorites'
import gunService from '../services/gunService'
import { getAllDraftIds, loadDraft, deleteDraft, formatDraftTime } from '../utils/draftStorage'
import { useArchive, restoreGun, removeArchived } from '../utils/archiveStorage'
import About from './About'
import Contact from './Contact'

const readDrafts = () =>
  getAllDraftIds().map((id) => {
    const d = loadDraft(id) || {}
    return { id, name: d.formData?.name || '(untitled)', savedAt: d.savedAt }
  })

/**
 * ProfilePage — User identity and Armory settings.
 * Manages operator profile, identifier, favorites stats, and draft storage.
 */
export default function ProfilePage({ onReplaySplash, onNavigate }) {
  const [view, setView] = useState('main') // 'main' | 'edit'
  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')

  const { favorites } = useFavorites()
  const [drafts, setDrafts] = useState(readDrafts)
  const { items: archived } = useArchive()

  const handleDeleteDraft = (id) => {
    deleteDraft(id)
    setDrafts(readDrafts())
  }

  const handleContinueDraft = (id) => {
    if (!onNavigate) return
    if (id === 'create') onNavigate('Create')
    else onNavigate('Edit', { id })
  }

  const handleDeletePermanently = async (gun) => {
    if (!window.confirm(`Permanently delete "${gun.name}"? This cannot be undone.`)) return
    try {
      await gunService.deleteGun(gun.id)
    } catch (err) {
      // Record may already be gone on the server; still clear the archive entry.
      console.warn('Permanent delete failed on server:', err)
    }
    removeArchived(gun.id)
    setFeedback('Catalog permanently deleted.')
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      setFeedback('Avatar image must be under 2MB.')
      setTimeout(() => setFeedback(''), 3000)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      userService.updateAvatar(base64)
      setFeedback('Avatar updated.')
      setTimeout(() => setFeedback(''), 3000)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    const updated = {
      ...profile,
      username: username.trim() || 'Shooter',
      bio: bio.trim(),
      avatar,
    }
    const result = userService.saveUserProfile(updated)
    if (result.success) {
      setProfile(result.data)
      setView('main')
      setFeedback('Profile successfully updated.')
      setTimeout(() => setFeedback(''), 3000)
    } else {
      setFeedback('Failed to save profile.')
    }
  }

  if (view === 'edit') {
    return (
      <div className="profile-page">
        <button type="button" className="detail-back" onClick={() => setView('main')}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
        <h1 className="display">Edit Profile</h1>
        {feedback && (
          <div className="toast toast--success"><Check size={18} /> {feedback}</div>
        )}
      
      <form onSubmit={handleSaveProfile} className="profile-form">
        <h3 className="section-title">Armorer Details</h3>

        <div className="form-group">
          <label htmlFor="prof-name" className="form-label">
            Callsign / Operator Alias
          </label>
          <input
            id="prof-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="prof-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={3}
            className="form-textarea"
          />
        </div>

        <button type="submit" className="btn btn--primary">
          <Save size={16} /> Save Armorer Profile
        </button>
      </form>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <section className="masthead" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, procurement statistics, and armorer details.
          </p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
            title="Replay introductory splash animation"
          >
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Operator Card */}
      <div className="profile-card">
        <div className="profile-card-top">
          <div className="avatar-wrap">
            {avatar ? (
              <img src={avatar} alt={profile.username} className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <Shield size={36} stroke="var(--brass)" />
              </div>
            )}
            <label htmlFor="avatar-file-input" className="avatar-upload-btn" title="Upload avatar">
              <Camera size={14} />
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden-file-input"
              />
            </label>
          </div>

          <div className="profile-identity">
            <h2 className="display">{profile.username || 'Shooter'}</h2>
            <div className="profile-id-row">
              <span className="mono-badge">{profile.userId}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyId}
                title="Copy User ID to clipboard"
              >
                {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        <button type="button" className="btn btn--outline btn--sm" onClick={() => setView('edit')}>
          <Pencil size={14} /> Edit Profile
        </button>

        {/* Stats Grid */}
        <div className="profile-stats">
          <div className="stat-item">
            <Heart size={20} className="stat-icon" stroke="var(--brass)" />
            <div className="stat-val">{favorites.length}</div>
            <div className="stat-label">Procurement Favorites</div>
          </div>
          <div className="stat-item">
            <FileText size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{drafts.length}</div>
            <div className="stat-label">Saved Offline Drafts</div>
          </div>
          <div className="stat-item">
            <Archive size={20} className="stat-icon" stroke="var(--steel)" />
            <div className="stat-val">{archived.length}</div>
            <div className="stat-label">Archived Catalogs</div>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && <p className="profile-bio">{profile.bio}</p>}

      {/* Drafts */}
      <section className="profile-section" id="drafts">
        <h3 className="section-title"><FileText size={16} /> Drafts ({drafts.length})</h3>
        {drafts.length === 0 ? (
          <p className="detail-empty">No drafts saved.</p>
        ) : (
          <ul className="profile-list">
            {drafts.map((d) => (
              <li key={d.id} className="profile-list-item">
                <div>
                  <strong>{d.name}</strong>
                  <div className="form-hint">
                    {d.id === 'create' ? 'New catalog' : 'Editing existing catalog'}
                    {d.savedAt ? ` · saved ${formatDraftTime(d.savedAt)}` : ''}
                  </div>
                </div>
                <div className="review-actions">
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => handleContinueDraft(d.id)}>
                    Continue
                  </button>
                  <button type="button" className="btn btn--danger-ghost btn--sm" onClick={() => handleDeleteDraft(d.id)}>
                    <Trash2 size={13} /> Discard
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Archive */}
      <section className="profile-section" id="archive">
        <h3 className="section-title"><Archive size={16} /> Archive ({archived.length})</h3>
        {archived.length === 0 ? (
          <p className="detail-empty">No archived catalogs.</p>
        ) : (
          <ul className="profile-list">
            {archived.map(({ gun, archivedAt }) => (
              <li key={gun.id} className="profile-list-item">
                <div>
                  <strong>{gun.name}</strong>
                  <div className="form-hint">Archived {formatDraftTime(archivedAt)}</div>
                </div>
                <div className="review-actions">
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => restoreGun(gun.id)}>
                    <RotateCcw size={13} /> Restore
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => handleDeletePermanently(gun)}>
                    <Trash2 size={13} /> Delete permanently
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* About & Contact (moved from navbar) */}
      <section className="profile-section" id="about"><About /></section>
      <section className="profile-section" id="contact"><Contact /></section>
    </div>
  )
}
