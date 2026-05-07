import { describe, expect, it } from 'vitest'
import packageJson from '../../package.json'

describe('Logseq package manifest', () => {
  it('declares a project-local plugin icon', () => {
    expect(packageJson.logseq.icon).toBe('./icon.png')
  })

  it('packs the runtime entry and icon asset', () => {
    expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'icon.png', 'README.md']))
  })
})
