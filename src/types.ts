export type AtlassianKind = 'jira' | 'confluence'

export type AtlassianSettings = {
  siteUrl: string
  email: string
  apiToken: string
  autoRewrite: boolean
  requestTimeout: number
}

export type JiraLink = {
  kind: 'jira'
  originalUrl: string
  siteOrigin: string
  issueKey: string
}

export type ConfluenceLink = {
  kind: 'confluence'
  originalUrl: string
  siteOrigin: string
  pageId: string
}

export type AtlassianLink = JiraLink | ConfluenceLink

export type AtlassianMetadata = {
  kind: AtlassianKind
  originalUrl: string
  title: string
  status: string
  key?: string
  pageId?: string
}

export type LinkResolution = {
  link: AtlassianLink
  metadata?: AtlassianMetadata
  error?: string
}
