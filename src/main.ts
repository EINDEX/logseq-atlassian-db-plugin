import '@logseq/libs'
import { startPlugin } from './plugin'

;(globalThis as any).logseq
  .ready(() => {
    void startPlugin().catch(console.error)
  })
  .catch(console.error)
