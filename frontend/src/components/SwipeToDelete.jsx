import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'

const THRESHOLD = 80   // px needed to trigger delete
const MAX_DRAG  = 100  // max drag distance

export default function SwipeToDelete({ onDelete, children }) {
  const rowRef      = useRef(null)
  const startX      = useRef(0)
  const currentX    = useRef(0)
  const dragging    = useRef(false)

  useEffect(() => {
    const el = rowRef.current
    if (!el) return

    const onTouchStart = (e) => {
      startX.current  = e.touches[0].clientX
      currentX.current = 0
      dragging.current = false
      // Remove transition for instant response
      el.style.transition = 'none'
    }

    const onTouchMove = (e) => {
      const dx = e.touches[0].clientX - startX.current
      // Only activate for leftward swipes (negative dx)
      if (!dragging.current) {
        if (dx < -8) dragging.current = true
        else if (Math.abs(dx) > 8) return  // right swipe — ignore
      }
      if (!dragging.current) return

      e.preventDefault()
      const clamped = Math.max(-MAX_DRAG, Math.min(0, dx))
      currentX.current = clamped
      el.style.transform = `translateX(${clamped}px)`

      // Opacity of delete bg: 0 → 1 as we approach THRESHOLD
      const pct = Math.min(1, Math.abs(clamped) / THRESHOLD)
      el.dataset.deletePct = pct
      // Directly update the sibling bg div opacity
      const bg = el.parentElement?.querySelector('[data-delete-bg]')
      if (bg) bg.style.opacity = pct
    }

    const onTouchEnd = () => {
      if (!dragging.current) return
      dragging.current = false

      if (Math.abs(currentX.current) >= THRESHOLD) {
        // Animate out and delete
        el.style.transition = 'transform 0.25s ease-out, opacity 0.2s'
        el.style.transform  = `translateX(-110%)`
        el.style.opacity    = '0'
        setTimeout(onDelete, 240)
      } else {
        // Snap back
        el.style.transition = 'transform 0.3s cubic-bezier(0.32,0.72,0,1)'
        el.style.transform  = 'translateX(0)'
        const bg = el.parentElement?.querySelector('[data-delete-bg]')
        if (bg) {
          bg.style.transition = 'opacity 0.3s'
          bg.style.opacity    = '0'
        }
        currentX.current = 0
      }
    }

    el.addEventListener('touchstart',  onTouchStart,  { passive: true  })
    el.addEventListener('touchmove',   onTouchMove,   { passive: false })
    el.addEventListener('touchend',    onTouchEnd,    { passive: true  })
    el.addEventListener('touchcancel', onTouchEnd,    { passive: true  })

    return () => {
      el.removeEventListener('touchstart',  onTouchStart)
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onDelete])

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Red delete background (revealed as user swipes left) */}
      <div
        data-delete-bg
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-2xl"
        style={{
          background: 'linear-gradient(to left, #ef4444, #dc2626)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      >
        <Trash2 size={20} className="text-white" />
      </div>

      {/* Swipeable row */}
      <div ref={rowRef} className="relative">
        {children}
      </div>
    </div>
  )
}
