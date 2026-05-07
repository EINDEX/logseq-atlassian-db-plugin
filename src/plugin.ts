import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'
import { fetchAtlassianMetadata, logseqRequestJson } from './atlassian'
import { rewriteAtlassianLinks } from './markdown'
import { ensureAtlassianProperties, writeAtlassianProperties } from './properties'
import { readSettings, registerSettingsSchema } from './settings'
import type { AtlassianLink, AtlassianMetadata } from './types'

const DEBOUNCE_MS = 600
const CACHE_TTL_MS = 30000
const WARNING_TTL_MS = 10000

type OffHook = () => void

type CacheEntry = {
  expiresAt: number
  promise: Promise<AtlassianMetadata>
}

const offHooks: OffHook[] = []
const pendingBlocks = new Map<string, BlockEntity>()
const processingBlocks = new Set<string>()
const processedTitles = new Map<string, string>()
const metadataCache = new Map<string, CacheEntry>()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastWarningAt = 0

export async function startPlugin(): Promise<void> {
  registerSettingsSchema()

  const isDbGraph = await (globalThis as any).logseq.App.checkCurrentIsDbGraph()
  if (!isDbGraph) {
    await showWarning('Atlassian Linker requires a Logseq DB graph.')
    return
  }

  await ensureAtlassianProperties()

  offHooks.push(
    (globalThis as any).logseq.DB.onChanged(({ blocks }: { blocks: BlockEntity[] }) => {
      const settings = readSettings()
      if (!settings.autoRewrite) return

      for (const block of blocks ?? []) {
        if (!block?.uuid || processingBlocks.has(block.uuid)) continue
        pendingBlocks.set(block.uuid, block)
      }

      schedulePendingBlocks()
    }),
  )

  offHooks.push(
    (globalThis as any).logseq.onSettingsChanged(() => {
      metadataCache.clear()
      processedTitles.clear()
    }),
  )

  ;(globalThis as any).logseq.beforeunload(async () => {
    for (const off of offHooks.splice(0)) off()
    if (debounceTimer) clearTimeout(debounceTimer)
  })
}

async function processBlock(block: BlockEntity): Promise<void> {
  const title = getBlockTitle(block)
  if (!title || processedTitles.get(block.uuid) === title) return

  processingBlocks.add(block.uuid)

  try {
    const settings = readSettings()
    const result = await rewriteAtlassianLinks(title, (link) => resolveMetadata(link, settings))
    const primaryResolution = result.resolutions[0]

    if (!primaryResolution) {
      processedTitles.set(block.uuid, title)
      return
    }

    if (result.changed) {
      await (globalThis as any).logseq.Editor.updateBlock(block.uuid, result.content)
    }

    await writeAtlassianProperties(block.uuid, primaryResolution)

    if (primaryResolution.error) {
      await showWarning(primaryResolution.error)
    }

    processedTitles.set(block.uuid, result.content)
  } finally {
    processingBlocks.delete(block.uuid)
  }
}

function schedulePendingBlocks(): void {
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void flushPendingBlocks()
  }, DEBOUNCE_MS)
}

async function flushPendingBlocks(): Promise<void> {
  const blocks = [...pendingBlocks.values()]
  pendingBlocks.clear()

  for (const block of blocks) {
    try {
      await processBlock(block)
    } catch (error) {
      await showWarning(errorToMessage(error))
    }
  }
}

function resolveMetadata(link: AtlassianLink, settings: ReturnType<typeof readSettings>): Promise<AtlassianMetadata> {
  const cacheKey = `${link.kind}:${link.siteOrigin}:${link.kind === 'jira' ? link.issueKey : link.pageId}`
  const cached = metadataCache.get(cacheKey)
  const now = Date.now()

  if (cached && cached.expiresAt > now) return cached.promise

  const promise = fetchAtlassianMetadata(link, settings, logseqRequestJson)
  metadataCache.set(cacheKey, {
    expiresAt: now + CACHE_TTL_MS,
    promise,
  })

  promise.catch(() => metadataCache.delete(cacheKey))
  return promise
}

function getBlockTitle(block: BlockEntity): string {
  return typeof block.title === 'string' ? block.title : (block.content ?? '')
}

async function showWarning(message: string): Promise<void> {
  const now = Date.now()
  if (now - lastWarningAt < WARNING_TTL_MS) return

  lastWarningAt = now
  await (globalThis as any).logseq.UI.showMsg(message, 'warning')
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Atlassian Linker failed while processing a block'
}
