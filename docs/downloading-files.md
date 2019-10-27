# File Downloading

WeTTy supports file downloads by printing terminal escape sequences between a
base64 encoded file.

The terminal escape sequences used are `^[[5i` and `^[[4i` (VT100 for "enter
auto print" and "exit auto print" respectively -
https://vt100.net/docs/tp83/appendixc.html).

An example of a helper script that prints the terminal escape characters and
base64s stdin:

```bash
$ cat wetty-download.sh
#!/bin/sh
echo '^[[5i'$(cat /dev/stdin | base64)'^[[4i'
```

You are then able to download files via WeTTy!

```bash
$ cat my-pdf-file.pdf | ./wetty-download.sh
```

WeTTy will then issue a popup like the following that links to a local file
blob: `Download ready: file-20191015233654.pdf`
