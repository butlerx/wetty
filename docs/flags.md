# Flags

WeTTY can be run with the `--help` flag to get a full list of flags.

## Server Port

WeTTY runs on port `3000` by default. You can change the default port by
starting with the `--port` or `-p` flag.

## Server Host

By default WeTTY listens on `0.0.0.0` (all interfaces). You can change this with
the `--host` flag, for example `--host 127.0.0.1` to only listen on localhost.

## Unix Socket

Instead of listening on a TCP port, WeTTY can listen on a unix socket using the
`--socket` flag. This is mutually exclusive with `--host` and `--port`.

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

## Allow Remote Hosts

By default WeTTY does not allow the `host` and `port` URL parameters to be used
as the SSH destination. To enable this, use the `--allow-remote-hosts` flag.

## Allow Remote Command

By default WeTTY does not allow the `command` and `path` URL parameters to
specify the command and working directory on the SSH host. To enable this, use
the `--allow-remote-command` flag.

## Log Level

You can set the log level of the WeTTY server using the `--log-level` flag.
Accepts standard log levels (e.g. `debug`, `http`, `info`, `warn`, `error`).
