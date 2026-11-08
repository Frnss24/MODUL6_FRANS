import { useState } from 'react'
import { Upload, X, Loader } from 'lucide-react'
import uploadService from '../../services/uploadService'

/**
 * MultiImagePicker — upload several images for one catalog.
 * Files are uploaded as they are chosen; `images` holds the resulting URLs.
 */
export default function MultiImagePicker({ images, onChange, max = 6, label = 'Additional Images' }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return

    const room = max - images.length
    if (room <= 0) {
      setError(`Maximum ${max} images.`)
      return
    }

    setUploading(true)
    setError('')
    const urls = []
    for (const file of files.slice(0, room)) {
      try {
        const res = await uploadService.uploadImage(file)
        if (res?.data?.url) urls.push(res.data.url)
      } catch (err) {
        setError(err.message || 'Upload failed.')
      }
    }
    if (files.length > room) setError(`Only ${max} images allowed; extras were skipped.`)
    if (urls.length) onChange([...images, ...urls])
    setUploading(false)
  }

  return (
    <div className="multi-img">
      <span className="form-label">
        {label} ({images.length}/{max})
      </span>
      <div className="multi-img-grid">
        {images.map((url, i) => (
          <div className="multi-img-item" key={`${i}-${url.slice(-24)}`}>
            <img src={url} alt={`Upload ${i + 1}`} loading="lazy" />
            <button
              type="button"
              className="preview-remove-btn"
              title="Remove image"
              onClick={() => onChange(images.filter((_, idx) => idx !== i))}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {images.length < max && (
          <label className="multi-img-add">
            {uploading ? <Loader size={20} className="spin" /> : <Upload size={20} />}
            <span>{uploading ? 'Uploading…' : 'Add images'}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFiles}
              className="hidden-file-input"
              disabled={uploading}
            />
          </label>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
