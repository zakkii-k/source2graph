 mcp__s2g__analyzeツールを使って/appを解析してください

● s2g - analyze (MCP)(paths: "/app")
  ⎿  {
       "success": true,
       "repoPaths": [
     "/app"
       ],
       "analyzedAt": "2026-04-08T12:40:22.449Z",
       "nodes": 1243,
       "relationships": 1661
     }

                                                                                                                                                                                                                                                                                          12:40 PM claude-sonnet-4-6
● 解析完了しました。

  mcp__s2g__analyze 結果

  ┌──────────────────────┬─────────────────────────┐
  │         項目         │           値            │
  ├──────────────────────┼─────────────────────────┤
  │ 対象パス             │ /app                    │
  ├──────────────────────┼─────────────────────────┤
  │ 解析日時             │ 2026-04-08 12:40:22 UTC │
  ├──────────────────────┼─────────────────────────┤
  │ ノード数             │ 1,243                   │
  ├──────────────────────┼─────────────────────────┤
  │ リレーションシップ数 │ 1,661                   │
  └──────────────────────┴─────────────────────────┘

  ナレッジグラフが構築されました。これを使って以下のような操作が可能です：

  - mcp__s2g__query_nodes — 特定クラス・関数の検索
  - mcp__s2g__get_callers / mcp__s2g__get_callees — 呼び出し関係の追跡
  - mcp__s2g__get_context — コード文脈の取得

  何か調べたいクラスや関数、依存関係などがあればお知らせください。

❯ パーサーはどんな構文のサポートをしていますか？

● s2g - query_nodes (MCP)(filePath: "sql-pgq-parser", label: "File", limit: 50)
  ⎿  [
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/ColumnsClause.scala:sql-pgq-parser/src/main/scala/pattern/classes/ColumnsClause.scala",
         "name": "ColumnsClause.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/ColumnsClause.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/Condition.scala:sql-pgq-parser/src/main/scala/pattern/classes/Condition.scala",
         "name": "Condition.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/Condition.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/Constants.scala:sql-pgq-parser/src/main/scala/pattern/classes/Constants.scala",
         "name": "Constants.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/Constants.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/GraphTable.scala:sql-pgq-parser/src/main/scala/pattern/classes/GraphTable.scala",
         "name": "GraphTable.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/GraphTable.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/Pattern.scala:sql-pgq-parser/src/main/scala/pattern/classes/Pattern.scala",
         "name": "Pattern.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/Pattern.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/SqlPgq.scala:sql-pgq-parser/src/main/scala/pattern/classes/SqlPgq.scala",
         "name": "SqlPgq.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/SqlPgq.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
         "name": "WhereClause.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/BaseParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/BaseParser.scala",
         "name": "BaseParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/BaseParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/ColumnsClauseParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/ColumnsClauseParser.scala",
         "name": "ColumnsClauseParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/ColumnsClauseParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/ConditionParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/ConditionParser.scala",
         "name": "ConditionParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/ConditionParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/GraphPatternParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/GraphPatternParser.scala",
         "name": "GraphPatternParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/GraphPatternParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/GraphTableClauseParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/GraphTableClauseParser.scala",
         "name": "GraphTableClauseParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/GraphTableClauseParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/SqlPgqParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/SqlPgqParser.scala",
         "name": "SqlPgqParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/SqlPgqParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/WhereClauseParser.scala:sql-pgq-parser/src/main/scala/pattern/parsers/WhereClauseParser.scala",
         "name": "WhereClauseParser.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/WhereClauseParser.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/classes/GraphPatternTest.scala:sql-pgq-parser/src/test/scala/pattern/classes/GraphPatternTest.scala",
         "name": "GraphPatternTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/classes/GraphPatternTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/ColumnsClauseParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/ColumnsClauseParserTest.scala",
         "name": "ColumnsClauseParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/ColumnsClauseParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/ConditionParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/ConditionParserTest.scala",
         "name": "ConditionParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/ConditionParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/GraphPatternParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/GraphPatternParserTest.scala",
         "name": "GraphPatternParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/GraphPatternParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/GraphTableClauseParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/GraphTableClauseParserTest.scala",
         "name": "GraphTableClauseParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/GraphTableClauseParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/SqlPgqParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/SqlPgqParserTest.scala",
         "name": "SqlPgqParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/SqlPgqParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/WhereClauseParserTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/WhereClauseParserTest.scala",
         "name": "WhereClauseParserTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/WhereClauseParserTest.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Edge.scala:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Edge.scala",
         "name": "Edge.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Edge.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphElement.scala:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphElement.scala",
         "name": "GraphElement.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphElement.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphPattern.scala:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphPattern.scala",
         "name": "GraphPattern.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/GraphPattern.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Vertex.scala:sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Vertex.scala",
         "name": "Vertex.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/graphPattern/Vertex.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacade.scala:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacade.scala",
         "name": "SqlPgqAntlr4ParserFacade.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacade.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
         "name": "SqlPgqAstVisitor.scala",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
         "language": "scala",
         "extension": ".scala"
       },
       {
         "label": "File",
         "nodeId": "File:sql-pgq-parser/src/test/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacadeTest.scala:sql-pgq-parser/src/test/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacadeTest.scala",
         "name": "SqlPgqAntlr4ParserFacadeTest.scala",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacadeTest.scala",
         "language": "scala",
         "extension": ".scala"
       }
     ]

