---
source: https://devhints.io/go
---

# Go

## Reference: Constants

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


## Reference: Hello World

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


### Reference: Strings

```go
str := "Hello"
str := `Multiline
string`
```


### Reference: Numbers

```go
num := 3          // int
num := 3.         // float64
num := 3 + 4i     // complex128
num := byte('a')  // byte (alias for uint8)

var u uint = 7        // uint (unsigned)
var p float32 = 22.7  // 32-bit float
```


## Flow Control


### Reference: Conditional

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


### Reference: Statements in `if`

```go
if _, err := doThing(); err != nil {
  fmt.Println("Uh oh")
}
```

A condition in an if statement can be preceded with a statement before a ;. Variables declared by the statement are only in scope until the end of the if.

See: [If with a short statement](https://tour.golang.org/flowcontrol/6)


### Reference: Switch

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


### Reference: For-Range loop

```go
entry := []string{"Jack","John","Jones"}
for i, val := range entry {
  fmt.Printf("At position %d, the character %s is present\n", i, val)
}
```

See: [For-Range loops](https://gobyexample.com/range)


### Reference: For loop

```go
for count := 0; count <= 10; count++ {
  fmt.Println("My counter is at", count)
}
```

See: [For loops](https://tour.golang.org/flowcontrol/1)


### Reference: While loop

```go
n := 0
x := 42
for n != x {
  n := guess()
}
```

See: [Go’s "while"](https://tour.golang.org/flowcontrol/3)
