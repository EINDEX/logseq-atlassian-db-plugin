import { afterEach, describe, expect, it, vi } from 'vitest'

describe('plugin bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('reports async startup failures from the ready callback', async () => {
    const startupError = new Error('startup failed')
    const startPlugin = vi.fn().mockRejectedValue(startupError)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const ready = vi.fn((callback: () => void) => {
      callback()
      return Promise.resolve()
    })

    vi.doMock('../plugin', () => ({ startPlugin }))
    vi.doMock('@logseq/libs', () => ({}))
    vi.stubGlobal('window', globalThis)
    vi.stubGlobal('self', globalThis)
    vi.stubGlobal('logseq', { ready })

    await import('../main')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(ready).toHaveBeenCalledOnce()
    expect(startPlugin).toHaveBeenCalledOnce()
    expect(consoleError).toHaveBeenCalledWith(startupError)
  })
})
