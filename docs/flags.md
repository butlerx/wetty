# Flags

WeTTY can be run with the `--help` flag to get a full list of flags.

## Server Port

WeTTY runs on port `3000` by default. You can change the default port by
starting with the `--port` or `-p` flag.

## SSH Host

If WeTTY is run as root while the host is set as the local machine it will use
the `login` binary rather than ssh. If no host is specified it will use
`localhost` as the ssh host.

If instead you wish to connect to a remote host you can specify the host with
the `--ssh-host` flag and pass the IP or DNS address of the host you want to
connect to.

## Default User

You can specify the default user used to ssh to a host using the `--ssh-user`.
This user can overwritten by going to
`http://yourserver:3000/wetty/ssh/<username>`. If this is left blank a user will
be prompted to enter their username when they connect.

## SSH Port

By default WeTTY will try to ssh to port `22`, if your host uses an alternative
ssh port this can be specified with the flag `--ssh-port`.

## WeTTY URL

If you'd prefer an HTTP base prefix other than `/wetty`, you can specify that
with `--base`.

**Do not set this to `/ssh/${something}`, as this will break username matching
code.**

## Expose HTTP Headers as env vars

If you wish to expose one (or many) request HTTP Headers as environment variables,
you can specify that using the `--env-from-header` flag. The syntax is 
`--env-from-header VARNAME:http_header_lowercase`.

You can export as many variables as you want by using the flag multiple times. 
However, the flag is useless if not combined with `--command` that could use these
variables to achieve what you want to do.

This flag is particularly if wetty is behind a reverse proxy and allow you to propagate
some authentication information (username, ssh key ...) in the most secure way (command-line
is not safe most of the same for sensitive information).
