# WeTTY = Web + TTY.

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-33-orange.svg?style=flat-square)](#contributors-)]<!-- ALL-CONTRIBUTORS-BADGE:END -->

![Version](https://img.shields.io/badge/version-1.1.7-blue.svg?cacheSeconds=2592000)
![Node Version](https://img.shields.io/badge/node-%3E%3D6.9-blue.svg)
[![Documentation](https://img.shields.io/badge/documentation-yes-brightgreen.svg)](https://github.com/butlerx/wetty/tree/master/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/butlerx/wetty/blob/master/LICENSE)
[![Twitter: cianbutlerx](https://img.shields.io/twitter/follow/cianbutlerx.svg?style=social)](https://twitter.com/cianbutlerx)

> Terminal access in browser over http/https

![Terminal](https://github.com/butlerx/wetty/raw/master/docs/terminal.png)

Terminal over HTTP and https. WeTTy is an alternative to ajaxterm and anyterm
but much better than them because WeTTy uses xterm.js which is a full fledged
implementation of terminal emulation written entirely in JavaScript. WeTTy uses
websockets rather then Ajax and hence better response time.

## Prerequisites

- node >=6.9
- make
- python
- build-essential

## Install

```sh
yarn global add wetty
```

## Usage

```sh
wetty [-h] [--port PORT] [--base BASE] [--sshhost SSH_HOST] [--sshport SSH_PORT] [--sshuser SSH_USER] [--host HOST] [--command COMMAND] [--bypasshelmet] [--title TITLE] [--sslkey SSL_KEY_PATH] [--sslcert SSL_CERT_PATH]
```

Open your browser on `http://yourserver:3000/wetty` and you will prompted to
login. Or go to `http://yourserver:3000/wetty/ssh/<username>` to specify the
user before hand.

If you run it as root it will launch `/bin/login` (where you can specify the
user name), else it will launch `ssh` and connect by default to `localhost`.

If instead you wish to connect to a remote host you can specify the `--sshhost`
option, the SSH port using the `--sshport` option and the SSH user using the
`--sshuser` option.

Check out the
[Flags docs](https://github.com/butlerx/wetty/blob/master/docs/flags.md) for a
full list of flags

## FAQ

Check out the [docs](https://github.com/butlerx/wetty/tree/master/docs)

- [Running as daemon](https://github.com/butlerx/wetty/blob/master/docs/service.md)
- [SSL Support](https://github.com/butlerx/wetty/blob/master/docs/ssl.md)
  - [Using NGINX](https://github.com/butlerx/wetty/blob/master/docs/nginx.md)
  - [Using Apache](https://github.com/butlerx/wetty/blob/master/docs/apache.md)
- [Automatic Login](https://github.com/butlerx/wetty/blob/master/docs/auto-login.md)
- [Downloading Files](https://github.com/butlerx/wetty/blob/master/docs/downloading-files.md)

### What browsers are supported?

WeTTy supports all browsers that
[xterm.js supports](https://github.com/xtermjs/xterm.js#browser-support).

## Author

👤 **Cian Butler <butlerx@notthe.cloud>**

- Twitter: [@cianbutlerx](https://twitter.com/cianbutlerx)
- Github: [@butlerx](https://github.com/butlerx)

## Contributing ✨

Contributions, issues and feature requests are welcome!<br />Feel free to check
[issues page](https://github.com/butlerx/wetty/issues).

Please read the
[development docs](https://github.com/butlerx/wetty/blob/master/docs/development.md)
for installing from source and running is dev node

Thanks goes to these wonderful people
([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://cianbutler.ie"><img src="https://avatars1.githubusercontent.com/u/867930?v=4" width="100px;" alt="Cian Butler"/><br /><sub><b>Cian Butler</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=butlerx" title="Code">💻</a> <a href="https://github.com/butlerx/WeTTy/commits?author=butlerx" title="Documentation">📖</a></td>
    <td align="center"><a href="http://about.me/krishnasrinivas"><img src="https://avatars0.githubusercontent.com/u/634494?v=4" width="100px;" alt="Krishna Srinivas"/><br /><sub><b>Krishna Srinivas</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=krishnasrinivas" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/acalatrava"><img src="https://avatars1.githubusercontent.com/u/8502129?v=4" width="100px;" alt="acalatrava"/><br /><sub><b>acalatrava</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=acalatrava" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/Strubbl"><img src="https://avatars3.githubusercontent.com/u/97055?v=4" width="100px;" alt="Strubbl"/><br /><sub><b>Strubbl</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=Strubbl" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/2sheds"><img src="https://avatars3.githubusercontent.com/u/16163?v=4" width="100px;" alt="Oleg Kurapov"/><br /><sub><b>Oleg Kurapov</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=2sheds" title="Code">💻</a></td>
    <td align="center"><a href="http://www.rabchev.com"><img src="https://avatars0.githubusercontent.com/u/1876061?v=4" width="100px;" alt="Boyan Rabchev"/><br /><sub><b>Boyan Rabchev</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=rabchev" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/nosemeocurrenada"><img src="https://avatars1.githubusercontent.com/u/3845708?v=4" width="100px;" alt="Jimmy"/><br /><sub><b>Jimmy</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nosemeocurrenada" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="http://www.gerritforge.com"><img src="https://avatars3.githubusercontent.com/u/182893?v=4" width="100px;" alt="Luca Milanesio"/><br /><sub><b>Luca Milanesio</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=lucamilanesio" title="Code">💻</a></td>
    <td align="center"><a href="http://anthonyjund.com"><img src="https://avatars3.githubusercontent.com/u/39376331?v=4" width="100px;" alt="Anthony Jund"/><br /><sub><b>Anthony Jund</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=antonyjim" title="Code">💻</a></td>
    <td align="center"><a href="https://www.mirtouf.fr"><img src="https://avatars3.githubusercontent.com/u/5165058?v=4" width="100px;" alt="mirtouf"/><br /><sub><b>mirtouf</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=mirtouf" title="Code">💻</a></td>
    <td align="center"><a href="https://cor-net.org"><img src="https://avatars1.githubusercontent.com/u/556693?v=4" width="100px;" alt="Bertrand Roussel"/><br /><sub><b>Bertrand Roussel</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=CoRfr" title="Code">💻</a></td>
    <td align="center"><a href="https://www.benl.com.au/"><img src="https://avatars0.githubusercontent.com/u/6703966?v=4" width="100px;" alt="Ben Letchford"/><br /><sub><b>Ben Letchford</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=benletchford" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/SouraDutta"><img src="https://avatars0.githubusercontent.com/u/33066261?v=4" width="100px;" alt="SouraDutta"/><br /><sub><b>SouraDutta</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=SouraDutta" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/koushikmln"><img src="https://avatars3.githubusercontent.com/u/8670988?v=4" width="100px;" alt="Koushik M.L.N"/><br /><sub><b>Koushik M.L.N</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=koushikmln" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://imu.li/"><img src="https://avatars3.githubusercontent.com/u/4085046?v=4" width="100px;" alt="Imuli"/><br /><sub><b>Imuli</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=imuli" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/perpen"><img src="https://avatars2.githubusercontent.com/u/9963805?v=4" width="100px;" alt="perpen"/><br /><sub><b>perpen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=perpen" title="Code">💻</a></td>
    <td align="center"><a href="https://nathanleclaire.com"><img src="https://avatars3.githubusercontent.com/u/1476820?v=4" width="100px;" alt="Nathan LeClaire"/><br /><sub><b>Nathan LeClaire</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nathanleclaire" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/MiKr13"><img src="https://avatars2.githubusercontent.com/u/34394719?v=4" width="100px;" alt="Mihir Kumar"/><br /><sub><b>Mihir Kumar</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=MiKr13" title="Code">💻</a></td>
    <td align="center"><a href="http://redhat.com"><img src="https://avatars0.githubusercontent.com/u/540893?v=4" width="100px;" alt="Chris Suszynski"/><br /><sub><b>Chris Suszynski</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=cardil" title="Code">💻</a></td>
    <td align="center"><a href="http://9wd.de"><img src="https://avatars1.githubusercontent.com/u/1257835?v=4" width="100px;" alt="Felix Bartels"/><br /><sub><b>Felix Bartels</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=fbartels" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jarrettgilliam"><img src="https://avatars3.githubusercontent.com/u/5099690?v=4" width="100px;" alt="Jarrett Gilliam"/><br /><sub><b>Jarrett Gilliam</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jarrettgilliam" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://harrylee.me"><img src="https://avatars0.githubusercontent.com/u/7056279?v=4" width="100px;" alt="Harry Lee"/><br /><sub><b>Harry Lee</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=harryleesan" title="Code">💻</a></td>
    <td align="center"><a href="http://andreask.cs.illinois.edu"><img src="https://avatars3.githubusercontent.com/u/352067?v=4" width="100px;" alt="Andreas Klöckner"/><br /><sub><b>Andreas Klöckner</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=inducer" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/DenisKramer"><img src="https://avatars1.githubusercontent.com/u/23534092?v=4" width="100px;" alt="DenisKramer"/><br /><sub><b>DenisKramer</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=DenisKramer" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/vamship"><img src="https://avatars0.githubusercontent.com/u/7143376?v=4" width="100px;" alt="Vamshi K Ponnapalli"/><br /><sub><b>Vamshi K Ponnapalli</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=vamship" title="Code">💻</a></td>
    <td align="center"><a href="https://tridnguyen.com"><img src="https://avatars1.githubusercontent.com/u/1652595?v=4" width="100px;" alt="Tri Nguyen"/><br /><sub><b>Tri Nguyen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=tnguyen14" title="Documentation">📖</a></td>
    <td align="center"><a href="https://felix.pojtinger.com/"><img src="https://avatars1.githubusercontent.com/u/28832235?v=4" width="100px;" alt="Felix Pojtinger"/><br /><sub><b>Felix Pojtinger</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=pojntfx" title="Documentation">📖</a></td>
    <td align="center"><a href="https://nealey.github.io/"><img src="https://avatars3.githubusercontent.com/u/423780?v=4" width="100px;" alt="Neale Pickett"/><br /><sub><b>Neale Pickett</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nealey" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.matthewpiercey.ml"><img src="https://avatars3.githubusercontent.com/u/22581026?v=4" width="100px;" alt="Matthew Piercey"/><br /><sub><b>Matthew Piercey</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=mtpiercey" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/kholbekj"><img src="https://avatars3.githubusercontent.com/u/2786571?v=4" width="100px;" alt="Kasper Holbek Jensen"/><br /><sub><b>Kasper Holbek Jensen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=kholbekj" title="Documentation">📖</a></td>
    <td align="center"><a href="https://mastodon.technology/@farhan"><img src="https://avatars1.githubusercontent.com/u/10103765?v=4" width="100px;" alt="Farhan Khan"/><br /><sub><b>Farhan Khan</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=khanzf" title="Code">💻</a></td>
    <td align="center"><a href="https://www.jurrevriesen.nl"><img src="https://avatars1.githubusercontent.com/u/7419259?v=4" width="100px;" alt="Jurre Vriesen"/><br /><sub><b>Jurre Vriesen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jurruh" title="Code">💻</a></td>
    <td align="center"><a href="https://www.kartar.net/"><img src="https://avatars3.githubusercontent.com/u/4365?v=4" width="100px;" alt="James Turnbull"/><br /><sub><b>James Turnbull</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jamtur01" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the
[all-contributors](https://github.com/all-contributors/all-contributors)
specification. Contributions of any kind welcome!

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2019
[Cian Butler <butlerx@notthe.cloud>](https://github.com/butlerx).<br /> This
project is [MIT](https://github.com/butlerx/wetty/blob/master/LICENSE) licensed.

---
