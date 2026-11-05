import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { buildGunShareUrl } from '../../utils/helpers'

/**
 * ShareButton — Generates and shares a direct deep-link URL (`?gun=<id>`)
 * for a specific catalog item.
 *
 * Uses Web Share API (`navigator.share`) on supported mobile/desktop browsers
 * or copies the link directly to the clipboard with visual confirmation.
 *
 * @param {Object}  props
 * @param {Object}  props.gun               — catalog item object
 * @param {boolean} [props.withLabel=false] — show text label (for detail view)
 */
export default function ShareButton({ gun, withLabel = false }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async (e) => {
    e.stopPropagation()
    if (!gun) return

    const shareUrl = buildGunShareUrl(gun)
    const shareData = {
      title: `Bore & Barrel — ${gun.name}`,
      text: `Check out ${gun.name} (${gun.type || gun.category || 'Hardware'}) on Bore & Barrel Armory.`,
      url: shareUrl,
    }

    // Copy to clipboard first so user always has the link ready to paste
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback copy via temporary input
      const temp = document.createElement('input')
      temp.value = shareUrl
      document.body.appendChild(temp)
      temp.select()
      document.execCommand('copy')
      document.body.removeChild(temp)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }

    // If native Web Share API is available and user is on a mobile/touch device, trigger share sheet
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled share sheet — link is already copied
      }
    }
  }

  if (withLabel) {
    return (
      <button
        type="button"
        className={`btn btn--outline ${copied ? 'share-btn--copied' : ''}`}
        onClick={handleShare}
        aria-label={`Share link for ${gun?.name}`}
        title="Copy shareable catalog link"
      >
        {copied ? (
          <>
            <Check size={16} color="#1e8449" /> Link Copied!
          </>
        ) : (
          <>
            <Share2 size={16} /> Share Link
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`card-act-btn share-act-btn ${copied ? 'share-act-btn--copied' : ''}`}
      onClick={handleShare}
      aria-label={`Share link for ${gun?.name}`}
      title={copied ? 'Catalog link copied!' : `Share link for ${gun?.name}`}
    >
      {copied ? (
        <Check size={15} color="#1e8449" />
      ) : (
        <Share2 size={15} stroke="var(--ink)" />
      )}
    </button>
  )
}

