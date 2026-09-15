import { useSyncExternalStore } from 'react'

// Reads a media query synchronously on first render, so there is no flash of
// the wrong variant and no measurement pass. Returning false as the server
// snapshot means "assume the narrow layout", which is the mobile-first default.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
