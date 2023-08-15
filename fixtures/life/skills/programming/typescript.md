---
source: https://devhints.io/typescript
tags: typescript
---

# TypeScript

TypeScript is just like ES2015 with type-checking. All ES2015 (classes, etc) should work.


## Reference: Declarations

```typescript
let isDone: boolean
let isDone: boolean = false
function add (a: number, b: number): number {
  return a + b
}

// Return type is optional
function add (a: number, b: number) { ... }
```


## Reference: Basic types

```typescript
any
void

boolean
number
string

null
undefined

bigint
symbol

string[]          /* or Array<string> */
[string, number]  /* tuple */

string | null | undefined   /* union */

never  /* unreachable */
unknown
enum Color {
  Red,
  Green,
  Blue = 4
};

let c: Color = Color.Green
```


## Reference: Type assertions

### Variables

```typescript
let len: number = (input as string).length
let len: number = (<string> input).length  /* not allowed in JSX */
```

### Functions

```typescript
function object(this: {a: number, b: number}, a: number, b: number) {
  this.a = a;
  this.b = b;
  return this;
}

// this is used only for type declaration
let a = object(1,2);
// a has type {a: number, b: number}
```
