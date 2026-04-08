import { readFileSync } from 'fs'
import { join, dirname, resolve as resolvePath } from 'path'
import type { KnowledgeGraph } from '../../shared/graph-types.js'
import { NodeLabel, RelationshipType } from '../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId, normalizeFilePath } from '../../shared/utils.js'
import type { SymbolTable } from './symbol-table.js'

// ── Frontmatter parsing ───────────────────────────────────────────────────────

/**
 * Extract raw YAML frontmatter block between opening and closing `---` lines.
 * Returns undefined if no valid frontmatter found.
 */
function extractFrontmatter(source: string): string | undefined {
  const lines = source.split('\n')
  if (lines[0]?.trimEnd() !== '---') return undefined
  const closeIdx = lines.indexOf('---', 1)
  if (closeIdx === -1) return undefined
  return lines.slice(1, closeIdx).join('\n')
}

/**
 * Parse `s2g.describes` from raw YAML frontmatter text.
 * Supports:
 *   s2g:
 *     describes: SymbolName
 * and:
 *   s2g:
 *     describes:
 *       - SymbolA
 *       - SymbolB
 */
function parseDescribes(yaml: string): string[] {
  // Find the s2g: block
  const lines = yaml.split('\n')
  let inS2gBlock = false
  let inDescribes = false
  const results: string[] = []

  for (const line of lines) {
    // Detect `s2g:` at root indent
    if (/^s2g\s*:/.test(line)) {
      inS2gBlock = true
      inDescribes = false
      continue
    }

    if (!inS2gBlock) continue

    // Any line that isn't indented ends the s2g block
    if (/^\S/.test(line)) {
      inS2gBlock = false
      inDescribes = false
      continue
    }

    // `  describes: SingleValue`
    const singleMatch = line.match(/^\s{1,4}describes\s*:\s*(\S.+)$/)
    if (singleMatch) {
      results.push(singleMatch[1].trim())
      inDescribes = false
      continue
    }

    // `  describes:`
    if (/^\s{1,4}describes\s*:\s*$/.test(line)) {
      inDescribes = true
      continue
    }

    if (inDescribes) {
      // `    - SymbolName`
      const listMatch = line.match(/^\s{2,6}-\s+(\S.*)$/)
      if (listMatch) {
        results.push(listMatch[1].trim())
      } else if (/^\s/.test(line)) {
        // Still indented but not a list item — stop
        inDescribes = false
      }
    }
  }

  return results
}

// ── Section / heading extraction ──────────────────────────────────────────────

interface Section {
  nodeId: string
  heading: string
  level: number
  startLine: number
  endLine: number
}

function extractSections(source: string, mdFilePath: string, frontmatterEndLine: number): Section[] {
  const lines = source.split('\n')
  const sections: Section[] = []

  for (let i = 0; i < lines.length; i++) {
    if (i <= frontmatterEndLine) continue
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (!match) continue
    const level = match[1].length
    const heading = match[2].trim()
    const nodeId = generateNodeId(NodeLabel.Section, mdFilePath, heading)
    sections.push({ nodeId, heading, level, startLine: i + 1, endLine: i + 1 })
  }

  // Fill endLine: each section ends just before the next one (or at EOF)
  for (let i = 0; i < sections.length; i++) {
    sections[i].endLine = i + 1 < sections.length
      ? sections[i + 1].startLine - 1
      : lines.length
  }

  return sections
}

// ── Link parsing (Approach B) ─────────────────────────────────────────────────

interface ParsedLink {
  linkText: string
  href: string         // raw href value from markdown
  lineNumber: number   // 1-based line number in the MD file
}

/** Extract all markdown links `[text](href)` from source. */
function extractLinks(source: string): ParsedLink[] {
  const links: ParsedLink[] = []
  const lines = source.split('\n')
  const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g

  for (let i = 0; i < lines.length; i++) {
    let m: RegExpExecArray | null
    LINK_RE.lastIndex = 0
    while ((m = LINK_RE.exec(lines[i])) !== null) {
      links.push({ linkText: m[1], href: m[2], lineNumber: i + 1 })
    }
  }

  return links
}

/**
 * Resolve a markdown link href to a repo-relative file path and optional line.
 * Skips external URLs (http/https) and anchor-only links (#...).
 */
