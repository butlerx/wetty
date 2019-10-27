## Run WeTTy as a service daemon

WeTTy can be run as a daemon on your service init confs and systemd services are
bundled with the npm package to make this easier.

### init.d

```bash
$ yarn global add wetty
$ sudo cp ~/.config/yarn/global/node_modules/wetty/bin/wetty.conf /etc/init
$ sudo start wetty
```

### systemd

```bash
$ yarn global add wetty
$ cp ~/.config/yarn/global/node_modules/wetty/bin/wetty.service  ~/.config/systemd/user/
$ systemctl --user enable wetty
$ systemctl --user start wetty
```

This will start WeTTy on port 3000. If you want to change the port or redirect
stdout/stderr you should change the last line in `wetty.conf` file, something
like this:

```systemd
exec sudo -u root wetty -p 80 >> /var/log/wetty.log 2>&1
```
