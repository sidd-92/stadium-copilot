// Thin console wrapper that prefixes every line with the service name, so
// the prefix can't drift between call sites the way a hand-typed
// `"[order-service] ..."` string literal can.
export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(serviceName: string): Logger {
  const prefix = `[${serviceName}]`;
  return {
    log: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };
}
