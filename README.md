Wetty = Web + tty
-----------------

Terminal over http. Wetty is an alternative to ajaxterm/anyterm but much better than them because wetty uses ChromeOS'  terminal emulator (hterm) which is a full fledged implementation of terminal emulation written entirely in Javascript. Also it uses websockets instead of Ajax and hence better response time.

hterm source - https://chromium.googlesource.com/apps/libapps/+/master/hterm/

![Wetty](/terminal.png?raw=true)

Install
-------

*  `git clone https://github.com/krishnasrinivas/wetty`
  
*  `cd wetty`

*  `npm install`

Run on http:
-----------
  `node app.js -p 3000`

If you run it as root it will launch /bin/login (where you can specify the username), else it will launch ssh to localhost and you can specify the sshport using --sshport option and specify username in address bar like this:

  `http://yourserver:3000/wetty/ssh/<username>`

Run on https:
------------
Always use https! If you don't have ssl certificates from CA you can create a self signed certificate using this command:

  `openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes`

And then run:

  `node app.js --sslkey key.pem --sslcert cert.pem -p 3000`

Again, if you run it as root it will launch /bin/login, else it will launch ssh to localhost as explained above.

Run wetty behind nginx:
----------------------

Put the following config in nginx's conf:

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

If you are running app.js as root and have nginx proxy you have to use:
    `http://yourserver.com/wetty`
Else if you are running app.js as a regular user you have to use:
    `http://yourserver.com/wetty/ssh/<username>`

Note that if your nginx is configured for https you should run wetty without ssl.

Issues
------
Does not work on Firefox as hterm was written for ChromeOS. So works well on Chrome.
