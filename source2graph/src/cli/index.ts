#!/usr/bin/env node
import { Command } from 'commander'
import { registerAnalyzeCommand } from './analyze.js'
import { registerServeCommand } from './serve.js'
import { registerNeo4jCommands } from './neo4j.js'

const program = new Command()

program
  .name('s2g')
  .description('Source code graph analyzer — outputs Neo4j-compatible CSV and Cypher files')
  .version('0.1.0')

registerAnalyzeCommand(program)
registerServeCommand(program)
registerNeo4jCommands(program)

program.parse()