function resolveLink(
  href: string,
  mdFileRelative: string,
  allFilePaths: Set<string>,
): { filePath: string; line: number | undefined } | undefined {
  // Skip external URLs and pure anchors
  if (/^https?:\/\//.test(href) || href.startsWith('#')) return undefined

  // Split off line anchor: path#L45 or path#l45
  const hashIdx = href.indexOf('#')
  let rawPath = hashIdx === -1 ? href : href.slice(0, hashIdx)
  const anchor = hashIdx === -1 ? undefined : href.slice(hashIdx + 1)

  // Remove leading ./
  rawPath = rawPath.replace(/^\.\//, '')

  // Resolve relative to the MD file's directory
  const mdDir = dirname(mdFileRelative)
  const resolved = normalizeFilePath(
    resolvePath('/', mdDir, rawPath).slice(1),  // strip leading /
  )

  // Line number from #L45 anchor
  let line: number | undefined
  if (anchor) {
    const lineMatch = anchor.match(/^[Ll](\d+)$/)
    if (lineMatch) line = parseInt(lineMatch[1], 10)
  }

  if (allFilePaths.has(resolved)) return { filePath: resolved, line }

  // Try stripping/adding common extensions
  const candidates = [
    resolved + '.ts', resolved + '.js', resolved + '.java',
    resolved.replace(/\.md$/, ''),
  ]
  for (const c of candidates) {
    if (allFilePaths.has(c)) return { filePath: c, line }
  }

  return undefined
}

/** Find the section that contains a given line number (1-based). */
function findSectionAtLine(sections: Section[], line: number): Section | undefined {
  for (const s of sections) {
    if (s.startLine <= line && line <= s.endLine) return s
  }
  return undefined
}

// ── Main entry point ──────────────────────────────────────────────────────────

export interface MarkdownProcessorOptions {
  verbose?: boolean
}

export function processMarkdown(
  graph: KnowledgeGraph,
  symbolTable: SymbolTable,
  mdFileRelative: string,
  absolutePath: string,
  allFilePaths: Set<string>,
  options: MarkdownProcessorOptions = {},
): void {
  const { verbose = false } = options

  let source: string
  try {
    source = readFileSync(absolutePath, 'utf-8')
  } catch {
    return
  }

  // ── File node (already created by processStructure; just get its nodeId)
  const fileNodeId = generateNodeId(NodeLabel.File, mdFileRelative, mdFileRelative)

  // ── Frontmatter ──────────────────────────────────────────────────────────
  const frontmatter = extractFrontmatter(source)
  const frontmatterEndLine = frontmatter !== undefined
    ? frontmatter.split('\n').length + 1  // +1 for opening ---, +1 for closing ---
    : -1

  // ── Section nodes ────────────────────────────────────────────────────────
  const sections = extractSections(source, mdFileRelative, frontmatterEndLine)
  for (const sec of sections) {
    graph.addNode({
      label: NodeLabel.Section,
      properties: {
        nodeId: sec.nodeId,
        name: sec.heading,
        heading: sec.heading,
        level: sec.level,
        filePath: mdFileRelative,
        startLine: sec.startLine,
        endLine: sec.endLine,
      },
    })
    graph.addRelationship({
      type: RelationshipType.CONTAINS,
      startNodeId: fileNodeId,
      endNodeId: sec.nodeId,
      properties: { relId: generateRelationshipId(RelationshipType.CONTAINS, fileNodeId, sec.nodeId) },
    })
    if (verbose) console.log(`        [MD] Section "${sec.heading}" in ${mdFileRelative}`)
  }

  // ── Approach C: frontmatter describes → DOCUMENTS ────────────────────────
  if (frontmatter) {
    const describes = parseDescribes(frontmatter)
    for (const symbolName of describes) {
      const matches = symbolTable.lookupByName(symbolName)
      for (const sym of matches) {
        const relId = generateRelationshipId(RelationshipType.DOCUMENTS, fileNodeId, sym.nodeId)
        graph.addRelationship({
          type: RelationshipType.DOCUMENTS,
          startNodeId: fileNodeId,
          endNodeId: sym.nodeId,
          properties: { relId, describes: symbolName },
        })
        if (verbose) console.log(`        [MD] DOCUMENTS ${mdFileRelative} → ${sym.qualifiedName}`)
      }
    }
  }

  // ── Approach B: inline links → REFERENCES ────────────────────────────────
  const links = extractLinks(source)
  for (const link of links) {
    const resolved = resolveLink(link.href, mdFileRelative, allFilePaths)
    if (!resolved) continue

    // Find target symbol
    let targetNodeId: string | undefined

    if (resolved.line !== undefined) {
      // Link to a specific line → find narrowest enclosing symbol
      const sym = symbolTable.lookupByLine(resolved.filePath, resolved.line)
      if (sym) targetNodeId = sym.nodeId
    }

    // Fallback: if no symbol at line, target the File node of the linked file
    if (!targetNodeId) {
      targetNodeId = generateNodeId(NodeLabel.File, resolved.filePath, resolved.filePath)
      if (!graph.getNode(targetNodeId)) continue  // file not in graph
    }

    // Source of the reference: the Section containing the link, or the MD File itself
    const section = findSectionAtLine(sections, link.lineNumber)
    const sourceNodeId = section ? section.nodeId : fileNodeId

    const relId = generateRelationshipId(RelationshipType.REFERENCES, sourceNodeId, targetNodeId)
    graph.addRelationship({
      type: RelationshipType.REFERENCES,
      startNodeId: sourceNodeId,
      endNodeId: targetNodeId,
      properties: { relId, linkText: link.linkText, approach: 'B' },
    })
    if (verbose) {
      console.log(`        [MD] REFERENCES "${link.linkText}" → ${resolved.filePath}${resolved.line ? `#L${resolved.line}` : ''}`)
    }
  }
}