● s2g - query_nodes (MCP)(namePattern: "Parser|parser|Grammar|grammar", label: "Class", limit: 30)
  ⎿  [
       {
         "label": "Class",
         "nodeId": "Class:docs/sparkPGQ/bench/bench_parser.scala:ParseResult",
         "name": "ParseResult",
         "qualifiedName": "ParseResult",
         "filePath": "docs/sparkPGQ/bench/bench_parser.scala",
         "startLine": 75,
         "endLine": 83,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:graph-manager/src/main/scala/PgqSparkExtension.scala:sqlpgq.PgqParserInterface",
         "name": "PgqParserInterface",
         "qualifiedName": "sqlpgq.PgqParserInterface",
         "filePath": "graph-manager/src/main/scala/PgqSparkExtension.scala",
         "startLine": 91,
         "endLine": 142,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/main/scala/pattern/parsers/SqlPgqParser.scala:sqlpgqparser.pattern.parsers.SqlPgqParser",
         "name": "SqlPgqParser",
         "qualifiedName": "sqlpgqparser.pattern.parsers.SqlPgqParser",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/SqlPgqParser.scala",
         "startLine": 51,
         "endLine": 51,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/ColumnsClauseParserTest.scala:ColumnsClauseParserTest",
         "name": "ColumnsClauseParserTest",
         "qualifiedName": "ColumnsClauseParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/ColumnsClauseParserTest.scala",
         "startLine": 6,
         "endLine": 18,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/ConditionParserTest.scala:ConditionParserTest",
         "name": "ConditionParserTest",
         "qualifiedName": "ConditionParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/ConditionParserTest.scala",
         "startLine": 5,
         "endLine": 160,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/GraphPatternParserTest.scala:GraphPatternParserTest",
         "name": "GraphPatternParserTest",
         "qualifiedName": "GraphPatternParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/GraphPatternParserTest.scala",
         "startLine": 8,
         "endLine": 626,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/GraphTableClauseParserTest.scala:GraphTableClauseParserTest",
         "name": "GraphTableClauseParserTest",
         "qualifiedName": "GraphTableClauseParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/GraphTableClauseParserTest.scala",
         "startLine": 7,
         "endLine": 106,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/SqlPgqParserTest.scala:SqlPgqParserTest",
         "name": "SqlPgqParserTest",
         "qualifiedName": "SqlPgqParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/SqlPgqParserTest.scala",
         "startLine": 7,
         "endLine": 118,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/WhereClauseParserTest.scala:WhereClauseParserTest",
         "name": "WhereClauseParserTest",
         "qualifiedName": "WhereClauseParserTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/WhereClauseParserTest.scala",
         "startLine": 5,
         "endLine": 161,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacade.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAntlr4ParserFacade",
         "name": "SqlPgqAntlr4ParserFacade",
         "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAntlr4ParserFacade",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacade.scala",
         "startLine": 14,
         "endLine": 100,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/test/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacadeTest.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAntlr4ParserFacadeTest",
         "name": "SqlPgqAntlr4ParserFacadeTest",
         "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAntlr4ParserFacadeTest",
         "filePath": "sql-pgq-parser/src/test/scala/pattern/parsers/antlr4/SqlPgqAntlr4ParserFacadeTest.scala",
         "startLine": 7,
         "endLine": 256,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       }
     ]

                                                                                                                                                                                                                                                                                          12:41 PM claude-sonnet-4-6
● 文法ファイルとテストを並行して読み込みます。

● Search(pattern: "**/*.g4", path: "/app")
  ⎿  Found 2 files
     sql-pgq-parser/src/main/antlr4/sqlpgqparser/SqlPgqLexer.g4
     sql-pgq-parser/src/main/antlr4/sqlpgqparser/SqlPgqGraphParser.g4

