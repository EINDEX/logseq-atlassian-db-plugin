import { readFileSync } from 'node:fs'

const version = process.argv[2] ?? JSON.parse(readFileSync('package.json', 'utf8')).version
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const pattern = new RegExp(`^## ${escapedVersion} - .*$`, 'm')
const match = changelog.match(pattern)

if (!match || match.index === undefined) {
  console.error(`Missing CHANGELOG.md section for ${version}`)
  process.exit(1)
}

const notesStart = match.index + match[0].length
const nextSectionStart = changelog.indexOf('\n## ', notesStart)
const notesEnd = nextSectionStart === -1 ? changelog.length : nextSectionStart
const notes = changelog.slice(notesStart, notesEnd).trim()

if (!notes) {
  console.error(`Empty CHANGELOG.md section for ${version}`)
  process.exit(1)
}

console.log(notes)
