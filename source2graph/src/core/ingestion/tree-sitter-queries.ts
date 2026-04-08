/**
 * Tree-sitter S-expression queries for each supported language.
 *
 * Written from scratch by consulting:
 *   - tree-sitter-java grammar:       https://github.com/tree-sitter/tree-sitter-java
 *   - tree-sitter-typescript grammar: https://github.com/tree-sitter/tree-sitter-typescript
 *   - tree-sitter-javascript grammar: https://github.com/tree-sitter/tree-sitter-javascript
 *   - tree-sitter-scala grammar:      https://github.com/tree-sitter/tree-sitter-scala
 */

// ---------------------------------------------------------------------------
// Java
// ---------------------------------------------------------------------------

/** Captures class declarations (including inner classes). */
export const JAVA_CLASS_QUERY = `
(class_declaration
  (modifiers)? @modifiers
  name: (identifier) @name
) @class
`

/** Captures interface declarations. */
export const JAVA_INTERFACE_QUERY = `
(interface_declaration
  (modifiers)? @modifiers
  name: (identifier) @name
) @interface
`

/** Captures method declarations inside a class/interface body. */
export const JAVA_METHOD_QUERY = `
(method_declaration
  (modifiers)? @modifiers
  type: _ @returnType
  name: (identifier) @name
  parameters: (formal_parameters) @params
) @method
`

/** Captures field declarations. */
export const JAVA_FIELD_QUERY = `
(field_declaration
  (modifiers)? @modifiers
  type: _ @fieldType
  declarator: (variable_declarator
    name: (identifier) @name
  )
) @field
`

/** Captures import statements. */
export const JAVA_IMPORT_QUERY = `
(import_declaration
  (_) @importPath
) @import
`

/** Captures superclass (extends) reference. */
export const JAVA_EXTENDS_QUERY = `
(class_declaration
  name: (identifier) @className
  superclass: (superclass
    (type_identifier) @superName
  )
) @class
`

/** Captures interface implementation references. */
export const JAVA_IMPLEMENTS_QUERY = `
(class_declaration
  name: (identifier) @className
  interfaces: (super_interfaces
    (type_list
      (type_identifier) @ifaceName
    )
  )
) @class
`

/** Captures interface extension references. */
export const JAVA_INTERFACE_EXTENDS_QUERY = `
(interface_declaration
  name: (identifier) @ifaceName
  (extends_interfaces
    (type_list
      (type_identifier) @superIfaceName
    )
  )
) @interface
`

/** Captures method invocations (for call graph). */
export const JAVA_CALL_QUERY = `
(method_invocation
  object: (_)? @receiver
  name: (identifier) @methodName
) @call
`

// ---------------------------------------------------------------------------
// TypeScript
// ---------------------------------------------------------------------------

/** Captures class declarations. */
export const TS_CLASS_QUERY = `
(class_declaration
  name: (type_identifier) @name
) @class

(export_statement
  declaration: (class_declaration
    name: (type_identifier) @name
  ) @class
)
`

/** Captures interface declarations. */
export const TS_INTERFACE_QUERY = `
(interface_declaration
  name: (type_identifier) @name
) @interface

(export_statement
  declaration: (interface_declaration
    name: (type_identifier) @name
  ) @interface
)
`

/** Captures method definitions inside class/interface bodies. */
export const TS_METHOD_QUERY = `
(method_definition
  name: (property_identifier) @name
  parameters: (formal_parameters) @params
) @method
`

/** Captures public field / property declarations in classes. */
export const TS_FIELD_QUERY = `
(public_field_definition
  name: (property_identifier) @name
  type: (type_annotation)? @fieldType
) @field
`

/** Captures top-level function declarations. */
export const TS_FUNCTION_QUERY = `
(function_declaration
  name: (identifier) @name
  parameters: (formal_parameters) @params
) @function

(export_statement
  declaration: (function_declaration
    name: (identifier) @name
    parameters: (formal_parameters) @params
  ) @function
)

(lexical_declaration
  (variable_declarator
    name: (identifier) @name
    value: (arrow_function
      parameters: _ @params
    ) @arrowFn
  )
) @arrowDecl

(export_statement
  declaration: (lexical_declaration
    (variable_declarator
      name: (identifier) @name
      value: (arrow_function
        parameters: _ @params
      ) @arrowFn
    )
  )
) @exportedArrowDecl
`

/** Captures import statements. */
export const TS_IMPORT_QUERY = `
(import_statement
  source: (string) @source
) @import
`

/** Captures extends clause. */
export const TS_EXTENDS_QUERY = `
(class_declaration
  name: (type_identifier) @className
  (class_heritage
    (extends_clause
      value: (identifier) @superName
    )
  )
) @class

(class_declaration
  name: (type_identifier) @className
  (class_heritage
    (extends_clause
      value: (member_expression
        object: (_) @superObject
        property: (property_identifier) @superProp
      )
    )
  )
) @classWithMemberExtends
`