● s2g - get_context (MCP)(symbolName: "SqlPgqAstVisitor")
  ⎿  {
       "symbol": {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor",
         "name": "SqlPgqAstVisitor",
         "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
         "startLine": 14,
         "endLine": 348,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       "container": [
         {
           "label": "File",
           "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "name": "SqlPgqAstVisitor.scala",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "language": "scala",
           "extension": ".scala"
         }
       ],
       "methods": [
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildGraphTableClause#1",
           "name": "buildGraphTableClause",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildGraphTableClause",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 21,
           "endLine": 27,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildMatchClause#1",
           "name": "buildMatchClause",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildMatchClause",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 31,
           "endLine": 34,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildGraphPattern#1",
           "name": "buildGraphPattern",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildGraphPattern",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 36,
           "endLine": 58,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildVertexPattern#1",
           "name": "buildVertexPattern",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildVertexPattern",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 62,
           "endLine": 66,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildElementPatternFiller#1",
           "name": "buildElementPatternFiller",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildElementPatternFiller",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 68,
           "endLine": 82,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.updateVertexTable#3",
           "name": "updateVertexTable",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.updateVertexTable",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 84,
           "endLine": 101,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 3,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildEdgePattern#1",
           "name": "buildEdgePattern",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildEdgePattern",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 105,
           "endLine": 128,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildQuantifier#1",
           "name": "buildQuantifier",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildQuantifier",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 132,
           "endLine": 153,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelExpression#1",
           "name": "buildLabelExpression",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelExpression",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 157,
           "endLine": 160,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelTerm#1",
           "name": "buildLabelTerm",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelTerm",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 162,
           "endLine": 165,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelFactor#1",
           "name": "buildLabelFactor",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelFactor",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 167,
           "endLine": 176,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelPrimary#1",
           "name": "buildLabelPrimary",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLabelPrimary",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 178,
           "endLine": 189,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildWhereClause#1",
           "name": "buildWhereClause",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildWhereClause",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 193,
           "endLine": 195,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildCondition#1",
           "name": "buildCondition",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildCondition",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 197,
           "endLine": 240,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildCompOp#1",
           "name": "buildCompOp",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildCompOp",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 242,
           "endLine": 245,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnOperand#1",
           "name": "buildColumnOperand",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnOperand",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 247,
           "endLine": 255,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildOperandAsCompOperand#1",
           "name": "buildOperandAsCompOperand",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildOperandAsCompOperand",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 257,
           "endLine": 267,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLikePattern#1",
           "name": "buildLikePattern",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLikePattern",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 269,
           "endLine": 282,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLiteralAsColumnVal#1",
           "name": "buildLiteralAsColumnVal",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLiteralAsColumnVal",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 284,
           "endLine": 303,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLiteralList#1",
           "name": "buildLiteralList",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildLiteralList",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 305,
           "endLine": 307,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnsClause#1",
           "name": "buildColumnsClause",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnsClause",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 311,
           "endLine": 314,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnDef#1",
           "name": "buildColumnDef",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.buildColumnDef",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 316,
           "endLine": 322,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.validateEdgeNames#1",
           "name": "validateEdgeNames",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.validateEdgeNames",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 326,
           "endLine": 334,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         },
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.stripQuotes#1",
           "name": "stripQuotes",
           "qualifiedName": "sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.stripQuotes",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 339,
           "endLine": 347,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 1,
           "language": "scala"
         }
       ],
       "fields": [
         {
           "label": "Field",
           "nodeId": "Field:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.vertexTable",
           "name": "vertexTable",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 16,
           "visibility": "public",
           "isStatic": true,
           "fieldType": "",
           "language": "scala"
         },
         {
           "label": "Field",
           "nodeId": "Field:sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala:sqlpgqparser.pattern.parsers.antlr4.SqlPgqAstVisitor.edgeNames",
           "name": "edgeNames",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/parsers/antlr4/SqlPgqAstVisitor.scala",
           "startLine": 17,
           "visibility": "public",
           "isStatic": true,
           "fieldType": "",
           "language": "scala"
         }
       ],
       "extends": [],
       "implements": [],
       "callers": [],
       "callees": [],
       "imports": []
     }
    12:41 PM claude-sonnet-4-6
● 文法ファイルとテストを読み込みます。

● Read(/app/sql-pgq-parser/src/main/antlr4/sqlpgqparser/SqlPgqGraphParser.g4)
  ⎿  Read 154 lines

● Read(/app/sql-pgq-parser/src/main/antlr4/sqlpgqparser/SqlPgqLexer.g4)
  ⎿  Read 111 lines 文法ファイルとテストを読み込みます。

  Read 2 files (ctrl+o to expand)

