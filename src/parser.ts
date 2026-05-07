import type { AtlassianLink } from './types'

const ATLASSIAN_HOST_RE = /(^|\.)atlassian\.net$/i
const ISSUE_KEY_RE = /\b([A-Z][A-Z0-9_]*-\d+)\b/i

export function parseAtlassianUrl(input: string): AtlassianLink | null {
  const normalizedInput = stripWrappingPunctuation(input.trim())

  let url: URL
  try {
    url = new URL(normalizedInput)
  } catch {
    return null
  }

  if (!ATLASSIAN_HOST_RE.test(url.hostname)) return null

  const confluence = parseConfluenceUrl(url, normalizedInput)
  if (confluence) return confluence

  const jira = parseJiraUrl(url, normalizedInput)
  if (jira) return jira

  return null
}

export function stripWrappingPunctuation(value: string): string {
  let next = value

  while (/[.,;:!?]$/.test(next)) {
    next = next.slice(0, -1)
  }

  while (hasUnmatchedTrailingWrapper(next)) {
    next = next.slice(0, -1)
  }

  return next
}

function hasUnmatchedTrailingWrapper(value: string): boolean {
  const last = value.at(-1)
  if (!last || !')]}>'.includes(last)) return false

  const pairs: Record<string, string> = {
    ')': '(',
    ']': '[',
    '}': '{',
    '>': '<',
  }

  const opener = pairs[last]
  return countChar(value, last) > countChar(value, opener)
}

function countChar(value: string, char: string): number {
  return [...value].filter((candidate) => candidate === char).length
}

function parseJiraUrl(url: URL, originalUrl: string): AtlassianLink | null {
  const selectedIssue = url.searchParams.get('selectedIssue')
  const selectedIssueMatch = selectedIssue?.match(ISSUE_KEY_RE)
  if (selectedIssueMatch) {
    return jiraLink(url, originalUrl, selectedIssueMatch[1])
  }

  const browseMatch = url.pathname.match(/\/browse\/([A-Z][A-Z0-9_]+-\d+)(?:$|[/?#])/i)
  if (browseMatch) {
    return jiraLink(url, originalUrl, browseMatch[1])
  }

  const pathMatch = decodeURIComponent(url.pathname).match(ISSUE_KEY_RE)
  if (pathMatch) {
    return jiraLink(url, originalUrl, pathMatch[1])
  }

  return null
}

function parseConfluenceUrl(url: URL, originalUrl: string): AtlassianLink | null {
  const pageId = url.searchParams.get('pageId')
  if (pageId && /^\d+$/.test(pageId)) {
    return confluenceLink(url, originalUrl, pageId)
  }

  const pathMatch = url.pathname.match(/\/wiki\/spaces\/[^/]+\/pages\/(\d+)(?:$|\/|[?#])/i)
  if (pathMatch) {
    const spaceKey = decodeURIComponent(url.pathname.match(/\/wiki\/spaces\/([^/]+)\/pages\//i)?.[1] ?? '')
    return confluenceLink(url, originalUrl, pathMatch[1], spaceKey || undefined)
  }

  return null
}

function jiraLink(url: URL, originalUrl: string, issueKey: string): AtlassianLink {
  return {
    kind: 'jira',
    originalUrl,
    siteOrigin: url.origin,
    issueKey: issueKey.toUpperCase(),
  }
}

function confluenceLink(url: URL, originalUrl: string, pageId: string, spaceKey?: string): AtlassianLink {
  return {
    kind: 'confluence',
    originalUrl,
    siteOrigin: url.origin,
    pageId,
    spaceKey,
  }
}
