# File Downloading

WeTTY supports file downloads by printing terminal escape sequences between a
base64 encoded file. The name of the downloaded file can optionally be provided,
also base64 encoded, before the encoded file contents with a `:` separating them.

The terminal escape sequences used are `^[[5i` and `^[[4i` (VT100 for "enter
auto print" and "exit auto print" respectively -
https://vt100.net/docs/tp83/appendixc.html).

To take advantage add the following bash function to your `.bashrc`

```bash
function wetty-download() {
  file=${1:-/dev/stdin}

  nameprefix=""
  if [[ -f "$file" ]]; then
    nameprefix="$(basename "$file" | base64 -w 0):"
  fi


  if [[ -f "$file" || "$file" == "/dev/stdin" ]]; then
    printf "\033[5i"$nameprefix$(cat "$file" | base64 -w 0)"\033[4i"
  else
    echo "$file does not appear to be a file"
  fi
}
```

You are then able to download files via WeTTY!

```bash
wetty-download my-pdf-file.pdf
```

or you can still use the classic style:

```bash
$ cat my-pdf-file.pdf | wetty-download
```

WeTTY will then issue a popup like the following that links to a local file
blob: `Download ready: file-20191015233654.pdf`