/** Captures implements clause. */
export const TS_IMPLEMENTS_QUERY = `
(class_declaration
  name: (type_identifier) @className
  (class_heritage
    (implements_clause
      (type_identifier) @ifaceName
    )
  )
) @class
`

/** Captures interface extends. */
export const TS_INTERFACE_EXTENDS_QUERY = `
(interface_declaration
  name: (type_identifier) @ifaceName
  (extends_type_clause
    (type_identifier) @superIfaceName
  )
) @interface
`

/** Captures call expressions (for call graph). */
export const TS_CALL_QUERY = `
(call_expression
  function: (identifier) @callee
) @directCall

(call_expression
  function: (member_expression
    object: (_) @receiver
    property: (property_identifier) @methodName
  )
) @memberCall
`

// ---------------------------------------------------------------------------
// JavaScript
// ---------------------------------------------------------------------------

/** Captures class declarations. */
export const JS_CLASS_QUERY = `
(class_declaration
  name: (identifier) @name
) @class

(export_statement
  declaration: (class_declaration
    name: (identifier) @name
  ) @class
)
`

/** Captures method definitions. */
export const JS_METHOD_QUERY = `
(method_definition
  name: (property_identifier) @name
  parameters: (formal_parameters) @params
) @method
`

/** Captures top-level function declarations. */
export const JS_FUNCTION_QUERY = `
(function_declaration
  name: (identifier) @name
  parameters: (formal_parameters) @params
) @function

(export_statement
  declaration: (function_declaration
    name: (identifier) @name
    parameters: (formal_parameters) @params
  ) @function
)

(lexical_declaration
  (variable_declarator
    name: (identifier) @name
    value: (arrow_function
      parameters: _ @params
    ) @arrowFn
  )
) @arrowDecl

(export_statement
  declaration: (lexical_declaration
    (variable_declarator
      name: (identifier) @name
      value: (arrow_function
        parameters: _ @params
      ) @arrowFn
    )
  )
) @exportedArrowDecl
`

/** Captures import statements. */
export const JS_IMPORT_QUERY = `
(import_statement
  source: (string) @source
) @import
`

/** Captures extends clause. */
export const JS_EXTENDS_QUERY = `
(class_declaration
  name: (identifier) @className
  (class_heritage
    (identifier) @superName
  )
) @class
`

/** Captures call expressions. */
export const JS_CALL_QUERY = `
(call_expression
  function: (identifier) @callee
) @directCall

(call_expression
  function: (member_expression
    object: (_) @receiver
    property: (property_identifier) @methodName
  )
) @memberCall
`

// ---------------------------------------------------------------------------
// Scala
// ---------------------------------------------------------------------------

/** Captures class declarations (excludes objects and traits). */
export const SCALA_CLASS_QUERY = `
(class_definition
  name: (identifier) @name
) @class
`

/** Captures trait declarations (mapped to Interface). */
export const SCALA_TRAIT_QUERY = `
(trait_definition
  name: (identifier) @name
) @trait
`

/** Captures object declarations (singleton objects, mapped to Class). */
export const SCALA_OBJECT_QUERY = `
(object_definition
  name: (identifier) @name
) @object
`

/** Captures method / function definitions. */
export const SCALA_METHOD_QUERY = `
(function_definition
  name: (identifier) @name
  parameters: (_) @params
) @method
`

/** Captures val/var field definitions (class-level only; filter by parent in provider). */
export const SCALA_FIELD_QUERY = `
(val_definition
  pattern: (identifier) @name
) @field

(var_definition
  pattern: (identifier) @name
) @field
`

/** Captures import declarations (full node text; provider parses the path). */
export const SCALA_IMPORT_QUERY = `
(import_declaration) @import
`

/** Captures extends_clause type references (covers both extends and with). */
export const SCALA_EXTENDS_QUERY = `
(class_definition
  name: (identifier) @className
  (extends_clause
    (type_identifier) @parentName
  )
) @classDecl

(object_definition
  name: (identifier) @className
  (extends_clause
    (type_identifier) @parentName
  )
) @objectDecl

(trait_definition
  name: (identifier) @className
  (extends_clause
    (type_identifier) @parentName
  )
) @traitDecl
`

/** Captures call expressions (direct and member calls). */
export const SCALA_CALL_QUERY = `
(call_expression
  function: (identifier) @callee
) @directCall

(call_expression
  function: (field_expression
    field: (identifier) @methodName
  )
) @memberCall

(field_expression
  field: (identifier) @zeroArgMethod
) @zeroArgCall
`
