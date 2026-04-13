let cachedDomain = null
let loadPromise = null

function normalizeJitsiDomain(domain) {
  return String(domain || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
}

export function getNormalizedJitsiDomain(domain) {
  return normalizeJitsiDomain(domain)
}

export function loadJitsiExternalApi(domain) {
  const normalizedDomain = normalizeJitsiDomain(domain)
  if (!normalizedDomain) {
    return Promise.reject(new Error('Missing Jitsi domain.'))
  }

  if (window.JitsiMeetExternalAPI) {
    return Promise.resolve(window.JitsiMeetExternalAPI)
  }

  if (loadPromise && cachedDomain === normalizedDomain) {
    return loadPromise
  }

  cachedDomain = normalizedDomain

  loadPromise = new Promise((resolve, reject) => {
    const scriptSrc = `https://${normalizedDomain}/external_api.js`
    const existingScript = document.querySelector(`script[data-jitsi-domain="${normalizedDomain}"]`)

    const handleSuccess = () => {
      if (window.JitsiMeetExternalAPI) {
        resolve(window.JitsiMeetExternalAPI)
      } else {
        loadPromise = null
        reject(new Error('Jitsi API loaded, but the global object is missing.'))
      }
    }

    const handleError = () => {
      loadPromise = null
      reject(new Error(`Unable to load the Jitsi External API from ${normalizedDomain}.`))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleSuccess, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = scriptSrc
    script.async = true
    script.dataset.jitsiDomain = normalizedDomain
    script.addEventListener('load', handleSuccess, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.body.appendChild(script)
  })

  return loadPromise
}
