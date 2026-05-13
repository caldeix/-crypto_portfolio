const KEY = 'cp_'

export const save = (k, v) => {
  try { localStorage.setItem(KEY + k, JSON.stringify(v)) } catch {}
}

export const load = (k, fallback = null) => {
  try {
    const v = localStorage.getItem(KEY + k)
    return v !== null ? JSON.parse(v) : fallback
  } catch { return fallback }
}

export const encodeKey = (k) => btoa(k)
export const decodeKey = (k) => { try { return atob(k) } catch { return '' } }