● ANTLR4 文法から詳細が把握できました。まとめます。

  ---
  パーサーがサポートする構文

  クエリ全体の構造

  GRAPH_TABLE(
    graphName
    MATCH graphPattern [, graphPattern ...]
    [WHERE condition]
    [COLUMNS (col1.prop AS alias1, ...)]
  )

  ---
  1. パスモード（Path Mode）

  ┌────────────┬────────────────────────────────┐
  │ キーワード │              意味              │
  ├────────────┼────────────────────────────────┤
  │ WALK       │ 同一エッジの重複を許す         │
  ├────────────┼────────────────────────────────┤
  │ TRAIL      │ エッジの重複なし（デフォルト） │
  ├────────────┼────────────────────────────────┤
  │ ACYCLIC    │ 頂点の重複なし                 │
  ├────────────┼────────────────────────────────┤
  │ SIMPLE     │ 始点・終点以外の頂点重複なし   │
  └────────────┴────────────────────────────────┘

  ---
  2. 頂点パターン

  (varName? :Label? WHERE condition?)
  - 変数名・ラベル・WHERE 条件は全て省略可能

  ---
  3. エッジパターン

  ┌───────────────┬──────────────────┐
  │     構文      │       方向       │
  ├───────────────┼──────────────────┤
  │ ->            │ 右向き（省略形） │
  ├───────────────┼──────────────────┤
  │ <-            │ 左向き（省略形） │
  ├───────────────┼──────────────────┤
  │ <->           │ 無向（省略形）   │
  ├───────────────┼──────────────────┤
  │ -[e:Label]->  │ 右向き（フル）   │
  ├───────────────┼──────────────────┤
  │ <-[e:Label]-  │ 左向き（フル）   │
  ├───────────────┼──────────────────┤
  │ <-[e:Label]-> │ 無向（フル）     │
  └───────────────┴──────────────────┘

  ---
  4. 量化子（エッジの繰り返し）

  ┌───────┬───────────────┐
  │ 構文  │     意味      │
  ├───────┼───────────────┤
  │ {n}   │ ちょうど n 回 │
  ├───────┼───────────────┤
  │ {m,n} │ m〜n 回       │
  ├───────┼───────────────┤
  │ {m,}  │ m 回以上      │
  ├───────┼───────────────┤
  │ {,n}  │ n 回以下      │
  ├───────┼───────────────┤
  │ ?     │ 0 または 1 回 │
  ├───────┼───────────────┤
  │ *     │ 0 回以上      │
  ├───────┼───────────────┤
  │ +     │ 1 回以上      │
  └───────┴───────────────┘

  例: -[e:Knows]->{1,3} (1〜3 ホップ)

  ---
  5. ラベル式

  ┌────────────────┬────────────────────────────┐
  │      構文      │            意味            │
  ├────────────────┼────────────────────────────┤
  │ :Person        │ 単一ラベル                 │
  ├────────────────┼────────────────────────────┤
  │ :Person|Animal │ OR（どちらか）             │
  ├────────────────┼────────────────────────────┤
  │ :A&B           │ AND（両方）                │
  ├────────────────┼────────────────────────────┤
  │ !:Person       │ NOT                        │
  ├────────────────┼────────────────────────────┤
  │ :%             │ ワイルドカード（全ラベル） │
  ├────────────────┼────────────────────────────┤
  │ IS Label       │ :の代替構文                │
  └────────────────┴────────────────────────────┘

  ---
  6. WHERE 条件

  ┌───────────────┬───────────────────────────────┐
  │     種別      │            構文例             │
  ├───────────────┼───────────────────────────────┤
  │ 比較          │ n.age > 30、=、<>、!=、<=、>= │
  ├───────────────┼───────────────────────────────┤
  │ NULL チェック │ n.name IS NULL / IS NOT NULL  │
  ├───────────────┼───────────────────────────────┤
  │ LIKE          │ n.name LIKE 'A%' / NOT LIKE   │
  ├───────────────┼───────────────────────────────┤
  │ REGEXP        │ n.name REGEXP '.*son'         │
  ├───────────────┼───────────────────────────────┤
  │ IN            │ n.age IN (20, 30, 40)         │
  ├───────────────┼───────────────────────────────┤
  │ BETWEEN       │ n.age BETWEEN 20 AND 40       │
  ├───────────────┼───────────────────────────────┤
  │ 論理演算      │ AND、OR、NOT、(...)           │
  └───────────────┴───────────────────────────────┘

  ---
  7. COLUMNS 句

  COLUMNS (n.name AS name, e.weight AS w)
  - 変数名.プロパティ名 AS エイリアス の形式のみ

  ---
  8. リテラル型

  整数・負整数・浮動小数点・文字列（シングル/ダブルクォート）・TRUE/FALSE

  ---
  キーワードは大文字・小文字を区別しない

  MATCH / match / Match はすべて有効です。
