import { describe, expect, it } from 'vitest'
import { resolveSiteProfile } from '../site-profiles'
import type { AtlassianLink, AtlassianSettings } from '../types'

const baseSettings: AtlassianSettings = {
  siteUrl: '',
  email: '',
  apiToken: '',
  sitesConfig: '',
  autoRewrite: true,
  requestTimeout: 10000,
}

describe('site profile resolution', () => {
  it('selects credentials by exact Atlassian site origin', () => {
    const settings = withSites([
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
    ])

    expect(resolveSiteProfile(jiraLink('https://second.atlassian.net', 'SEC-123'), settings)).toMatchObject({
      siteOrigin: 'https://second.atlassian.net',
      email: 'second@example.com',
      apiToken: 'second-token',
    })
  })

  it('rejects a link from an unconfigured Atlassian site', () => {
    const settings = withSites([
      {
        siteUrl: 'https://first.atlassian.net',
        email: 'first@example.com',
        apiToken: 'first-token',
        enabled: true,
      },
    ])

    expect(() => resolveSiteProfile(jiraLink('https://second.atlassian.net', 'SEC-123'), settings)).toThrow(
      'No credentials configured for https://second.atlassian.net',
    )
  })

  it('ignores disabled site profiles', () => {
    const settings = withSites([
      {
        siteUrl: 'https://first.atlassian.net',
        email: 'first@example.com',
        apiToken: 'first-token',
        enabled: false,
      },
    ])

    expect(() => resolveSiteProfile(jiraLink('https://first.atlassian.net', 'SEC-123'), settings)).toThrow(
      'No credentials configured for https://first.atlassian.net',
    )
  })

  it('uses the legacy single-site settings when no dynamic sites are configured', () => {
    const settings: AtlassianSettings = {
      ...baseSettings,
      siteUrl: 'first.atlassian.net',
      email: 'first@example.com',
      apiToken: 'first-token',
    }

    expect(resolveSiteProfile(jiraLink('https://first.atlassian.net', 'SEC-123'), settings)).toMatchObject({
      siteOrigin: 'https://first.atlassian.net',
      email: 'first@example.com',
      apiToken: 'first-token',
    })
  })
})

function withSites(sites: unknown[]): AtlassianSettings {
  return {
    ...baseSettings,
    sitesConfig: JSON.stringify(sites),
  }
}

function jiraLink(siteOrigin: string, issueKey: string): AtlassianLink {
  return {
    kind: 'jira',
    originalUrl: `${siteOrigin}/browse/${issueKey}`,
    siteOrigin,
    issueKey,
  }
}
