import { useEffect } from "react"

export default function useScrollReveal({
  selector = ".scroll-reveal",
  threshold = [0, 0.12, 0.35],
  rootMargin = "0px 0px -15% 0px",
} = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (prefersReducedMotion) return undefined

    const targets = Array.from(document.querySelectorAll(selector))
    if (targets.length === 0) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-visible", entry.isIntersecting)
        })
      },
      { threshold, rootMargin },
    )

    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [selector, rootMargin, threshold])
}

