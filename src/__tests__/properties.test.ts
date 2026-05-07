import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAtlassianProperties, PROPERTY_KEYS } from '../properties'

describe('legacy Atlassian DB properties', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses cleanup keys that can be created as DB graph pages', () => {
    for (const key of Object.values(PROPERTY_KEYS)) {
      expect(key).not.toMatch(/[:/]/)
    }
  })

  it('uses legacy keys only for cleanup', async () => {
    const upsertProperty = vi.fn().mockResolvedValue({ id: 1 })
    const upsertBlockProperty = vi.fn().mockResolvedValue(undefined)
    const removeBlockProperty = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('logseq', {
      Editor: {
        upsertProperty,
        upsertBlockProperty,
        removeBlockProperty,
      },
    })

    await clearAtlassianProperties('block-1')

    expect(upsertProperty).not.toHaveBeenCalled()
    expect(upsertBlockProperty).not.toHaveBeenCalled()

    for (const propertyKey of Object.values(PROPERTY_KEYS)) {
      expect(removeBlockProperty).toHaveBeenCalledWith('block-1', propertyKey)
    }
  })
})
