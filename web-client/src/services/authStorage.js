const AUTH_KEYS = ['accessToken', 'refreshToken', 'user']

export function getAuthItem(key) {
  const fromSession = sessionStorage.getItem(key)
  if (fromSession !== null) return fromSession
  return localStorage.getItem(key)
}

export function setAuthItem(key, value) {
  sessionStorage.setItem(key, value)
  // Prevent cross-tab identity leakage from legacy local storage values.
  localStorage.removeItem(key)
}

export function removeAuthItem(key) {
  sessionStorage.removeItem(key)
  localStorage.removeItem(key)
}

export function clearAuthItems() {
  AUTH_KEYS.forEach((key) => {
    sessionStorage.removeItem(key)
    localStorage.removeItem(key)
  })
}
