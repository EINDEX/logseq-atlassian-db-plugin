import '@logseq/libs'
import { startPlugin } from './plugin'

;(globalThis as any).logseq.ready(startPlugin).catch(console.error)
