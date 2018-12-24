## Wetty = Web + tty

Terminal over HTTP and HTTPS. Wetty is an alternative to ajaxterm/anyterm but
much better than them because wetty uses ChromeOS' terminal emulator (hterm)
which is a full fledged implementation of terminal emulation written entirely in
Javascript. Also it uses websockets instead of Ajax and hence better response
time.

[hterm source](https://chromium.googlesource.com/apps/libapps/+/master/hterm/)

![Wetty](/terminal.png?raw=true)

## Install


*  `git clone https://github.com/krishnasrinivas/wetty.git`

*  `cd wetty && npm install`

*  `apt-get install sshpass` (debian eg. Ubuntu) only for auto-login feature

*  `yum install sshpass` (red hat flavours eg. CentOs) only for auto-login feature


## Run on HTTP

```bash
npm start
```

If you run it as root it will launch `/bin/login` (where you can specify the
user name), else it will launch `ssh` and connect by default to `localhost`.

If instead you wish to connect to a remote host you can specify the `--sshhost`
option, the SSH port using the `--sshport` option and the SSH user using the
`--sshuser` option.

You can also specify the SSH user name in the address bar like this:

`http://yourserver:3000/wetty/ssh/<username>`

or

`http://yourserver:3000/ssh/<username>`

You can pass an optional password as query parameter to use auto-login feature.

Auto Login:
------------

You can also pass the ssh password as an optional query parameter to auto-login the user like this (Only while running wetty as a non root account):

`http://yourserver:3000/wetty/ssh/<username>?sshpass=<password>`

or

`http://yourserver:3000/ssh/<username>?sshpass=<password>`

This is just an additional feature and the security implications for passing the password in the url will have to be taken care separately.

Run on HTTPS:
------------

Always use HTTPS. If you don't have SSL certificates from a CA you can create a
self signed certificate using this command:

```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes
```

And then run:

    wetty --sslkey key.pem --sslcert cert.pem -p 3000

Again, if you run it as root it will launch `/bin/login`, else it will launch
SSH to `localhost` or a specified host as explained above.

## Run wetty behind nginx or apache

Put the following configuration in nginx's conf:

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

Put the following configuration in apache's conf:

      RewriteCond %{REQUEST_URI}  ^/wetty/socket.io [NC]
      RewriteCond %{QUERY_STRING} transport=websocket [NC]
      RewriteRule /wetty/socket.io/(.*) ws://localhost:9123/wetty/socket.io/$1 [P,L]

      <LocationMatch ^/wetty/(.*)>
              DirectorySlash On
              Require all granted
              ProxyPassMatch http://127.0.0.1:9123
              ProxyPassReverse /wetty/
      </LocationMatch>

If you are running `bin/index.js` as `root` and have an Nginx proxy you have to
use:

```
http://yourserver.com/wetty
```

**Note that if your Nginx is configured for HTTPS you should run wetty without SSL.**

Else if you are running `bin/index.js` as a regular user you can use:

```
http://yourserver.com/wetty/ssh/<username>
```

or

```
http://yourserver.com/wetty
```

**Note that if your Nginx is configured for HTTPS you should run wetty without
SSL.**

## Dockerized Version

This repo includes a Dockerfile you can use to run a Dockerized version of
wetty. You can run whatever you want!

Just modify docker-compose and run:

```
docker-compose up -d
```

Visit the appropriate URL in your browser
(`[localhost|$(boot2docker ip)]:PORT`).

The default username is `term` and the password is `term`, if you did not modify
`SSHHOST`

If you dont want to build the image yourself just remove the line `build; .`

## Run wetty as a service daemon

Install wetty globally with global option:

### init.d

```bash
$ sudo yarn global add wetty
$ sudo cp /usr/local/lib/node_modules/wetty.js/bin/wetty.conf /etc/init
$ sudo start wetty
```

### systemd

```bash
$ yarn global add wetty
$ cp ~/.config/yarn/global/node_modules/wetty.js/bin/wetty.service  ~/.config/systemd/user/
$ systemctl --user enable wetty
$ systemctl --user start wetty
```

This will start wetty on port 3000. If you want to change the port or redirect
stdout/stderr you should change the last line in `wetty.conf` file, something
like this:

```
exec sudo -u root wetty -p 80 >> /var/log/wetty.log 2>&1
```

## FAQ

### What browsers are supported?

Wetty supports all browsers that Google's hterm supports. Wetty has been
[reported](https://github.com/krishnasrinivas/wetty/issues/45#issuecomment-181448586)
to work on Google Chrome, Firefox and IE 11.

### Why isn't Wetty working with IE?

[This fix](https://stackoverflow.com/questions/13102116/access-denied-for-localstorage-in-ie10#20848924)
has been known to help some users.
