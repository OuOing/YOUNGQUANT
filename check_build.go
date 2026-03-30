package main
import (
    "os/exec"
    "fmt"
)
func main() {
    cmd := exec.Command("go", "build", "-o", "test", "./server/main.go")
    out, err := cmd.CombinedOutput()
    fmt.Println(string(out))
    if err != nil {
        fmt.Println("Err:", err)
    }
}
