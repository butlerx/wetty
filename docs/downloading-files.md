# File Downloading

WeTTY supports file downloads by printing terminal escape sequences between a
base64 encoded file.

The terminal escape sequences used are `^[[5i` and `^[[4i` (VT100 for "enter
auto print" and "exit auto print" respectively -
https://vt100.net/docs/tp83/appendixc.html).

To take advantage add the following bash function to your `.bashrc`

```bash
function wetty-download() {
  printf "\033[5i"$(cat /dev/stdin | base64 -w 0)"\033[4i"
}
```

You are then able to download files via WeTTY!

```bash
$ cat my-pdf-file.pdf | ./wetty-download.sh
```

WeTTY will then issue a popup like the following that links to a local file
blob: `Download ready: file-20191015233654.pdf`
