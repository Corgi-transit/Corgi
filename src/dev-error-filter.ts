/**
 * Dev-only: stop browser extension errors (e.g. MetaMask) from reaching Vite's
 * HMR client, which logs them as "[Unhandled error] Script error." in the terminal.
 */
if (import.meta.env.DEV) {
  const isExtensionSource = (source?: string) =>
    Boolean(
      source &&
        (source.startsWith('chrome-extension://') ||
          source.startsWith('moz-extension://') ||
          source.startsWith('safari-extension://'))
    );

  const isExtensionNoise = (message: string, source?: string, stack?: string) => {
    if (isExtensionSource(source)) return true;
    if (stack && isExtensionSource(stack.split('\n')[0])) return true;
    if (/metamask/i.test(message) || /metamask/i.test(stack ?? '')) return true;
    // Cross-origin extension failures often surface as message-only "Script error."
    if (message === 'Script error.' && !source) return true;
    return false;
  };

  window.addEventListener(
    'error',
    (event) => {
      if (isExtensionNoise(event.message, event.filename, undefined)) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason = event.reason;
      const message =
        typeof reason === 'object' && reason !== null && 'message' in reason
          ? String((reason as { message: unknown }).message)
          : String(reason);
      const stack =
        typeof reason === 'object' && reason !== null && 'stack' in reason
          ? String((reason as { stack: unknown }).stack)
          : undefined;

      if (isExtensionNoise(message, undefined, stack)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );
}
