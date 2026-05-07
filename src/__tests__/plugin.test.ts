import { afterEach, describe, expect, it, vi } from 'vitest'
import { startPlugin } from '../plugin'
import { PROPERTY_KEYS } from '../properties'
import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

describe('startPlugin', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('rewrites pasted raw Atlassian links without writing block properties', async () => {
    vi.useFakeTimers()

    let onChanged: ((event: { blocks: BlockEntity[] }) => void) | undefined
    const updateBlock = vi.fn().mockResolvedValue(undefined)
    const upsertProperty = vi.fn().mockResolvedValue({ id: 1 })
    const upsertBlockProperty = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('logseq', {
      settings: {
        siteUrl: 'https://example.atlassian.net',
        email: 'person@example.com',
        apiToken: 'token',
      },
      useSettingsSchema: vi.fn(),
      provideModel: vi.fn(),
      provideStyle: vi.fn(),
      showMainUI: vi.fn(),
      hideMainUI: vi.fn(),
      onSettingsChanged: vi.fn(() => vi.fn()),
      beforeunload: vi.fn(),
      App: {
        checkCurrentIsDbGraph: vi.fn().mockResolvedValue(true),
        registerUIItem: vi.fn(),
        registerCommandPalette: vi.fn(),
      },
      DB: {
        onChanged: vi.fn((callback: (event: { blocks: BlockEntity[] }) => void) => {
          onChanged = callback
          return vi.fn()
        }),
      },
      Editor: {
        updateBlock,
        upsertProperty,
        upsertBlockProperty,
        removeBlockProperty: vi.fn().mockResolvedValue(undefined),
      },
      UI: {
        showMsg: vi.fn().mockResolvedValue(undefined),
      },
    })

    await startPlugin()

    onChanged?.({
      blocks: [
        {
          uuid: 'block-1',
          title: 'See https://example.atlassian.net/browse/ABC-123',
        } as unknown as BlockEntity,
      ],
    })

    await vi.advanceTimersByTimeAsync(600)

    expect(updateBlock).toHaveBeenCalledWith(
      'block-1',
      'See [ABC-123](https://example.atlassian.net/browse/ABC-123)',
    )
    expect(upsertProperty).not.toHaveBeenCalled()
    expect(upsertBlockProperty).not.toHaveBeenCalled()
  })

  it('clears legacy Atlassian properties from changed blocks', async () => {
    vi.useFakeTimers()

    let onChanged: ((event: { blocks: BlockEntity[] }) => void) | undefined
    const removeBlockProperty = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('logseq', {
      settings: {
        siteUrl: 'https://example.atlassian.net',
        email: 'person@example.com',
        apiToken: 'token',
      },
      useSettingsSchema: vi.fn(),
      provideModel: vi.fn(),
      provideStyle: vi.fn(),
      showMainUI: vi.fn(),
      hideMainUI: vi.fn(),
      onSettingsChanged: vi.fn(() => vi.fn()),
      beforeunload: vi.fn(),
      App: {
        checkCurrentIsDbGraph: vi.fn().mockResolvedValue(true),
        registerUIItem: vi.fn(),
        registerCommandPalette: vi.fn(),
      },
      DB: {
        onChanged: vi.fn((callback: (event: { blocks: BlockEntity[] }) => void) => {
          onChanged = callback
          return vi.fn()
        }),
      },
      Editor: {
        upsertProperty: vi.fn().mockResolvedValue({ id: 1 }),
        upsertBlockProperty: vi.fn().mockResolvedValue(undefined),
        removeBlockProperty,
      },
      UI: {
        showMsg: vi.fn().mockResolvedValue(undefined),
      },
    })

    await startPlugin()

    onChanged?.({
      blocks: [
        {
          uuid: 'block-2',
          title: 'See https://example.atlassian.net/browse/ABC-123',
          properties: {
            [PROPERTY_KEYS.type]: 'jira',
          },
        } as unknown as BlockEntity,
      ],
    })

    await vi.advanceTimersByTimeAsync(600)

    for (const propertyKey of Object.values(PROPERTY_KEYS)) {
      expect(removeBlockProperty).toHaveBeenCalledWith('block-2', propertyKey)
    }
  })

  it('registers a dynamic site manager entry point', async () => {
    const registerUIItem = vi.fn()
    const registerCommandPalette = vi.fn()
    const provideModel = vi.fn()

    vi.stubGlobal('logseq', {
      settings: {},
      useSettingsSchema: vi.fn(),
      provideModel,
      provideStyle: vi.fn(),
      showMainUI: vi.fn(),
      hideMainUI: vi.fn(),
      onSettingsChanged: vi.fn(() => vi.fn()),
      beforeunload: vi.fn(),
      App: {
        checkCurrentIsDbGraph: vi.fn().mockResolvedValue(true),
        registerUIItem,
        registerCommandPalette,
      },
      DB: {
        onChanged: vi.fn(() => vi.fn()),
      },
      Editor: {
        updateBlock: vi.fn().mockResolvedValue(undefined),
        removeBlockProperty: vi.fn().mockResolvedValue(undefined),
      },
      UI: {
        showMsg: vi.fn().mockResolvedValue(undefined),
      },
    })

    await startPlugin()

    expect(registerUIItem).toHaveBeenCalledWith(
      'toolbar',
      expect.objectContaining({
        key: 'logseq-atlassian-linker-sites',
      }),
    )
    expect(registerCommandPalette).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'logseq-atlassian-linker-sites',
      }),
      expect.any(Function),
    )
    expect(provideModel).toHaveBeenCalledWith(
      expect.objectContaining({
        openAtlassianSiteManager: expect.any(Function),
      }),
    )
  })
})
