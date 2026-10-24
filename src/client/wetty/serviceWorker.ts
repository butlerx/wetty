function register(): Promise<ServiceWorkerRegistration | undefined> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve(undefined);
  }
  const scripts = Array.from(document.getElementsByTagName('script'));
  const own = scripts.find((s) => s.src.endsWith('/wetty.js'));
  if (!own) return Promise.resolve(undefined);
  const base = own.src.replace(/\/client\/wetty\.js$/, '');
  return navigator.serviceWorker
    .register(`${base}/sw.js`, { scope: `${base}/` })
    .then((registration) => {
      if (registration.active?.state === 'activated') return registration;
      const worker =
        registration.installing ?? registration.waiting ?? registration.active;
      if (!worker) return undefined;
      return new Promise<ServiceWorkerRegistration | undefined>((resolve) => {
        const onStateChange = (): void => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            worker.removeEventListener('statechange', onStateChange);
            resolve(worker.state === 'activated' ? registration : undefined);
          }
        };
        worker.addEventListener('statechange', onStateChange);
        onStateChange();
      });
    })
    .catch(() => undefined);
}

export const serviceWorker = register();
