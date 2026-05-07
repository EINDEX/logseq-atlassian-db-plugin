# Releasing

## GitHub Release

1. Confirm `CHANGELOG.md` has a section for the release version.
2. Run the release checks:

```sh
npm run check
```

3. Create a semver release commit and tag:

```sh
npm run release:patch
```

Use `release:minor` or `release:major` when the release scope calls for it.

4. Push the release commit and tag:

```sh
git push origin main --follow-tags
```

The GitHub workflow uploads `logseq-atlassian-linker.zip` and `package.json` to the release.
Release notes are extracted from the matching `CHANGELOG.md` section.

## Initial Release

For the first `0.1.0` release, create the tag after the initial release commit:

```sh
git tag v0.1.0
git push origin main --follow-tags
```

## Logseq Marketplace

1. Fork `logseq/marketplace`.
2. Copy `marketplace/logseq-atlassian-linker` into `packages/logseq-atlassian-linker`.
3. Open a pull request to `logseq/marketplace`.

The marketplace manifest marks this plugin as DB graph only.
