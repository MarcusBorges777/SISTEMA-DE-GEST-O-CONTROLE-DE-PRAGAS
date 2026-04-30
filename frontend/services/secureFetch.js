const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isSameOrigin(input) {
  try {
    const url = typeof input === 'string' ? input : input?.url;
    if (!url) return true;
    return new URL(url, window.location.origin).origin === window.location.origin;
  } catch {
    return true;
  }
}

function methodOf(input, init = {}) {
  return (init.method || (typeof input !== 'string' && input?.method) || 'GET').toUpperCase();
}

export function installSecureFetch() {
  if (window.__secureFetchInstalled) return;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const method = methodOf(input, init);
    if (!UNSAFE_METHODS.has(method) || !isSameOrigin(input)) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
    headers.set('X-Requested-With', 'XMLHttpRequest');

    return nativeFetch(input, {
      ...init,
      method,
      headers,
      credentials: init.credentials || 'same-origin',
    });
  };

  window.__secureFetchInstalled = true;
}
