import { parseAtlassianUrl, stripWrappingPunctuation } from './parser'
import { AtlassianSiteConfigError } from './site-profiles'
import type { AtlassianLink, AtlassianMetadata, LinkResolution } from './types'

export type RewriteResult = {
  content: string
  changed: boolean
  resolutions: LinkResolution[]
}

type Resolver = (link: AtlassianLink) => Promise<AtlassianMetadata>
type ResolvedLink = LinkResolution & {
  preserveOriginal?: boolean
}

const MARKDOWN_LINK_RE = /\[([^\]\n]*(?:\\\][^\]\n]*)*)\]\((https?:\/\/[^)\s]+)\)/gi
const RAW_URL_RE = /https?:\/\/[^\s<>\]]+/gi

export async function rewriteAtlassianLinks(
  content: string,
  resolve: Resolver,
): Promise<RewriteResult> {
  const resolutions: LinkResolution[] = []
  const segments: string[] = []
  let cursor = 0

  for (const match of content.matchAll(MARKDOWN_LINK_RE)) {
    const index = match.index ?? 0
    const fullMatch = match[0]
    const url = match[2]

    segments.push(await rewriteRawUrls(content.slice(cursor, index), resolve, resolutions))

    const link = parseAtlassianUrl(url)
    if (!link) {
      segments.push(fullMatch)
    } else {
      const resolution = await resolveLink(link, resolve)
      resolutions.push(resolution)
      segments.push(
        resolution.preserveOriginal
          ? fullMatch
          : resolution.metadata
          ? toMarkdownLink(resolution.metadata, url)
          : isUrlLabel(match[1], url)
            ? toMarkdownLinkWithLabel(fallbackLabel(link), url)
            : fullMatch,
      )
    }

    cursor = index + fullMatch.length
  }

  segments.push(await rewriteRawUrls(content.slice(cursor), resolve, resolutions))

  const rewritten = segments.join('')
  return {
    content: rewritten,
    changed: rewritten !== content,
    resolutions,
  }
}

export function metadataToLabel(metadata: AtlassianMetadata): string {
  if (metadata.kind === 'jira') {
    const key = metadata.key ?? 'Jira'
    return `${key}: ${metadata.title || key}`
  }

  const title = metadata.title || `Confluence page ${metadata.pageId ?? ''}`.trim()
  const space = metadata.spaceName || metadata.spaceKey
  return space ? `${space}: ${title}` : title
}

async function rewriteRawUrls(
  content: string,
  resolve: Resolver,
  resolutions: LinkResolution[],
): Promise<string> {
  const segments: string[] = []
  let cursor = 0

  for (const match of content.matchAll(RAW_URL_RE)) {
    const index = match.index ?? 0
    const rawMatch = match[0]
    const trimmedUrl = stripWrappingPunctuation(rawMatch)
    const trailing = rawMatch.slice(trimmedUrl.length)
    const link = parseAtlassianUrl(trimmedUrl)

    segments.push(content.slice(cursor, index))

    if (!link) {
      segments.push(rawMatch)
    } else {
      const resolution = await resolveLink(link, resolve)
      resolutions.push(resolution)
      segments.push(
        resolution.preserveOriginal
          ? rawMatch
          : resolution.metadata
          ? toMarkdownLink(resolution.metadata, trimmedUrl)
          : toMarkdownLinkWithLabel(fallbackLabel(link), trimmedUrl),
      )
      segments.push(trailing)
    }

    cursor = index + rawMatch.length
  }

  segments.push(content.slice(cursor))
  return segments.join('')
}

async function resolveLink(link: AtlassianLink, resolve: Resolver): Promise<ResolvedLink> {
  try {
    return { link, metadata: await resolve(link) }
  } catch (error) {
    return {
      link,
      error: errorToMessage(error),
      preserveOriginal: error instanceof AtlassianSiteConfigError,
    }
  }
}

function toMarkdownLink(metadata: AtlassianMetadata, url: string): string {
  return toMarkdownLinkWithLabel(metadataToLabel(metadata), url)
}

function toMarkdownLinkWithLabel(label: string, url: string): string {
  return `[${escapeMarkdownLabel(label)}](${escapeMarkdownUrl(url)})`
}

function fallbackLabel(link: AtlassianLink): string {
  if (link.kind === 'jira') return link.issueKey
  return `Confluence page ${link.pageId}`
}

function isUrlLabel(label: string, url: string): boolean {
  return label.trim() === url
}

function escapeMarkdownLabel(label: string): string {
  return label.replace(/\s+/g, ' ').replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]').trim()
}

function escapeMarkdownUrl(url: string): string {
  return url.replace(/\)/g, '%29')
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Unknown Atlassian fetch error'
}
