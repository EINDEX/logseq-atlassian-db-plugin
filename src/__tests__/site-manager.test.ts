import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_STYLE_ID,
  installSiteManagerDocumentStyle,
  mainUiStyle,
  siteManagerStyle,
  toolbarHostStyle,
  toolbarTemplate,
} from '../site-manager'

describe('site manager UI', () => {
  it('renders the toolbar entry with the packaged icon URL', () => {
    const template = toolbarTemplate('logseq://plugins/logseq-atlassian-linker/icon.png')

    expect(template).toContain('<img')
    expect(template).toContain('src="logseq://plugins/logseq-atlassian-linker/icon.png"')
    expect(template).toContain('aria-label="Atlassian sites"')
    expect(template).not.toContain('>ATL<')
  })

  it('lets toolbar icon clicks reach the site manager handler', () => {
    const template = toolbarTemplate('logseq://plugins/logseq-atlassian-linker/icon.png')
    const style = toolbarHostStyle()

    expect(template.match(/data-on-click="openAtlassianSiteManager"/g)).toHaveLength(2)
    expect(template).toContain('data-prevent-default="true"')
    expect(style).toContain('pointer-events: none')
  })

  it('sizes the main UI as a centered overlay', () => {
    expect(mainUiStyle()).toMatchObject({
      position: 'fixed',
      top: '64px',
      left: '50%',
      width: 'min(960px, calc(100vw - 48px))',
      height: 'min(760px, calc(100vh - 96px))',
      maxHeight: 'calc(100vh - 96px)',
      background: 'transparent',
      pointerEvents: 'auto',
      transform: 'translateX(-50%)',
      zIndex: 9999,
    })
  })

  it('resets the plugin iframe document defaults', () => {
    const style = siteManagerStyle()

    expect(style).toContain('html, body')
    expect(style).toContain('margin: 0')
    expect(style).toContain('background: transparent')
  })

  it('installs the manager style into the plugin document', () => {
    const appended: Array<{ id: string; textContent: string }> = []
    const doc = {
      getElementById: () => null,
      createElement: () => ({ id: '', textContent: '' }),
      head: {
        append: (node: { id: string; textContent: string }) => appended.push(node),
      },
    } as unknown as Document

    installSiteManagerDocumentStyle(doc)

    expect(appended).toHaveLength(1)
    expect(appended[0].id).toBe(DOCUMENT_STYLE_ID)
    expect(appended[0].textContent).toContain('.atlassian-linker-panel')
  })

  it('keeps host CSS scoped to the toolbar entry', () => {
    const style = toolbarHostStyle()

    expect(style).toContain('.atlassian-linker-toolbar-button')
    expect(style).not.toContain('html, body')
    expect(style).not.toContain('.atlassian-linker-panel')
  })
})
