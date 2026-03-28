import DOMPurify from 'dompurify'
import { marked } from 'marked'
import changelogRaw from '../../CHANGELOG.md?raw'
import { getLoginAtBeforeThisSession } from './lastLogin'

marked.setOptions({ gfm: true, breaks: true })

export function renderChangelogMarkdown(markdown) {
  if (!markdown || !String(markdown).trim()) return ''
  return DOMPurify.sanitize(marked.parse(markdown))
}

function parseChangelogSections(raw) {
  const chunks = raw.split(/\n## /)
  const sections = []
  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i]
    const nl = chunk.indexOf('\n')
    const title = nl === -1 ? chunk : chunk.slice(0, nl)
    const content = (nl === -1 ? '' : chunk.slice(nl + 1)).trim()
    sections.push({ title: title.trim(), content })
  }
  return sections
}

function stripPlaceholderBullets(content) {
  return content
    .split('\n')
    .filter((line) => !/^\s*-\s*\(add changes here/i.test(line))
    .join('\n')
    .trim()
}

function isPlaceholderOnly(content) {
  const lines = content.split('\n').filter((l) => /^\s*-\s/.test(l))
  if (lines.length === 0) return true
  return lines.every((l) => /^\s*-\s*\(add changes here/i.test(l))
}

/**
 * Latest “what’s new” slice: prefers [Unreleased] if it has real bullets, else first [x.y.z] section.
 */
export function getLatestChangelogSection(raw) {
  const sections = parseChangelogSections(raw)
  if (!sections.length) return null

  const unreleased = sections.find((s) => /^\[Unreleased\]/i.test(s.title))
  if (unreleased && !isPlaceholderOnly(unreleased.content)) {
    return {
      title: unreleased.title,
      bodyMarkdown: stripPlaceholderBullets(unreleased.content)
    }
  }

  const semver = sections.find((s) => /^\[\d+\.\d+\.\d+\]/.test(s.title))
  if (semver) {
    return { title: semver.title, bodyMarkdown: semver.content }
  }

  const last = sections[sections.length - 1]
  return { title: last.title, bodyMarkdown: last.content }
}

export const changelogMarkdownSource = changelogRaw

export const changelogFullHtml = renderChangelogMarkdown(changelogRaw)

/** localStorage key: fingerprint of latest “what’s new” block the user dismissed. */
export const WHATS_NEW_SEEN_KEY = 'phpcoin_whats_new_seen_fp'

/**
 * When [Unreleased] has no date in the title, only logins after this instant qualify.
 * Bump when you add meaningful unreleased notes (or rely on a dated version section).
 */
export const WHATS_NEW_UNRELEASED_EFFECTIVE_AT = Date.parse('2026-03-28T00:00:00Z')

function simpleHash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i)
  }
  return (h >>> 0).toString(16)
}

function parsePublishedAtMs(title) {
  const m = title.match(/(\d{4}-\d{2}-\d{2})/)
  if (m) return Date.parse(`${m[1]}T00:00:00Z`)
  if (/Unreleased/i.test(title)) return WHATS_NEW_UNRELEASED_EFFECTIVE_AT
  return 0
}

/** Current “what’s new” slice for Dashboard (null if nothing to show). */
export function getWhatsNewDisplayPayload() {
  const section = getLatestChangelogSection(changelogRaw)
  if (!section || !section.bodyMarkdown.trim()) return null
  const fingerprint = simpleHash(`${section.title}\n${section.bodyMarkdown}`)
  const publishedAtMs = parsePublishedAtMs(section.title)
  return {
    title: section.title,
    html: renderChangelogMarkdown(section.bodyMarkdown),
    fingerprint,
    publishedAtMs
  }
}

/**
 * Show only if the login **before this session** was before the release date (first time
 * back after a dated release), and until the user dismisses this fingerprint once.
 */
export function shouldShowWhatsNewAlert(payload) {
  if (!payload || !payload.publishedAtMs) return false
  const loginBeforeThis = getLoginAtBeforeThisSession()
  if (loginBeforeThis > 0 && loginBeforeThis >= payload.publishedAtMs) {
    return false
  }
  try {
    return localStorage.getItem(WHATS_NEW_SEEN_KEY) !== payload.fingerprint
  } catch {
    return true
  }
}

export function markWhatsNewSeen(fingerprint) {
  try {
    localStorage.setItem(WHATS_NEW_SEEN_KEY, fingerprint)
  } catch (_) {
    /* ignore */
  }
}
