import { readSettings } from './settings'
import { normalizeSiteOrigin, serializeSiteConfigs, siteConfigsFromSettings } from './site-profiles'
import type { AtlassianSiteConfig } from './types'

const MANAGER_KEY = 'logseq-atlassian-linker-sites'
const STYLE_KEY = 'logseq-atlassian-linker-site-manager-style'
export const DOCUMENT_STYLE_ID = 'logseq-atlassian-linker-site-manager-document-style'
const ICON_PATH = 'icon.png'
const OPEN_MANAGER_ACTION = 'openAtlassianSiteManager'

type MainUiStyle = Record<string, string | number>

const FALLBACK_ICON_SVG = `
  <svg data-on-click="${OPEN_MANAGER_ACTION}" data-prevent-default="true" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1l-1.6 1.6" />
    <path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.6-1.6" />
  </svg>
`

export function mainUiStyle(): MainUiStyle {
  return {
    position: 'fixed',
    top: '64px',
    left: '50%',
    width: 'min(960px, calc(100vw - 48px))',
    maxHeight: 'calc(100vh - 96px)',
    height: 'min(760px, calc(100vh - 96px))',
    background: 'transparent',
    pointerEvents: 'auto',
    transform: 'translateX(-50%)',
    zIndex: 9999,
  }
}

export function siteManagerStyle(): string {
  return `
    html, body {
      box-sizing: border-box;
      width: 100%;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: transparent;
      color: var(--ls-primary-text-color, #1f2937);
      font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    *, *::before, *::after { box-sizing: inherit; }
    body {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow: hidden;
    }
    .atlassian-linker-panel {
      box-sizing: border-box;
      width: 100%;
      max-height: calc(100vh - 96px);
      overflow: auto;
      padding: 18px;
      border: 1px solid var(--ls-border-color, rgba(120, 120, 120, 0.28));
      border-radius: 8px;
      background: var(--ls-primary-background-color, #ffffff);
      color: var(--ls-primary-text-color, #1f2937);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.24);
    }
    .atlassian-linker-panel header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }
    .atlassian-linker-panel h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 650;
      letter-spacing: 0;
    }
    .atlassian-linker-grid {
      display: grid;
      grid-template-columns: minmax(220px, 1.4fr) minmax(180px, 1fr) minmax(220px, 1fr) 72px 68px;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
    }
    .atlassian-linker-grid-label {
      color: var(--ls-secondary-text-color, #6b7280);
      font-size: 12px;
      font-weight: 600;
    }
    .atlassian-linker-grid input {
      width: 100%;
      min-width: 0;
      height: 34px;
      padding: 7px 8px;
      border: 1px solid var(--ls-border-color, rgba(120, 120, 120, 0.28));
      border-radius: 6px;
      background: var(--ls-primary-background-color, #ffffff);
      color: var(--ls-primary-text-color, #1f2937);
      font: inherit;
    }
    .atlassian-linker-grid input[type="checkbox"] {
      width: 18px;
      height: 18px;
      justify-self: start;
    }
    .atlassian-linker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    .atlassian-linker-panel button {
      height: 34px;
      padding: 0 10px;
      border: 1px solid var(--ls-border-color, rgba(120, 120, 120, 0.28));
      border-radius: 6px;
      background: var(--ls-secondary-background-color, #f4f5f6);
      color: var(--ls-primary-text-color, #1f2937);
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
    }
    .atlassian-linker-danger {
      color: var(--ls-error-text-color, #c92a2a);
    }
    .atlassian-linker-note {
      margin: 12px 0 0;
      color: var(--ls-secondary-text-color, #6b7280);
      font-size: 12px;
    }
    @media (max-width: 720px) {
      .atlassian-linker-panel {
        padding: 14px;
      }
      .atlassian-linker-grid {
        grid-template-columns: 1fr;
      }
      .atlassian-linker-grid-label {
        display: none;
      }
      .atlassian-linker-grid input[type="checkbox"] {
        justify-self: start;
      }
      .atlassian-linker-actions {
        justify-content: stretch;
      }
      .atlassian-linker-actions button {
        flex: 1 1 0;
      }
    }
  `
}

export function toolbarHostStyle(): string {
  return `
    .atlassian-linker-toolbar-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      color: var(--ls-primary-text-color, currentColor);
      line-height: 1;
    }
    .atlassian-linker-toolbar-button img,
    .atlassian-linker-toolbar-button svg {
      display: block;
      width: 18px;
      height: 18px;
      object-fit: contain;
      pointer-events: none;
    }
    .atlassian-linker-toolbar-button svg * {
      pointer-events: none;
    }
  `
}

export function toolbarTemplate(iconUrl?: string): string {
  const icon = iconUrl
    ? `<img src="${escapeAttribute(iconUrl)}" data-on-click="${OPEN_MANAGER_ACTION}" data-prevent-default="true" alt="" aria-hidden="true" />`
    : FALLBACK_ICON_SVG

  return `
    <a class="button atlassian-linker-toolbar-button" data-on-click="${OPEN_MANAGER_ACTION}" data-prevent-default="true" title="Atlassian sites" aria-label="Atlassian sites">
      ${icon}
    </a>
  `
}

export function installSiteManagerDocumentStyle(doc: Document = document): void {
  let style = doc.getElementById(DOCUMENT_STYLE_ID) as HTMLStyleElement | null

  if (!style) {
    style = doc.createElement('style')
    style.id = DOCUMENT_STYLE_ID
    doc.head.append(style)
  }

  style.textContent = siteManagerStyle()
}

