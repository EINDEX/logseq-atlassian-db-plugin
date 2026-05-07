import type { AtlassianMetadata, LinkResolution } from './types'

const PREFIX = ':plugin.property.logseq-atlassian-linker'

export const PROPERTY_KEYS = {
  type: `${PREFIX}/type`,
  key: `${PREFIX}/key`,
  title: `${PREFIX}/title`,
  status: `${PREFIX}/status`,
  url: `${PREFIX}/url`,
  lastFetched: `${PREFIX}/last-fetched`,
  fetchError: `${PREFIX}/fetch-error`,
} as const

type PropertySchema = {
  type: 'default' | 'url'
  cardinality: 'one'
  hide: boolean
  public: boolean
}

const defaultSchema: PropertySchema = {
  type: 'default',
  cardinality: 'one',
  hide: false,
  public: true,
}

export async function ensureAtlassianProperties(): Promise<void> {
  await upsertProperty(PROPERTY_KEYS.type, defaultSchema, 'Atlassian Type')
  await upsertProperty(PROPERTY_KEYS.key, defaultSchema, 'Atlassian Key')
  await upsertProperty(PROPERTY_KEYS.title, defaultSchema, 'Atlassian Title')
  await upsertProperty(PROPERTY_KEYS.status, defaultSchema, 'Atlassian Status')
  await upsertProperty(PROPERTY_KEYS.url, { ...defaultSchema, type: 'url' }, 'Atlassian URL')
  await upsertProperty(PROPERTY_KEYS.lastFetched, defaultSchema, 'Atlassian Last Fetched')
  await upsertProperty(PROPERTY_KEYS.fetchError, defaultSchema, 'Atlassian Fetch Error')
}

export async function writeAtlassianProperties(blockUuid: string, resolution: LinkResolution): Promise<void> {
  await upsertBlockProperty(blockUuid, PROPERTY_KEYS.type, resolution.link.kind)
  await upsertBlockProperty(blockUuid, PROPERTY_KEYS.url, resolution.link.originalUrl)
  await upsertBlockProperty(blockUuid, PROPERTY_KEYS.lastFetched, new Date().toISOString())

  if (resolution.link.kind === 'jira') {
    await upsertBlockProperty(blockUuid, PROPERTY_KEYS.key, resolution.link.issueKey)
  } else {
    await upsertBlockProperty(blockUuid, PROPERTY_KEYS.key, resolution.link.pageId)
  }

  if (resolution.metadata) {
    await writeSuccessProperties(blockUuid, resolution.metadata)
    return
  }

  if (resolution.error) {
    await upsertBlockProperty(blockUuid, PROPERTY_KEYS.fetchError, resolution.error)
  }
}

async function writeSuccessProperties(blockUuid: string, metadata: AtlassianMetadata): Promise<void> {
  await upsertBlockProperty(blockUuid, PROPERTY_KEYS.title, metadata.title)
  await upsertBlockProperty(blockUuid, PROPERTY_KEYS.status, metadata.status)
  await removeBlockProperty(blockUuid, PROPERTY_KEYS.fetchError)
}

async function upsertProperty(key: string, schema: PropertySchema, name: string): Promise<void> {
  await (globalThis as any).logseq.Editor.upsertProperty(key, schema, { name })
}

async function upsertBlockProperty(blockUuid: string, key: string, value: unknown): Promise<void> {
  await (globalThis as any).logseq.Editor.upsertBlockProperty(blockUuid, key, value)
}

async function removeBlockProperty(blockUuid: string, key: string): Promise<void> {
  try {
    await (globalThis as any).logseq.Editor.removeBlockProperty(blockUuid, key)
  } catch {
    // Older DB graphs may not have the property value yet.
  }
}
