## WeTTy = Web + TTy

[ ![Codeship Status for butlerx/wetty](https://app.codeship.com/projects/caf50220-f884-0135-63bd-5231a73eac2d/status?branch=master)](https://app.codeship.com/projects/278281)

Terminal over HTTP and https. WeTTy is an alternative to ajaxterm and anyterm
but much better than them because WeTTy uses xterm.js which is a full fledged
implementation of terminal emulation written entirely in JavaScript. WeTTy uses
websockets rather then Ajax and hence better response time.

![WeTTy](/terminal.png?raw=true)

## Install

WeTTy can be installed from source or from npm.

To install from source run:

```bash
$ git clone https://github.com/krishnasrinivas/wetty.git
$ cd wetty
$ yarn
$ yarn build
```

To install it globally from npm use yarn or npm:

- yarn, `yarn global add wetty.js`
- npm, `npm i -g wetty.js`

For auto-login feature you'll need sshpass installed (NOT required for rest of
the program).

- `apt-get install sshpass` (debian eg. Ubuntu)
- `yum install sshpass` (red hat flavours eg. CentOs)

## Running WeTTy

Wettu can either be run as a standalone service or from another node script. To
see how to use WeTTy from node see the [API Doc](./docs)

```bash
$ node index.js
```

Open your browser on `http://yourserver:3000/wetty` and you will prompted to
login. Or go to `http://yourserver:3000/wetty/ssh/<username>` to specify the
user before hand.

If you run it as root it will launch `/bin/login` (where you can specify the
user name), else it will launch `ssh` and connect by default to `localhost`.

If instead you wish to connect to a remote host you can specify the `--sshhost`
option, the SSH port using the `--sshport` option and the SSH user using the
`--sshuser` option.

### Flags

WeTTy can be run with the `--help` flag to get a full list of flags.

#### Server Port

WeTTy runs on port `3000` by default. You can change the default port by
starting with the `--port` or `-p` flag.

#### SSH Host

If WeTTy is run as root while the host is set as the local machine it will use
the `login` binary rather than ssh. If no host is specified it will use
`localhost` as the ssh host.

If instead you wish to connect to a remote host you can specify the host with
the `--sshhost` flag and pass the IP or DNS address of the host you want to
connect to.

#### Default User

You can specify the default user used to ssh to a host using the `--sshuser`.
This user can overwritten by going to `http://yourserver:3000/ssh/<username>`.
If this is left blank a user will be prompted to enter their username when they
connect.

#### SSH Port

By default WeTTy will try to ssh to port `22`, if your host uses an alternative
ssh port this can be specified with the flag `--sshport`.

#### WeTTy URL

If you'd prefer an HTTP base prefix other than `/wetty`, you can specify that
with `--base`.

**Do not set this to `/ssh/${something}`, as this will break username matching
code.**

#### HTTPS

Always use HTTPS especially with a terminal to your server. You can add HTTPS by
either using WeTTy behind a proxy or directly.

To run WeTTy directly with ssl use both the `--sslkey` and `--sslcert` flags and
pass them the path too your cert and key as follows:

```bash
node index.js --sslkey key.pem --sslcert cert.pem
```

If you don't have SSL certificates from a CA you can create a self signed
certificate using this command:

```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes
```

### Auto Login:

You can also pass the ssh password as an optional query parameter to auto-login
the user like this (Only while running wetty as a non root account):

`http://yourserver:3000/wetty/ssh/<username>?sshpass=<password>`

This is not a required feature and the security implications for passing the
password in the url will have to be considered by the user

## Run wetty behind nginx or apache

As said earlier you can use a proxy to add https to WeTTy.

**Note** that if your proxy is configured for https you should run WeTTy without
SSL

If your proxy uses a base path other than `/wetty`, specify the path with the
`--base` flag, or the `BASE` environment variable.

#### Nginx

For a more detailed look see the [nginx.conf](./bin/nginx.template) used for
testing

Put the following configuration in nginx's conf:

```nginx
location /wetty {
  proxy_pass http://127.0.0.1:3000/wetty;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 43200000;

  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Host $http_host;
  proxy_set_header X-NginX-Proxy true;
}
```

#### Apache

Put the following configuration in apache's conf:

```apache
RewriteCond %{REQUEST_URI}  ^/wetty/socket.io [NC]
RewriteCond %{QUERY_STRING} transport=websocket [NC]
RewriteRule /wetty/socket.io/(.*) ws://localhost:3000/wetty/socket.io/$1 [P,L]

<LocationMatch ^/wetty/(.*)>
  DirectorySlash On
  Require all granted
  ProxyPassMatch http://127.0.0.1:3000
  ProxyPassReverse /wetty/
</LocationMatch>
```

### Dockerized Version

WeTTy can be run from a container to ssh to a remote host or the host system.
This is handy for quick deployments. Just modify `docker-compose.yml` for your
host and run:

```sh
$ docker-compose up -d
```

Visit the appropriate URL in your browser
(`[localhost|$(boot2docker ip)]:PORT`).

The default username is `term` and the password is `term`, if you did not modify
`SSHHOST`

In the docker version all flags can be accessed as environment variables such as
`SSHHOST` or `SSHPORT`.

If you dont want to build the image yourself just remove the line `build; .`

## Run WeTTy as a service daemon

### init.d

```bash
$ sudo yarn global add wetty.js
$ sudo cp ~/.config/yarn/global/node_modules/wetty.js/bin/wetty.conf /etc/init
$ sudo start wetty
```

### systemd

```bash
$ yarn global add wetty.js
$ cp ~/.config/yarn/global/node_modules/wetty.js/bin/wetty.service  ~/.config/systemd/user/
$ systemctl --user enable wetty
$ systemctl --user start wetty
```

This will start WeTTy on port 3000. If you want to change the port or redirect
stdout/stderr you should change the last line in `wetty.conf` file, something
like this:

```systemd
exec sudo -u root wetty -p 80 >> /var/log/wetty.log 2>&1
```

## FAQ

### What browsers are supported?

WeTTy supports all browsers that
[xterm.js supports](https://github.com/xtermjs/xterm.js#browser-support).
