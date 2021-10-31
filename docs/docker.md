# Dockerized Version

WeTTY can be run from a container to ssh to a remote host or the host system.
This is handy for quick deployments. Just modify `docker-compose.yml` for your
host and run:

```sh
$ docker-compose up -d
```

This will start 2 containers, one will be WeTTY container running ssh client the
other will be a container running ssh server.

Visit the appropriate URL in your browser
(`[localhost|$(boot2docker ip)]:PORT`).

The default username is `term` and the password is `term`, if you did not modify
`SSHHOST`

In the docker version all flags can be accessed as environment variables such as
`SSHHOST` or `SSHPORT`.

If you dont want to build the image yourself just remove the line `build; .`

If you wish to use the WeTTY container in prod just modify the WeTTY container
to have `SSHHOST` point to the server you want to ssh to and remove the ssh
server container.
