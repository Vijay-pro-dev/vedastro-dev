import { useEffect } from "react"
import { useLocation } from "react-router-dom"

function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.slice(1))
      if (element) {
        element.scrollIntoView()
        return
      }
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [pathname, search, hash])

  return null
}

export default ScrollToTop

