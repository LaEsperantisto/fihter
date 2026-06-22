# Update README for Obstruct

## Context

The README documents many features that either don't exist in the code, are outdated, or include incorrect information. The goal is to make the README accurately reflect the actual state of the language based on a thorough review of all source files.

## What to Remove / Fix

1. **"arr" type documentation** (lines 186-210) — The README describes `arr<T,U>` with bracket syntax `[i32, f64]` but the code uses `arr` as a concrete type name. The grammar in `parser.rs:821` says `type -> IDENTIFIER | "[" type* "]" | "<<" type* ">>"` which means `[]` produces `arr` type. The README is misleading about the syntax.

2. **"ptr" and "ref" system** (lines 212-221, 264-271) — The README describes `ptr::new`, `ptr::deref`, `ptr::free`, `ref`, and `nothing` as if they're builtin functions. But looking at `compiletime_env.rs`, these functions are NOT registered (no `ptr::` or `ref::` functions declared). The scanner does recognize `&` and `*` for reference/deref operations (parser.rs:534-558), mapping them to `ref::new` and `ref::deref` function calls, but these functions aren't actually registered in the compile-time environment. The README is misleading.

3. **String functions section** (lines 320-330) — `str::nth` is listed as a builtin but is not registered in `compiletime_env.rs`.

4. **Vec functions** (lines 332-373) — `vec::push`, `vec::nth`, `direct_nth` are listed as builtins but none are registered in `compiletime_env.rs`.

5. **Pointer functions** (lines 368-385) — `ptr::new`, `ptr::deref`, `ptr::free` are listed as builtins but not registered.

6. **Window/Engine functions** (lines 386-402) — `init_window`, `draw_window`, `is_window_open` use the `cobject` crate but are NOT registered as builtins in the compile-time environment.

7. **Operators section** (lines 404-424) — Missing operators: `%` (Mod) is parsed but NOT transpiled (would panic). `**` (power) works for both i32 and f64. `*` (mult) and `/` (div) only work for f64 (no i32 version registered in compiletime_env.rs). The README doesn't document type limitations.

8. **Example program** (lines 438-467) — Uses `Vec<str>` instead of `vec<<str>>`, uses `temp.push(i)` (vec::push not a builtin), and has other inaccuracies.

9. **"Constructors" section** (lines 276-293) — `i32::new`, `f64::new`, `str::new`, `arr::new`, `vec::new` are listed but NOT registered.

10. **"Input / Output / Control" section** (lines 294-308) — `quit`, `in`, `type(x)` are listed but not registered. However, `intput`, `fput`, `strput` ARE registered (note the typo "intput").

11. **"Important: Block statements"** section (lines 156-165) — The README says "this value is returned by the block statement" making them expressions. But `to_c.rs:177` says "EXPRESSION IF STATEMENTS NOT IMPLEMENTED", so expression-level control flow isn't fully working.

12. **For loop syntax** (README says `for i in 0..5` but code uses `for i : expr { ... }`)

13. **Keyword `%%` (Mod)** — The README lists `%` as an operator but the transpiler doesn't handle it.

14. **`And`/`Or`** — Parsed in `parser.rs:430-441` as `And`/`Or` expressions but NOT transpiled in `expr_to_c.rs` (would hit the catch-all panic).

15. **`del` keyword** — Documented but the code in `expr_to_c.rs:358` just removes from CTE without generating C code.

16. **"main" section** (lines 241-248) — Says main takes `vec<<str>>` argument but code generates `main()` with no arguments.

17. **Token keywords**: `cls`, `comp`, `stc`, `ovr`, `err`, `mac`, `std` are recognized in scanner but not used anywhere meaningful in the transpiler.

## What to Actually Document

Based on `compiletime_env.rs` constructor (the ONLY builtins registered at compile time):

**Types registered**: `i32`, `arr` ([]), `f64`, `bool`, `char`, `func`, `strlit`

