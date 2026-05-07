import type { AtlassianSettings } from './types'

export const DEFAULT_SETTINGS: AtlassianSettings = {
  siteUrl: '',
  email: '',
  apiToken: '',
  autoRewrite: true,
  requestTimeout: 10000,
}

export function registerSettingsSchema(): void {
  ;(globalThis as any).logseq.useSettingsSchema([
    {
      key: 'siteUrl',
      type: 'string',
      default: DEFAULT_SETTINGS.siteUrl,
      title: 'Atlassian site URL',
      description: 'Example: https://your-domain.atlassian.net',
    },
    {
      key: 'email',
      type: 'string',
      default: DEFAULT_SETTINGS.email,
      title: 'Atlassian account email',
      description: 'Email address used with the Atlassian API token.',
    },
    {
      key: 'apiToken',
      type: 'string',
      default: DEFAULT_SETTINGS.apiToken,
      title: 'Atlassian API token',
      description: 'Personal Atlassian API token. Stored in Logseq plugin settings.',
      inputAs: 'textarea',
    },
    {
      key: 'autoRewrite',
      type: 'boolean',
      default: DEFAULT_SETTINGS.autoRewrite,
      title: 'Auto rewrite links',
      description: 'Automatically rewrite Atlassian URLs when DB blocks change.',
    },
    {
      key: 'requestTimeout',
      type: 'number',
      default: DEFAULT_SETTINGS.requestTimeout,
      title: 'Request timeout',
      description: 'Timeout in milliseconds for Atlassian metadata requests.',
    },
  ])
}

export function readSettings(): AtlassianSettings {
  const raw = ((globalThis as any).logseq.settings ?? {}) as Partial<AtlassianSettings>

  return {
    siteUrl: raw.siteUrl ?? DEFAULT_SETTINGS.siteUrl,
    email: raw.email ?? DEFAULT_SETTINGS.email,
    apiToken: raw.apiToken ?? DEFAULT_SETTINGS.apiToken,
    autoRewrite: raw.autoRewrite ?? DEFAULT_SETTINGS.autoRewrite,
    requestTimeout: normalizeTimeout(raw.requestTimeout),
  }
}

function normalizeTimeout(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_SETTINGS.requestTimeout)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.requestTimeout
}
