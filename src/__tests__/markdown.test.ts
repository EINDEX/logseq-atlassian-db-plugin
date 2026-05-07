import { describe, expect, it } from 'vitest'
import { rewriteAtlassianLinks } from '../markdown'
import type { AtlassianLink, AtlassianMetadata } from '../types'

describe('rewriteAtlassianLinks', () => {
  it('rewrites a raw Jira URL to a Markdown link', async () => {
    const result = await rewriteAtlassianLinks(
      'See https://example.atlassian.net/browse/ABC-123',
      resolver({
        kind: 'jira',
        key: 'ABC-123',
        title: 'Fix checkout',
        status: 'In Progress',
        originalUrl: 'https://example.atlassian.net/browse/ABC-123',
      }),
    )

    expect(result.content).toBe('See [ABC-123: Fix checkout](https://example.atlassian.net/browse/ABC-123)')
    expect(result.changed).toBe(true)
  })

  it('corrects an existing Markdown link label', async () => {
    const result = await rewriteAtlassianLinks(
      '[old label](https://example.atlassian.net/wiki/pages/viewpage.action?pageId=123)',
      resolver({
        kind: 'confluence',
        pageId: '123',
        title: 'Runbook',
        status: 'current',
        originalUrl: 'https://example.atlassian.net/wiki/pages/viewpage.action?pageId=123',
      }),
    )

    expect(result.content).toBe('[Runbook](https://example.atlassian.net/wiki/pages/viewpage.action?pageId=123)')
  })

  it('rewrites multiple Atlassian links in one block', async () => {
    const result = await rewriteAtlassianLinks(
      'Links: https://example.atlassian.net/browse/ABC-123 and https://example.atlassian.net/wiki/spaces/ENG/pages/456/Page',
      async (link) => {
        if (link.kind === 'jira') {
          return {
            kind: 'jira',
            key: link.issueKey,
            title: 'Fix checkout',
            status: 'Done',
            originalUrl: link.originalUrl,
          }
        }

        return {
          kind: 'confluence',
          pageId: link.pageId,
          title: 'Engineering Page',
          status: 'current',
          originalUrl: link.originalUrl,
        }
      },
    )

    expect(result.content).toContain('[ABC-123: Fix checkout](https://example.atlassian.net/browse/ABC-123)')
    expect(result.content).toContain('[Engineering Page](https://example.atlassian.net/wiki/spaces/ENG/pages/456/Page)')
    expect(result.resolutions).toHaveLength(2)
  })

  it('leaves visible text unchanged when fetch fails', async () => {
    const content = 'See https://example.atlassian.net/browse/ABC-123'
    const result = await rewriteAtlassianLinks(content, async () => {
      throw new Error('Unauthorized')
    })

    expect(result.content).toBe(content)
    expect(result.changed).toBe(false)
    expect(result.resolutions[0].error).toBe('Unauthorized')
  })

  it('does not change non-Atlassian links', async () => {
    const content = 'See https://example.com/browse/ABC-123'
    const result = await rewriteAtlassianLinks(content, resolver({
      kind: 'jira',
      key: 'ABC-123',
      title: 'Fix checkout',
      status: 'Done',
      originalUrl: content,
    }))

    expect(result.content).toBe(content)
    expect(result.resolutions).toHaveLength(0)
  })
})

function resolver(metadata: AtlassianMetadata) {
  return async (_link: AtlassianLink) => metadata
}
