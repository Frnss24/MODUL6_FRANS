import { useState, useEffect, useRef } from 'react'

/**
 * LazyImage — Viewport-aware lazy-loaded image component using IntersectionObserver
 * and native `loading="lazy"` with a skeleton placeholder and fallback on error.
 *
 * @param {Object} props
 * @param {string} props.src
 * @param {string} props.alt
 * @param {string} [props.className]
 * @param {number|string} [props.width]
 * @param {number|string} [props.height]
 * @param {string} [props.fallback='/guns/pistol.svg']
 */
export default function LazyImage({
  src,
  alt,
  className = '',
  width,
  height,
  fallback = '/guns/pistol.svg',
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [imgSrc, setImgSrc] = useState(src || fallback)
  const containerRef = useRef(null)

  useEffect(() => {
    setImgSrc(src || fallback)
    setIsLoaded(false)
  }, [src, fallback])

  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin: '120px 0px', threshold: 0.01 },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`lazy-img-wrap ${isLoaded ? 'lazy-img-wrap--loaded' : 'lazy-img-wrap--loading'}`}
    >
      {!isLoaded && <div className="lazy-img-skeleton" aria-hidden="true" />}
      {isVisible && (
        <img
          src={imgSrc}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (imgSrc !== fallback) {
              setImgSrc(fallback)
            }
            setIsLoaded(true)
          }}
          className={`${className} lazy-img ${isLoaded ? 'lazy-img--visible' : ''}`}
        />
      )}
    </div>
  )
}

