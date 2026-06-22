# Plan: @param mutability, README update, tests, cleanup

## Context
Obstruct is a Rust-written language that transpiles to C. Currently function parameters have no mutability flag — all are declared as immutable in the transpiler. The `#@` syntax works for variable declarations but not for function parameters. The README documents several features that are either outdated or missing.

## Task 1: Add `@param` mutability for function arguments

### Changes to `expr.rs`
- Change `Vec<(String, Type)>` to `Vec<(String, Type, bool)>` (bool = is_mutable) in two places:
  - `Expr::DeclareFunction` (line 58): 4th field
  - `Expr::Function` (line 62): 3rd field

### Changes to `parser.rs`
- In `define_function` (lines 328-347): After reading the param name (line 331: `let name = self.advance().lexeme;`), add `let is_mutable = self.match_any(&[TokenType::At]);` before consuming `:`, similar to how `declaration()` does it at line 218. Update the push to include `is_mutable`.
- In `define_lambda` (lines 387-406): Same change — add `is_mutable` check after reading the param name.
- Update all parameter tuple constructions to include the bool (e.g., `(name, var_type, is_mutable)`).

### Changes to `transpiler/expr_to_c.rs`
- In `to_c` for `DeclareFunction` (lines 382-429): Replace hardcoded `false` at line 391 with `arg.2` (the mutability flag).
- In `pre_transpile` for `DeclareFunction` (lines 585-658): Replace hardcoded `false` at line 612 with `arg.2`.
- Update all loop iterations over `args` to use destructuring: `for arg in args { let (name, ty, is_mutable) = arg; ... }`

### Changes to existing tests
- Update all test assertions that reference `DeclareFunction` or `Function` parameter tuples — any test constructing these directly needs the 3rd bool field.

### New tests
- Parser test: `#@param: i32` parses with is_mutable=true
- Transpiler test: `#@param` generates mutable variable declaration in C (`#`)
- Transpiler test: mixed `@param` and non-`@param` in same function

## Task 2: Update README

### Fix outdated statements
- Remove "Note: `%` (modulo) is parsed but not yet transpiled" — verify if Mod is now transpiled. If NOT, keep it but note it panics.
- Remove "&& / || (and / or) are parsed but not yet transpiled" — they ARE transpiled now.
- Fix "Reference Syntax" section: `&` and `*` do NOT resolve to `ref::new`/`ref::deref`; they emit C `&` and `*` directly.
- Update arithmetic section: `*` (multiplication) and `/` (division) are listed as "f64 only" but they also work for i32 (see code_gen_context.rs). Fix to say they work for both i32 and f64.

### Document new feature
- Add `@param: type` syntax for mutable function parameters under the Functions section.

### Move known issues out of README
- Move `%` (modulo not transpiled), `&&`/`||` (already transpiled - remove), Lambdas not transpiled, Vector/Array not transpiled, For loop not transpiled, Input not transpiled — these belong in a "Known Issues / Limitations" section or removed entirely (the README should document what works; unimplemented features should go in code-level TODOs or docs/issues, not the feature README).

### Remove from README
- Remove "Lambdas" section if lambdas are not transpiled — or mark them as "parsed but not yet transpiled" and move to known issues.
- Remove the outdated reference syntax section (or fix it to match reality).

### Add to README
- Mutable function parameters: `fn foo(@x: i32) { ... }`
- Known issues/limitations section for: Mod, Lambdas, Vectors/Arrays, For loop, Input, References not being real builtin functions.

## Task 3: Run tests
- Run `cargo test` to verify all existing tests pass.
- Fix any compilation errors from the `Vec<(String, Type, bool)>` change.

## Task 4: Add tests for untested areas

### Scanner tests (no tests for)
- `#@param` (at + ident used as param)
- For keyword
- Lam keyword
- Del keyword
- Use keyword
- Cls keyword
- Input keyword
- Global keyword (if it exists)

### Parser tests (no tests for)
- Function with `@param: type` mutability
- Lambda with `@param: type`
- Mod expression parsing
- And/Or expression parsing
- Vector literal parsing
- Array literal parsing
- For loop parsing
- Input statement parsing
- Delete statement parsing

### Transpiler tests (no tests for)
- Mod expression transpilation (currently panics — test the error)
- For loop transpilation (currently panics — test the error)
- Input statement transpilation (currently panics — test the error)
- Vector literal transpilation (currently panics — test the error)
- Array literal transpilation (currently panics — test the error)
- Delete statement transpilation

### Type env tests (no tests for)
- Type unification with conceptual types
- Generic type checking

## Critical files to modify
- `src/expr.rs` — Add bool to parameter tuples
- `src/parser.rs` — Add `@` check in define_function and define_lambda
- `src/transpiler/expr_to_c.rs` — Use param mutability flag in to_c and pre_transpile
- `src/tests/scanner_tests.rs` — Add missing lexer tests
- `src/tests/parser_tests.rs` — Add missing parser tests
- `src/tests/transpiler_tests.rs` — Add missing transpiler tests
- `README.md` — Update documentation
