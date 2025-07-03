---
source: https://devhints.io/go
tags: go
---

# Go

## Note: Constants

`@source: https://tour.golang.org/basics/15`

Constants can be character, string, boolean, or numeric values.

```go
const Phi = 1.618
const Size int64 = 1024
const x, y = 1, 2
const (
  Pi = 3.14
  E  = 2.718
)
const (
  Sunday = iota
  Monday
  Tuesday
  Wednesday
  Thursday
  Friday
  Saturday
)
```


## Flashcard: `iota`

(Golang) What is the **value of `Sunday`**?

```go
const (
  Sunday = iota
  Monday
  Tuesday
  Wednesday
  Thursday
  Friday
  Saturday
)
```

---

`iota` is reinitialized to `0` after every `const`.


## Note: Hello World

```go
package main

import "fmt"

func main() {
  message := greetMe("world")
  fmt.Println(message)
}

func greetMe(name string) string {
  return "Hello, " + name + "!"
}
```

To run:

```
$ go build
```

Or use the [Go repl](https://repl.it/languages/go).


## Basic Types


### Note: Strings

```go
str := "Hello"
str := `Multiline
string`
```


### Flashcard: Multiline Strings

(Golang) Syntax for **multiline strings**?

---

Use **backticks**.

```go
str := `Multiline
string`
```

### Note: Numbers

```go
num := 3          // int
num := 3.         // float64
num := 3 + 4i     // complex128
num := byte('a')  // byte (alias for uint8)

var u uint = 7        // uint (unsigned)
var p float32 = 22.7  // 32-bit float
```


## Flow Control


### Note: Conditional

```go
if day == "sunday" || day == "saturday" {
  rest()
} else if day == "monday" && isTired() {
  groan()
} else {
  work()
}
```

See [`if`](https://tour.golang.org/flowcontrol/5)


### Note: Statements in `if`

```go
if _, err := doThing(); err != nil {
  fmt.Println("Uh oh")
}
```

A condition in an if statement can be preceded with a statement before a `;`. Variables declared by the statement are only in scope until the end of the `if`.

See: [If with a short statement](https://tour.golang.org/flowcontrol/6)


### Note: Switch

```go
switch day {
  case "sunday":
    // cases don't "fall through" by default!
    fallthrough

  case "saturday":
    rest()

  default:
    work()
}
```

See: [Switch](https://github.com/golang/go/wiki/Switch)


#### Flashcard: Switch

(Golang) Why the **keyword `fallthrough`**?

```go
switch day {
  case "sunday":
    // cases don't "fall through" by default!
    fallthrough

  case "saturday":
    rest()

  default:
    work()
}
```

---

Golang doesn't require `break`. There is **no fallthrough by default**.


### Note: For-Range loop

```go
entry := []string{"Jack","John","Jones"}
for i, val := range entry {
  fmt.Printf("At position %d, the character %s is present\n", i, val)
}
```

See: [For-Range loops](https://gobyexample.com/range)


### Note: For loop

```go
for count := 0; count <= 10; count++ {
  fmt.Println("My counter is at", count)
}
```

See: [For loops](https://tour.golang.org/flowcontrol/1)


### Flashcard: For range over integers

(Golang) **Rewrite** using more idiomatic syntax?

```go
for i := 0; i <= 10; i++ {
  fmt.Println(i+1)
}
```

---

Use a **for-range**.

```go
for i := range 10 {
    fmt.Println(i+1)
}
```

### Note: While loop

```go
n := 0
x := 42
for n != x {
  n := guess()
}
```

See: [Go’s "while"](https://tour.golang.org/flowcontrol/3)


### Flashcard: Infinite Loop

(Golang) Syntax for an **infinite loop**?

---

```go
for {
  // do something
}
```
