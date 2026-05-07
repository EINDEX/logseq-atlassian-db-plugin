import type { AtlassianLink, AtlassianSettings, AtlassianSiteConfig, AtlassianSiteProfile } from './types'

export class AtlassianSiteConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AtlassianSiteConfigError'
  }
}

type SiteCandidate = {
  id: string
  siteUrl: string
  siteOrigin: string | null
  email: string
  apiToken: string
  enabled: boolean
}

export function resolveSiteProfile(link: AtlassianLink, settings: AtlassianSettings): AtlassianSiteProfile {
  const candidate = siteCandidatesFromSettings(settings).find((profile) => profile.siteOrigin === link.siteOrigin)

  if (!candidate || !candidate.enabled || !candidate.siteOrigin) {
    throw new AtlassianSiteConfigError(`No credentials configured for ${link.siteOrigin}`)
  }

  if (!candidate.email || !candidate.apiToken) {
    throw new AtlassianSiteConfigError(`Credentials for ${link.siteOrigin} are incomplete`)
  }

  const siteOrigin = candidate.siteOrigin

  return {
    id: candidate.id,
    siteUrl: candidate.siteUrl,
    siteOrigin,
    email: candidate.email,
    apiToken: candidate.apiToken,
    enabled: candidate.enabled,
  }
}

export function siteConfigsFromSettings(settings: AtlassianSettings): AtlassianSiteConfig[] {
  const parsed = parseSitesConfig(settings.sitesConfig)
  if (parsed.length > 0) return parsed

  if (settings.siteUrl.trim() || settings.email.trim() || settings.apiToken.trim()) {
    return [
      {
        id: 'legacy-site',
        siteUrl: settings.siteUrl,
        email: settings.email,
        apiToken: settings.apiToken,
        enabled: true,
      },
    ]
  }

  return []
}

export function parseSitesConfig(value: string): AtlassianSiteConfig[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    throw new AtlassianSiteConfigError('Atlassian sites config must be valid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new AtlassianSiteConfigError('Atlassian sites config must be a JSON array')
  }

  return parsed.map((entry, index) => normalizeConfigEntry(entry, index))
}

export function serializeSiteConfigs(configs: AtlassianSiteConfig[]): string {
  return JSON.stringify(configs.map((config, index) => normalizeConfigEntry(config, index)), null, 2)
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

function siteCandidatesFromSettings(settings: AtlassianSettings): SiteCandidate[] {
  return siteConfigsFromSettings(settings).map((config, index) => {
    const siteUrl = stringValue(config.siteUrl)

    return {
      id: stringValue(config.id) || `site-${index + 1}`,
      siteUrl,
      siteOrigin: normalizeSiteOrigin(siteUrl),
      email: stringValue(config.email),
      apiToken: stringValue(config.apiToken),
      enabled: config.enabled !== false,
    }
  })
}

function normalizeConfigEntry(entry: unknown, index: number): AtlassianSiteConfig {
  const record = isRecord(entry) ? entry : {}

  return {
    id: stringValue(record.id) || `site-${index + 1}`,
    siteUrl: stringValue(record.siteUrl),
    email: stringValue(record.email),
    apiToken: stringValue(record.apiToken),
    enabled: record.enabled !== false,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
