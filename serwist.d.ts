/// <reference lib="webworker" />

import type { PrecacheEntry } from 'serwist'

declare global {
  interface ServiceWorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare module '@serwist/next/worker' {
  export const defaultCache: import('serwist').RuntimeCaching[]
}
