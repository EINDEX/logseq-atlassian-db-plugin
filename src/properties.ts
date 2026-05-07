const PREFIX = 'atlassian-linker'

export const PROPERTY_KEYS = {
  type: `${PREFIX}-type`,
  key: `${PREFIX}-key`,
  title: `${PREFIX}-title`,
  status: `${PREFIX}-status`,
  url: `${PREFIX}-url`,
  lastFetched: `${PREFIX}-last-fetched`,
  fetchError: `${PREFIX}-fetch-error`,
} as const

export async function clearAtlassianProperties(blockUuid: string): Promise<void> {
  for (const key of Object.values(PROPERTY_KEYS)) {
    await removeBlockProperty(blockUuid, key)
  }
}

async function removeBlockProperty(blockUuid: string, key: string): Promise<void> {
  try {
    await (globalThis as any).logseq.Editor.removeBlockProperty(blockUuid, key)
  } catch {
    // Older DB graphs may not have the property value yet.
  }
}
