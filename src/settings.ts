import type { AtlassianSettings } from './types'

export const DEFAULT_SETTINGS: AtlassianSettings = {
  siteUrl: '',
  email: '',
  apiToken: '',
  sitesConfig: '',
  autoRewrite: true,
  requestTimeout: 10000,
}

export function registerSettingsSchema(): void {
  ;(globalThis as any).logseq.useSettingsSchema([
    {
      key: 'siteUrl',
      type: 'string',
      default: DEFAULT_SETTINGS.siteUrl,
      title: 'Legacy Atlassian site URL',
      description: 'Single-site fallback. Use the toolbar manager for multiple sites.',
    },
    {
      key: 'email',
      type: 'string',
      default: DEFAULT_SETTINGS.email,
      title: 'Legacy Atlassian account email',
      description: 'Single-site fallback email.',
    },
    {
      key: 'apiToken',
      type: 'string',
      default: DEFAULT_SETTINGS.apiToken,
      title: 'Legacy Atlassian API token',
      description: 'Single-site fallback token.',
      inputAs: 'textarea',
    },
    {
      key: 'sitesConfig',
      type: 'string',
      default: DEFAULT_SETTINGS.sitesConfig,
      title: 'Atlassian sites config',
      description: 'Managed by the Atlassian Linker toolbar panel.',
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
    sitesConfig: raw.sitesConfig ?? DEFAULT_SETTINGS.sitesConfig,
    autoRewrite: raw.autoRewrite ?? DEFAULT_SETTINGS.autoRewrite,
    requestTimeout: normalizeTimeout(raw.requestTimeout),
  }
}

function normalizeTimeout(value: unknown): number {
  const parsed = Number(value ?? DEFAULT_SETTINGS.requestTimeout)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SETTINGS.requestTimeout
}
