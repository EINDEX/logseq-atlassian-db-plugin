import type { AtlassianLink, AtlassianMetadata, AtlassianSettings } from './types'
import { normalizeSiteOrigin, resolveSiteProfile } from './site-profiles'

export { normalizeSiteOrigin } from './site-profiles'

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
  spaceId?: string
  message?: string
  errorMessages?: string[]
}

type ConfluenceSpaceResponse = {
  id?: string
  key?: string
  name?: string
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
  const profile = resolveSiteProfile(link, settings)
  const requestSettings = {
    ...settings,
    siteUrl: profile.siteUrl,
    email: profile.email,
    apiToken: profile.apiToken,
  }

  assertConfiguredSiteMatchesLink(requestSettings, link)

  if (link.kind === 'jira') {
    const url = `${link.siteOrigin}/rest/api/3/issue/${encodeURIComponent(link.issueKey)}?fields=summary`
    return mapJiraIssue(link, (await requestJson(url, requestSettings)) as JiraIssueResponse)
  }

  const pageUrl = `${link.siteOrigin}/wiki/api/v2/pages/${encodeURIComponent(link.pageId)}`
  const page = (await requestJson(pageUrl, requestSettings)) as ConfluencePageResponse
  const space = page.spaceId
    ? (await requestJson(`${link.siteOrigin}/wiki/api/v2/spaces/${encodeURIComponent(page.spaceId)}`, requestSettings) as ConfluenceSpaceResponse)
    : undefined

  return mapConfluencePage(link, page, space)
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
  space?: ConfluenceSpaceResponse,
): AtlassianMetadata {
  const remoteError = extractAtlassianError(response)
  if (remoteError) throw new AtlassianFetchError(remoteError)
  const spaceError = space ? extractAtlassianError(space) : null
  if (spaceError) throw new AtlassianFetchError(spaceError)

  if (!response.title) {
    throw new AtlassianFetchError(`Confluence page ${link.pageId} did not include a title`)
  }

  return {
    kind: 'confluence',
    originalUrl: link.originalUrl,
    pageId: response.id ?? link.pageId,
    title: response.title,
    status: response.status ?? '',
    spaceId: response.spaceId,
    spaceKey: space?.key ?? link.spaceKey,
    spaceName: space?.name,
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

function assertConfiguredSiteMatchesLink(settings: AtlassianSettings, link: AtlassianLink): void {
  const siteOrigin = normalizeSiteOrigin(settings.siteUrl)
  if (!siteOrigin) throw new AtlassianFetchError('Configured Atlassian site URL is invalid')
  if (siteOrigin !== link.siteOrigin) {
    throw new AtlassianFetchError(`URL host ${link.siteOrigin} does not match configured site ${siteOrigin}`)
  }
}

function extractAtlassianError(response: JiraIssueResponse | ConfluencePageResponse | ConfluenceSpaceResponse): string | null {
  if (Array.isArray(response.errorMessages) && response.errorMessages.length > 0) {
    return response.errorMessages.join('; ')
  }

  if ('errors' in response && response.errors && Object.keys(response.errors).length > 0) {
    return Object.values(response.errors).join('; ')
  }

  if ('message' in response && response.message && !('title' in response && response.title) && !('name' in response && response.name)) {
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
