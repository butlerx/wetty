function register(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(undefined);
  const scripts = Array.from(document.getElementsByTagName('script'));
  const own = scripts.find((s) => s.src.endsWith('/wetty.js'));
  if (!own) return Promise.resolve(undefined);
  const base = own.src.replace(/\/client\/wetty\.js$/, '');
  return navigator.serviceWorker
    .register(`${base}/sw.js`, { scope: `${base}/` })
    .catch(() => undefined);
}

export const serviceWorker = register();
