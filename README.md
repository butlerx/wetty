wetty = Web + tty
-----------------

Terminal over http. Wetty is like ajaxterm but much better because it uses ChromeOS' terminal emulator (hterm) which has much better terminal emulation implementation. Also it uses websockets instead of Ajax.

Install
-------

  `git clone https://github.com/krishnasrinivas/wetty`
  
  `cd wetty`

  `npm install`

Run on http:
-----------
(run as root as it needs to exec /bin/login)

  `node app.js -p 3000`

Run on https:
------------
If you don't have ssl certificates from CA you can create a self signed certificate using this command:

  `openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes`

And then run as root:

  `node app.js --sslkey key.pem --sslcert cert.pem -p 3000`


