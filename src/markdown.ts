import { parseAtlassianUrl, stripWrappingPunctuation } from './parser'
import type { AtlassianLink, AtlassianMetadata, LinkResolution } from './types'

export type RewriteResult = {
  content: string
  changed: boolean
  resolutions: LinkResolution[]
}

type Resolver = (link: AtlassianLink) => Promise<AtlassianMetadata>

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
      segments.push(resolution.metadata ? toMarkdownLink(resolution.metadata, url) : fullMatch)
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

  return metadata.title || `Confluence page ${metadata.pageId ?? ''}`.trim()
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
      segments.push(resolution.metadata ? toMarkdownLink(resolution.metadata, trimmedUrl) : trimmedUrl)
      segments.push(trailing)
    }

    cursor = index + rawMatch.length
  }

  segments.push(content.slice(cursor))
  return segments.join('')
}

async function resolveLink(link: AtlassianLink, resolve: Resolver): Promise<LinkResolution> {
  try {
    return { link, metadata: await resolve(link) }
  } catch (error) {
    return { link, error: errorToMessage(error) }
  }
}

function toMarkdownLink(metadata: AtlassianMetadata, url: string): string {
  return `[${escapeMarkdownLabel(metadataToLabel(metadata))}](${escapeMarkdownUrl(url)})`
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
