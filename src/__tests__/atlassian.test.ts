import { describe, expect, it } from 'vitest'
import { fetchAtlassianMetadata, mapConfluencePage, mapJiraIssue, normalizeSiteOrigin } from '../atlassian'
import type { AtlassianSettings } from '../types'

const settings: AtlassianSettings = {
  siteUrl: 'https://example.atlassian.net',
  email: 'person@example.com',
  apiToken: 'token',
  autoRewrite: true,
  requestTimeout: 10000,
}

describe('Atlassian metadata mapping', () => {
  it('maps Jira issue responses', () => {
    expect(
      mapJiraIssue(
        {
          kind: 'jira',
          originalUrl: 'https://example.atlassian.net/browse/ABC-123',
          siteOrigin: 'https://example.atlassian.net',
          issueKey: 'ABC-123',
        },
        {
          key: 'ABC-123',
          fields: {
            summary: 'Fix checkout',
            status: { name: 'In Progress' },
          },
        },
      ),
    ).toMatchObject({
      kind: 'jira',
      key: 'ABC-123',
      title: 'Fix checkout',
      status: 'In Progress',
    })
  })

  it('maps Confluence page responses', () => {
    expect(
      mapConfluencePage(
        {
          kind: 'confluence',
          originalUrl: 'https://example.atlassian.net/wiki/spaces/ENG/pages/123/Page',
          siteOrigin: 'https://example.atlassian.net',
          pageId: '123',
        },
        {
          id: '123',
          title: 'Runbook',
          status: 'current',
        },
      ),
    ).toMatchObject({
      kind: 'confluence',
      pageId: '123',
      title: 'Runbook',
      status: 'current',
    })
  })

  it('fetches Jira using the REST v3 issue endpoint', async () => {
    const metadata = await fetchAtlassianMetadata(
      {
        kind: 'jira',
        originalUrl: 'https://example.atlassian.net/browse/ABC-123',
        siteOrigin: 'https://example.atlassian.net',
        issueKey: 'ABC-123',
      },
      settings,
      async (url) => {
        expect(url).toBe('https://example.atlassian.net/rest/api/3/issue/ABC-123?fields=summary,status')
        return {
          key: 'ABC-123',
          fields: { summary: 'Fix checkout', status: { name: 'Done' } },
        }
      },
    )

    expect(metadata.title).toBe('Fix checkout')
  })

  it('fetches Confluence using the REST v2 page endpoint', async () => {
    const metadata = await fetchAtlassianMetadata(
      {
        kind: 'confluence',
        originalUrl: 'https://example.atlassian.net/wiki/spaces/ENG/pages/123/Page',
        siteOrigin: 'https://example.atlassian.net',
        pageId: '123',
      },
      settings,
      async (url) => {
        expect(url).toBe('https://example.atlassian.net/wiki/api/v2/pages/123')
        return { id: '123', title: 'Runbook', status: 'current' }
      },
    )

    expect(metadata.status).toBe('current')
  })

  it('rejects links from a different Atlassian site', async () => {
    await expect(
      fetchAtlassianMetadata(
        {
          kind: 'jira',
          originalUrl: 'https://other.atlassian.net/browse/ABC-123',
          siteOrigin: 'https://other.atlassian.net',
          issueKey: 'ABC-123',
        },
        settings,
        async () => ({}),
      ),
    ).rejects.toThrow('does not match configured site')
  })

  it('normalizes site settings without an explicit protocol', () => {
    expect(normalizeSiteOrigin('example.atlassian.net')).toBe('https://example.atlassian.net')
  })
})
