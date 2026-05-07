import { describe, expect, it } from 'vitest'
import { parseAtlassianUrl } from '../parser'

describe('parseAtlassianUrl', () => {
  it('parses Jira browse links', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/browse/ABC-123')).toMatchObject({
      kind: 'jira',
      issueKey: 'ABC-123',
      siteOrigin: 'https://example.atlassian.net',
    })
  })

  it('parses Jira selectedIssue links', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/jira/software/c/projects/ABC/boards/1?selectedIssue=ABC-123')).toMatchObject({
      kind: 'jira',
      issueKey: 'ABC-123',
    })
  })

  it('parses Jira issue keys embedded in project URLs', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/jira/software/projects/ABC/issues/ABC-123')).toMatchObject({
      kind: 'jira',
      issueKey: 'ABC-123',
    })
  })

  it('trims common trailing punctuation from pasted links', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/browse/A-1)')).toMatchObject({
      kind: 'jira',
      originalUrl: 'https://example.atlassian.net/browse/A-1',
      issueKey: 'A-1',
    })
  })

  it('parses Confluence page-path URLs', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/wiki/spaces/ENG/pages/123456789/Page+Title')).toMatchObject({
      kind: 'confluence',
      pageId: '123456789',
    })
  })

  it('parses Confluence pageId URLs', () => {
    expect(parseAtlassianUrl('https://example.atlassian.net/wiki/pages/viewpage.action?pageId=123456789')).toMatchObject({
      kind: 'confluence',
      pageId: '123456789',
    })
  })

  it('ignores non-Atlassian URLs', () => {
    expect(parseAtlassianUrl('https://example.com/browse/ABC-123')).toBeNull()
  })
})
