import { describe, expect, it } from 'vitest'
import { fetchAtlassianMetadata, mapConfluencePage, mapJiraIssue, normalizeSiteOrigin } from '../atlassian'
import type { AtlassianSettings } from '../types'

const settings: AtlassianSettings = {
  siteUrl: 'https://example.atlassian.net',
  email: 'person@example.com',
  apiToken: 'token',
  sitesConfig: '',
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

  it('fetches Jira issue titles using the REST v3 issue endpoint', async () => {
    const metadata = await fetchAtlassianMetadata(
      {
        kind: 'jira',
        originalUrl: 'https://example.atlassian.net/browse/ABC-123',
        siteOrigin: 'https://example.atlassian.net',
        issueKey: 'ABC-123',
      },
      settings,
      async (url) => {
        expect(url).toBe('https://example.atlassian.net/rest/api/3/issue/ABC-123?fields=summary')
        return {
          key: 'ABC-123',
          fields: { summary: 'Fix checkout' },
        }
      },
    )

    expect(metadata.title).toBe('Fix checkout')
  })

  it('uses credentials for the matching Atlassian site only', async () => {
    const metadata = await fetchAtlassianMetadata(
      {
        kind: 'jira',
        originalUrl: 'https://second.atlassian.net/browse/SEC-123',
        siteOrigin: 'https://second.atlassian.net',
        issueKey: 'SEC-123',
      },
      {
        ...settings,
        siteUrl: '',
        email: '',
        apiToken: '',
        sitesConfig: JSON.stringify([
          {
            siteUrl: 'https://first.atlassian.net',
            email: 'first@example.com',
            apiToken: 'first-token',
            enabled: true,
          },
          {
            siteUrl: 'https://second.atlassian.net',
            email: 'second@example.com',
            apiToken: 'second-token',
            enabled: true,
          },
        ]),
      },
      async (_url, requestSettings) => {
        expect(requestSettings.email).toBe('second@example.com')
        expect(requestSettings.apiToken).toBe('second-token')

        return {
          key: 'SEC-123',
          fields: { summary: 'Rotate token' },
        }
      },
    )

    expect(metadata.title).toBe('Rotate token')
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

  it('fetches Confluence page space details when the page includes a space id', async () => {
    const requests: string[] = []
    const metadata = await fetchAtlassianMetadata(
      {
        kind: 'confluence',
        originalUrl: 'https://example.atlassian.net/wiki/spaces/ENG/pages/123/Page',
        siteOrigin: 'https://example.atlassian.net',
        pageId: '123',
      },
      settings,
      async (url) => {
        requests.push(url)

        if (url === 'https://example.atlassian.net/wiki/api/v2/pages/123') {
          return { id: '123', title: 'Runbook', status: 'current', spaceId: '456' }
        }

        if (url === 'https://example.atlassian.net/wiki/api/v2/spaces/456') {
          return { id: '456', key: 'ENG', name: 'Engineering' }
        }

        throw new Error(`Unexpected URL: ${url}`)
      },
    )

    expect(requests).toEqual([
      'https://example.atlassian.net/wiki/api/v2/pages/123',
      'https://example.atlassian.net/wiki/api/v2/spaces/456',
    ])
    expect(metadata).toMatchObject({
      kind: 'confluence',
      pageId: '123',
      title: 'Runbook',
      spaceId: '456',
      spaceKey: 'ENG',
      spaceName: 'Engineering',
    })
  })

  it('rejects links from an unconfigured Atlassian site', async () => {
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
    ).rejects.toThrow('No credentials configured for https://other.atlassian.net')
  })

  it('normalizes site settings without an explicit protocol', () => {
    expect(normalizeSiteOrigin('example.atlassian.net')).toBe('https://example.atlassian.net')
  })
})
