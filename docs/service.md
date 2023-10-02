## Run WeTTY as a service daemon

WeTTY can be run as a daemon on your service init confs and systemd services are
bundled with the npm package to make this easier.

### init.d

```bash
$ npm -g i wetty
$ sudo cp ~/.node_modules/wetty/conf/wetty.conf /etc/init
$ sudo start wetty
```

### systemd

```bash
$ yarn global add wetty
$ cp ~/.node_modules/wetty/conf/wetty.service  ~/.config/systemd/user/
$ systemctl --user enable wetty
$ systemctl --user start wetty
```

This will start WeTTY on port 3000. If you want to change the port or redirect
stdout/stderr you should change the last line in `wetty.conf` file, something
like this:

```systemd
exec sudo -u root wetty -p 80 >> /var/log/wetty.log 2>&1
```

Systemd requires an absolute path for a unit's WorkingDirectory, consquently
`$HOME` will need updating to an absolute path in the `wetty.service` file.