export function registerSiteManager(): void {
  const logseq = (globalThis as any).logseq
  const iconUrl = typeof logseq.resolveResourceFullUrl === 'function' ? logseq.resolveResourceFullUrl(ICON_PATH) : undefined

  logseq.provideStyle({
    key: STYLE_KEY,
    style: toolbarHostStyle(),
  })

  logseq.provideModel({
    openAtlassianSiteManager() {
      void openSiteManager()
    },
  })

  logseq.App.registerUIItem('toolbar', {
    key: MANAGER_KEY,
    template: toolbarTemplate(iconUrl),
  })

  logseq.App.registerCommandPalette(
    {
      key: MANAGER_KEY,
      label: 'Manage Atlassian sites',
    },
    () => {
      void openSiteManager()
    },
  )
}

async function openSiteManager(): Promise<void> {
  await (globalThis as any).logseq.setMainUIInlineStyle(mainUiStyle())
  renderSiteManager(siteConfigsFromSettings(readSettings()))
  await (globalThis as any).logseq.showMainUI({ autoFocus: true })
}

function renderSiteManager(configs: AtlassianSiteConfig[]): void {
  installSiteManagerDocumentStyle()

  const root = document.body
  root.replaceChildren()

  const panel = element('section', 'atlassian-linker-panel')
  const header = element('header')
  const title = element('h1')
  title.textContent = 'Atlassian Sites'

  const closeButton = button('Close')
  closeButton.addEventListener('click', () => {
    void (globalThis as any).logseq.hideMainUI({ restoreEditingCursor: true })
  })

  header.append(title, closeButton)
  panel.append(header, gridHeader())

  const rows = element('div')
  rows.dataset.role = 'rows'
  panel.append(rows)

  const initialRows = configs.length > 0 ? configs : [{ siteUrl: '', email: '', apiToken: '', enabled: true }]
  for (const config of initialRows) rows.append(siteRow(config))

  const note = element('p', 'atlassian-linker-note')
  note.textContent = 'Each enabled site uses only its own email and API token.'

  const actions = element('div', 'atlassian-linker-actions')
  const addButton = button('Add site')
  addButton.addEventListener('click', () => {
    rows.append(siteRow({ siteUrl: '', email: '', apiToken: '', enabled: true }))
  })

  const saveButton = button('Save')
  saveButton.addEventListener('click', () => void saveRows(rows))

  actions.append(addButton, saveButton)
  panel.append(note, actions)
  root.append(panel)
}

function gridHeader(): HTMLElement {
  const grid = element('div', 'atlassian-linker-grid')

  for (const label of ['Site URL', 'Email', 'API Token', 'Enabled', '']) {
    const item = element('div', 'atlassian-linker-grid-label')
    item.textContent = label
    grid.append(item)
  }

  return grid
}

function siteRow(config: AtlassianSiteConfig): HTMLElement {
  const row = element('div', 'atlassian-linker-grid')
  row.dataset.role = 'row'

  row.append(
    input('siteUrl', 'https://your-domain.atlassian.net', config.siteUrl),
    input('email', 'name@example.com', config.email),
    input('apiToken', 'API token', config.apiToken, 'password'),
  )

  const enabled = document.createElement('input')
  enabled.type = 'checkbox'
  enabled.name = 'enabled'
  enabled.checked = config.enabled !== false
  row.append(enabled)

  const removeButton = button('Remove', 'atlassian-linker-danger')
  removeButton.addEventListener('click', () => row.remove())
  row.append(removeButton)

  return row
}

async function saveRows(rows: HTMLElement): Promise<void> {
  const configs = [...rows.querySelectorAll<HTMLElement>('[data-role="row"]')]
    .map(rowToConfig)
    .filter((config) => config.siteUrl || config.email || config.apiToken)

  const invalid = configs.find((config) => config.enabled !== false && (!normalizeSiteOrigin(config.siteUrl) || !config.email || !config.apiToken))
  if (invalid) {
    await (globalThis as any).logseq.UI.showMsg('Each enabled site needs a valid site URL, email, and API token.', 'warning')
    return
  }

  await (globalThis as any).logseq.updateSettings({
    sitesConfig: serializeSiteConfigs(configs),
  })
  await (globalThis as any).logseq.UI.showMsg('Atlassian sites saved.', 'success')
  await (globalThis as any).logseq.hideMainUI({ restoreEditingCursor: true })
}

function rowToConfig(row: HTMLElement): AtlassianSiteConfig {
  return {
    id: crypto.randomUUID(),
    siteUrl: fieldValue(row, 'siteUrl'),
    email: fieldValue(row, 'email'),
    apiToken: fieldValue(row, 'apiToken'),
    enabled: row.querySelector<HTMLInputElement>('input[name="enabled"]')?.checked ?? true,
  }
}

function fieldValue(row: HTMLElement, name: string): string {
  return row.querySelector<HTMLInputElement>(`input[name="${name}"]`)?.value.trim() ?? ''
}

function input(name: string, placeholder: string, value: string, type = 'text'): HTMLInputElement {
  const inputElement = document.createElement('input')
  inputElement.name = name
  inputElement.type = type
  inputElement.placeholder = placeholder
  inputElement.value = value
  return inputElement
}

function button(label: string, className?: string): HTMLButtonElement {
  const buttonElement = document.createElement('button')
  buttonElement.type = 'button'
  buttonElement.textContent = label
  if (className) buttonElement.className = className
  return buttonElement
}

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  return node
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
