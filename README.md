# Logseq Atlassian Linker

Logseq DB graph plugin that watches edited blocks for Atlassian Cloud links, rewrites them to standard Markdown links, and stores Jira or Confluence metadata as DB block properties.

## Development

This environment has conflicting Node CA settings. Use:

```sh
env -u NODE_USE_SYSTEM_CA npm install
env -u NODE_USE_SYSTEM_CA npm run build
```

Load the plugin root directory from Logseq Desktop with Developer mode enabled.

## Settings

Configure the plugin in Logseq settings with:

- Atlassian site URL, for example `https://your-domain.atlassian.net`
- Atlassian account email
- Atlassian API token

The API token is stored in Logseq plugin settings, so this plugin is intended for personal or internal use.
