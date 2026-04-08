import type { KnowledgeGraph } from '../../shared/graph-types.js'
import { NodeLabel, RelationshipType } from '../../shared/graph-types.js'
import { generateNodeId, generateRelationshipId, normalizeFilePath } from '../../shared/utils.js'
import { getLanguageFromExtension } from '../../shared/language-types.js'
import type { WalkedFile } from './file-walker.js'

export function processStructure(graph: KnowledgeGraph, files: WalkedFile[]): void {
  const seenFolders = new Set<string>()

  for (const file of files) {
    const normalizedRel = normalizeFilePath(file.relativePath)
    const lang = getLanguageFromExtension(file.extension)

    // Create File node
    const fileNodeId = generateNodeId(NodeLabel.File, normalizedRel, normalizedRel)
    graph.addNode({
      label: NodeLabel.File,
      properties: {
        nodeId: fileNodeId,
        name: file.relativePath.split('/').pop() ?? file.relativePath,
        filePath: normalizedRel,
        language: lang ?? 'unknown',
        extension: file.extension,
      },
    })

    // Create Folder nodes and CONTAINS edges along the path
    const parts = normalizedRel.split('/')
    let currentPath = ''

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (!seenFolders.has(currentPath)) {
        seenFolders.add(currentPath)
        const folderNodeId = generateNodeId(NodeLabel.Folder, currentPath, currentPath)
        graph.addNode({
          label: NodeLabel.Folder,
          properties: {
            nodeId: folderNodeId,
            name: part,
            folderPath: currentPath,
          },
        })

        // Link to parent folder if exists
        if (parentPath) {
          const parentNodeId = generateNodeId(NodeLabel.Folder, parentPath, parentPath)
          graph.addRelationship({
            type: RelationshipType.CONTAINS,
            startNodeId: parentNodeId,
            endNodeId: folderNodeId,
            properties: {
              relId: generateRelationshipId(RelationshipType.CONTAINS, parentNodeId, folderNodeId),
            },
          })
        }
      }
    }

    // Link immediate parent folder -> file
    if (parts.length > 1) {
      const parentFolderPath = parts.slice(0, -1).join('/')
      const parentNodeId = generateNodeId(NodeLabel.Folder, parentFolderPath, parentFolderPath)
      graph.addRelationship({
        type: RelationshipType.CONTAINS,
        startNodeId: parentNodeId,
        endNodeId: fileNodeId,
        properties: {
          relId: generateRelationshipId(RelationshipType.CONTAINS, parentNodeId, fileNodeId),
        },
      })
    }
  }
}
