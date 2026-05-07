import type { AtlassianLink, AtlassianMetadata, AtlassianSettings } from './types'

type JiraIssueResponse = {
  key?: string
  fields?: {
    summary?: string
    status?: {
      name?: string
    }
  }
  errorMessages?: string[]
  errors?: Record<string, string>
}

type ConfluencePageResponse = {
  id?: string
  title?: string
  status?: string
  message?: string
  errorMessages?: string[]
}

type RequestJson = (url: string, settings: AtlassianSettings) => Promise<unknown>

export class AtlassianFetchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AtlassianFetchError'
  }
}

export async function fetchAtlassianMetadata(
  link: AtlassianLink,
  settings: AtlassianSettings,
  requestJson: RequestJson,
): Promise<AtlassianMetadata> {
  assertSettings(settings)
  assertConfiguredSiteMatchesLink(settings, link)

  if (link.kind === 'jira') {
    const url = `${link.siteOrigin}/rest/api/3/issue/${encodeURIComponent(link.issueKey)}?fields=summary,status`
    return mapJiraIssue(link, (await requestJson(url, settings)) as JiraIssueResponse)
  }

  const url = `${link.siteOrigin}/wiki/api/v2/pages/${encodeURIComponent(link.pageId)}`
  return mapConfluencePage(link, (await requestJson(url, settings)) as ConfluencePageResponse)
}

export function mapJiraIssue(link: Extract<AtlassianLink, { kind: 'jira' }>, response: JiraIssueResponse): AtlassianMetadata {
  const remoteError = extractAtlassianError(response)
  if (remoteError) throw new AtlassianFetchError(remoteError)

  const key = response.key ?? link.issueKey
  const title = response.fields?.summary
  const status = response.fields?.status?.name

  if (!title) throw new AtlassianFetchError(`Jira issue ${link.issueKey} did not include a summary`)

  return {
    kind: 'jira',
    originalUrl: link.originalUrl,
    key,
    title,
    status: status ?? '',
  }
}

export function mapConfluencePage(
  link: Extract<AtlassianLink, { kind: 'confluence' }>,
  response: ConfluencePageResponse,
): AtlassianMetadata {
  const remoteError = extractAtlassianError(response)
  if (remoteError) throw new AtlassianFetchError(remoteError)

  if (!response.title) {
    throw new AtlassianFetchError(`Confluence page ${link.pageId} did not include a title`)
  }

  return {
    kind: 'confluence',
    originalUrl: link.originalUrl,
    pageId: response.id ?? link.pageId,
    title: response.title,
    status: response.status ?? '',
  }
}

export async function logseqRequestJson<T>(url: string, settings: AtlassianSettings): Promise<T> {
  const request = (globalThis as any).logseq?.Request
  if (!request?._request) {
    throw new AtlassianFetchError('Logseq request API is unavailable')
  }

  const response = await request._request({
    url,
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${toBase64Utf8(`${settings.email}:${settings.apiToken}`)}`,
    },
    returnType: 'json',
    timeout: settings.requestTimeout,
  })

  return response as T
}

export function normalizeSiteOrigin(siteUrl: string): string | null {
  const trimmed = siteUrl.trim()
  if (!trimmed) return null
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(withProtocol)
    return url.origin
  } catch {
    return null
  }
}

function assertSettings(settings: AtlassianSettings): void {
  const missing = [
    settings.siteUrl.trim() ? null : 'site URL',
    settings.email.trim() ? null : 'email',
    settings.apiToken.trim() ? null : 'API token',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new AtlassianFetchError(`Configure Atlassian ${missing.join(', ')} in plugin settings`)
  }
}

function assertConfiguredSiteMatchesLink(settings: AtlassianSettings, link: AtlassianLink): void {
  const siteOrigin = normalizeSiteOrigin(settings.siteUrl)
  if (!siteOrigin) throw new AtlassianFetchError('Configured Atlassian site URL is invalid')
  if (siteOrigin !== link.siteOrigin) {
    throw new AtlassianFetchError(`URL host ${link.siteOrigin} does not match configured site ${siteOrigin}`)
  }
}

function extractAtlassianError(response: JiraIssueResponse | ConfluencePageResponse): string | null {
  if (Array.isArray(response.errorMessages) && response.errorMessages.length > 0) {
    return response.errorMessages.join('; ')
  }

  if ('errors' in response && response.errors && Object.keys(response.errors).length > 0) {
    return Object.values(response.errors).join('; ')
  }

  if ('message' in response && response.message && !response.title) {
    return response.message
  }

  return null
}

function toBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  if (typeof globalThis.btoa === 'function') return globalThis.btoa(binary)

  const buffer = (globalThis as any).Buffer
  if (buffer) return buffer.from(bytes).toString('base64')

  throw new AtlassianFetchError('No base64 encoder is available')
}
