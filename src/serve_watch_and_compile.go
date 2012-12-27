package main

import (
	"fmt"
	"github.com/howeyc/fsnotify"
	"io/ioutil"
	"net/http"
	"strings"
)


/* File watcher */

func start_watcher() {
	watcher, err := fsnotify.NewWatcher()
    if err != nil {
        fmt.Println(err)
    }

    // Process events
    go func() {
        for {
            select {
            case ev := <-watcher.Event:
				if !strings.Contains(ev.Name, ".kate-swp") {
					if ev.IsModify() {
						compile()
					}
				}
            case err := <-watcher.Error:
                fmt.Println("error:", err)
            }
        }
    }()

    err = watcher.Watch(".")
    if err != nil {
        fmt.Println(err)
    }
}

func ReadFileAsString(filename string) string {
	val_b, err := ioutil.ReadFile(filename)
	if err != nil { panic(err) }
	val := string(val_b)
	return val
}

func compile() {
	fmt.Println("Compiling")

	html := ReadFileAsString("r.html")
	stylecss := ReadFileAsString("style.css")
    appjs := ReadFileAsString("app.js")
	jqueryjs := ReadFileAsString("jquery.js")
	underscorejs := ReadFileAsString("underscore.js")

	const  Style = "<link rel=\"stylesheet\" type=\"text/css\" href=\"style.css\">"
	newstyle := "<style type=\"text/css\">\n" + stylecss + "\n</style>"
	styled_html := strings.Replace(html, Style, newstyle, 1)

	const Jquery = "<script src=\"jquery.js\"></script>"
	newjquery := "<script type=\"text/javascript\">\n" + jqueryjs + "\n</script>"
	jquery_html := strings.Replace(styled_html, Jquery, newjquery, 1)

	const Underscore = "<script src=\"underscore.js\"></script>"
	newunderscore := "<script type=\"text/javascript\">\n" + underscorejs + "\n</script>"
	underscore_html := strings.Replace(jquery_html, Underscore, newunderscore, 1)

	const App = "<script src=\"app.js\"></script>"
	newapp := "<script type=\"text/javascript\">\n" + appjs + "\n</script>"
	app_html := strings.Replace(underscore_html, App, newapp, 1)
	
	b_html := []byte(app_html)
	err := ioutil.WriteFile("../reddit.html", b_html, 0644)
    if err != nil { panic(err) }
}



/* Web server */

type Hello struct{}

func (h Hello) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if strings.Contains(r.URL.Path, "..") {
		fmt.Fprint(w, "Invalid path")
	} else {
		http.ServeFile(w, r, "." + r.URL.Path)
	}
}

func start_server() {
	var h Hello
	fmt.Println("Serving at localhost:8000")
	http.ListenAndServe("localhost:8000",h)
}

func main() {

	start_watcher()
	start_server()

	// watcher.Close()
}