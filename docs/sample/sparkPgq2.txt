
❯ Predicateに関係するファイルはどれくらいありますか？ファイルを直接読まず、mcp__s2g__のツールだけを使って調べてください。

● s2g - get_context (MCP)(symbolName: "Predicate")
  ⎿  {
       "symbol": {
         "label": "Interface",
     … +27 lines (ctrl+o to expand)

● s2g - query_nodes (MCP)(namePattern: "Predicate", limit: 50)
  ⎿  [
       {
         "label": "Method",
     … +70 lines (ctrl+o to expand)

● Predicate を実装するクラスと、その toCol/toRddFilter の呼び出し元を並行調査します。

● s2g - get_callers (MCP)(symbolName: "toCol", depth: 2)
  ⎿  [
       {
         "label": "Method",
     … +106 lines (ctrl+o to expand)

● s2g - get_callers (MCP)(symbolName: "toRddFilter", depth: 2)
  ⎿  [
       {
         "label": "Method",
     … +101 lines (ctrl+o to expand)

● s2g - get_callers (MCP)(symbolName: "toPredicate", depth: 2)
  ⎿  [
       {
         "label": "Method",
     … +59 lines (ctrl+o to expand)

● mergedCondition と WhereClause の呼び出し元もたどります。

● s2g - get_callers (MCP)(symbolName: "mergedCondition", depth: 2)
  ⎿  [
       {
         "label": "Method",
     … +106 lines (ctrl+o to expand)

● s2g - get_context (MCP)(symbolName: "WhereClause")
  ⎿  {
       "symbol": {
         "label": "Class",
     … +57 lines (ctrl+o to expand)

● buildCondition の呼び出し元も確認します。

● s2g - get_callers (MCP)(symbolName: "buildCondition", depth: 1)
  ⎿  [
       {
         "label": "Method",
     … +14 lines (ctrl+o to expand)

● s2g ツールで確認できた情報を整理します。

  ---
  Predicate に関係するファイル — 計 17 ファイル

  調査経路のまとめ

  ┌────────────────────────────┬─────────────────────────────────────────────────────┐
  │      調査した呼び出し      │                    発見した関係                     │
  ├────────────────────────────┼─────────────────────────────────────────────────────┤
  │ toPredicate の callers     │ GraphElement.mergedCondition が Predicate を生成    │
  ├────────────────────────────┼─────────────────────────────────────────────────────┤
  │ mergedCondition の callers │ 全エンジン実装が Predicate.toCol を間接消費         │
  ├────────────────────────────┼─────────────────────────────────────────────────────┤
  │ toRddFilter の callers     │ RDD エンジンが直接 Predicate.toRddFilter を呼び出し │
  ├────────────────────────────┼─────────────────────────────────────────────────────┤
  │ buildCondition の callers  │ SqlPgqAstVisitor.buildWhereClause → Predicate 構築  │
  └────────────────────────────┴─────────────────────────────────────────────────────┘

  ---
  ファイル一覧

  定義・保持層（4 ファイル）

  ┌────────────────────────────────────────────────────────────┬───────────────────────────────────────────────────────┐
  │                          ファイル                          │                         役割                          │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ sql-pgq-parser/.../classes/Condition.scala                 │ Predicate トレイト定義 + 13 実装クラス                │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ sql-pgq-parser/.../classes/WhereClause.scala               │ Predicate を内部に保持するデータクラス                │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ sql-pgq-parser/.../classes/graphPattern/GraphElement.scala │ toPredicate → mergedCondition で Predicate を生成     │
  ├────────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────┤
  │ sql-pgq-parser/.../parsers/antlr4/SqlPgqAstVisitor.scala   │ buildCondition / buildWhereClause で Predicate を構築 │
  └────────────────────────────────────────────────────────────┴───────────────────────────────────────────────────────┘

  実行エンジン層 — DataFrame（11 ファイル）

  ┌───────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │                       ファイル                        │                            利用箇所                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../SqlPgq.scala                        │ processGraphTable / run                                         │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/VariablePathDF.scala             │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/VariablePathDFWithPathMode.scala │ run / getInitialDF                                              │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/FixedLengthPathDF.scala          │ run / calcZeroLengthDF / calcOneLengthDF / calcMultipleLengthDF │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/FixedLengthPathMinHop.scala      │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/BroadcastBFSPathDF.scala         │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/AdjacencyListPathDF.scala        │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/CompactVariablePathDF.scala      │ run / getInitialCompactDF                                       │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/TwoHopViewDF.scala               │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/ThreeHopViewDF.scala             │ run                                                             │
  ├───────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ graph-manager/.../df/ThreeHopViewDFWithArray.scala    │ run                                                             │
  └───────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────┘

  実行エンジン層 — RDD（2 ファイル）

  ┌────────────────────────────────────────────────┬───────────────────────────────────────────────────┐
  │                    ファイル                    │                     利用箇所                      │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
  │ graph-manager/.../rdd/VariablePathRDD.scala    │ run / runWithPregel（toRddFilter を直接呼び出し） │
  ├────────────────────────────────────────────────┼───────────────────────────────────────────────────┤
  │ graph-manager/.../rdd/FixedLengthPathRDD.scala │ run / runWithPregel（toRddFilter を直接呼び出し） │
  └────────────────────────────────────────────────┴───────────────────────────────────────────────────┘

  ---
  波及の構造

  Predicate (Condition.scala)
    └── toPredicate → GraphElement.mergedCondition
          └── 全エンジン .run() が mergedCondition を呼び出し
                ├── toCol       → DataFrame エンジン 11 ファイル
                └── toRddFilter → RDD エンジン 2 ファイル

  Predicate のインターフェース（toCol / toRddFilter のシグネチャ）を変更した場合、エンジン層の 13 ファイルすべてが再コンパイル・修正対象になります。

✻ Crunched for 1m 3s






 s2g - get_context (MCP)(symbolName: "WhereClause")
  ⎿  {
       "symbol": {
         "label": "Class",
         "nodeId": "Class:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala:sqlpgqparser.pattern.classes.WhereClause",
         "name": "WhereClause",
         "qualifiedName": "sqlpgqparser.pattern.classes.WhereClause",
         "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
         "startLine": 4,
         "endLine": 6,
         "visibility": "public",
         "isAbstract": false,
         "isStatic": false,
         "language": "scala"
       },
       "container": [
         {
           "label": "File",
           "nodeId": "File:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
           "name": "WhereClause.scala",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
           "language": "scala",
           "extension": ".scala"
         }
       ],
       "methods": [
         {
           "label": "Method",
           "nodeId": "Method:sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala:sqlpgqparser.pattern.classes.WhereClause.toString#0",
           "name": "toString",
           "qualifiedName": "sqlpgqparser.pattern.classes.WhereClause.toString",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/WhereClause.scala",
           "startLine": 5,
           "endLine": 5,
           "visibility": "public",
           "isStatic": false,
           "isAsync": false,
           "returnType": "",
           "paramCount": 0,
           "language": "scala"
         }
       ],
       "fields": [],
       "extends": [],
       "implements": [
         {
           "label": "Interface",
           "nodeId": "Interface:sql-pgq-parser/src/main/scala/pattern/classes/Pattern.scala:sqlpgqparser.pattern.classes.Pattern",
           "name": "Pattern",
           "qualifiedName": "sqlpgqparser.pattern.classes.Pattern",
           "filePath": "sql-pgq-parser/src/main/scala/pattern/classes/Pattern.scala",
           "startLine": 3,
           "endLine": 3,
           "visibility": "public",
           "language": "scala"
         }
       ],
       "callers": [],
       "callees": [],
       "imports": []
     }

                                                                                                                                                                                                                                                                                          12:48 PM claude-sonnet-4-6
● buildCondition の呼び出し元も確認します。

● s2g - get_callers (MCP)(symbolName: "buildCondition", depth: 1)
  ⎿  [
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
       }
     ]