**Functions registered**:
- `_print: func(i32) -> arr` (also overloaded for f64, bool, strlit)
- `_add: func(i32, i32) -> i32`, `func(f64, f64) -> f64`
- `_less: func(i32, i32) -> i32`, `func(f64, f64) -> f64`
- `_sub: func(i32, i32) -> i32`, `func(f64, f64) -> f64`
- `_pow: func(f64, f64) -> f64`
- `_div: func(f64, f64) -> f64` (NO i32 version)
- `_equal: func(f64, f64) -> bool`, `func(i32, i32) -> bool`, `func(strlit, strlit) -> bool`
- `_greater: func(f64, f64) -> bool`, `func(i32, i32) -> bool`
- `_bang_equal: func(f64, f64) -> bool`, `func(i32, i32) -> bool`, `func(strlit, strlit) -> bool`
- `_greater_equal: func(f64, f64) -> bool`, `func(i32, i32) -> bool`
- `_less_equal: func(f64, f64) -> bool`, `func(i32, i32) -> bool`
- `intput: func() -> i32` (typo — reads integer)
- `fput: func() -> f64` (reads float)
- `strput: func() -> strlit` (reads string)

**NOT registered** (not actual builtins, despite README claims):
- `ptr::new`, `ptr::deref`, `ptr::free`
- `ref::new`, `ref::deref` (parser maps `&x` and `*x` to these calls but they're not registered)
- `quit`, `in`, `type`
- `vec::push`, `vec::nth`, `direct_nth`
- `str::nth`
- `i32::new`, `f64::new`, `str::new`, `arr::new`, `vec::new`
- `len`
- `init_window`, `draw_window`, `is_window_open`

**Operators available in C output**:
- `+` (add) — i32 and f64
- `-` (sub) — i32 and f64
- `*` (mult) — only f64 registered
- `/` (div) — only f64 registered
- `%` (mod) — NOT transpiled (would panic)
- `**` (pow) — only f64 registered
- `==`, `!=`, `<`, `>`, `<=`, `>=` — i32 and f64 (and `==`/`!=` for strlit)
- `&&`, `||` (And/Or) — NOT transpiled (would panic)
- `!` (unary not) — works (Expr::Not maps to C `!`)
- `-` (unary neg) — works
- `+` (unary pos) — works
- `[i,j]` (indexing) — Nth expression (transpiled as function call)
- `&x` — maps to `ref::new(x)` call (not a real builtin)
- `*x` — maps to `ref::deref(x)` call (not a real builtin)

## Plan

1. Rewrite README to accurately reflect:
   - Actual features that work (transpile successfully)
   - Actual builtins (only what's in compiletime_env.rs)
   - Correct syntax for for-loops (`for ident : expr { }`)
   - Correct syntax for generics (`<<T>>`, not `<T>`)
   - Correct example program that actually compiles

2. Keep the structure but fix content:
   - Keep Variable Declarations section (accurate)
   - Keep Control Flow section (accurate, fix for-loop syntax)
   - Keep Print section (accurate)
   - Keep Functions section (mostly accurate, fix lambda generics syntax)
   - Fix Generics section (clarify `<<`/`>>`)
   - Fix Data Structures (remove false claims about ptr/ref, fix str type name)
   - Rewrite Builtin Functions (only include what's actually registered)
   - Remove Window/Engine section or note it's not implemented
   - Fix Operators section (document what works and type limitations)
   - Remove/Delete section or note it only affects CTE
   - Fix Example program
   - Remove "IMPORTANT" block about expressions or clarify limitations

3. Remove sections that don't apply:
   - Constructors (none registered)
   - Input/Output/Control (quit, in, type not registered; note intput/fput/strput typo)
   - String Functions (str::nth not registered)
   - Vec Functions (none registered)
   - Pointer Functions (none registered)
   - Window/Engine Functions (not registered)
