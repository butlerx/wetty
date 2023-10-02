# WeTTY = Web + TTY.

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-41-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

[![Documentation](https://img.shields.io/badge/documentation-yes-brightgreen.svg)](https://github.com/butlerx/wetty/tree/main/docs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/butlerx/wetty/blob/main/LICENSE)

> Terminal access in browser over http/https

![WeTTY](./docs/terminal.png?raw=true)

Terminal over HTTP and https. WeTTY is an alternative to ajaxterm and anyterm
but much better than them because WeTTY uses xterm.js which is a full fledged
implementation of terminal emulation written entirely in JavaScript. WeTTY uses
websockets rather than Ajax and hence better response time.

## Prerequisites

- node >=18
- make
- python
- build-essential

## Install

```sh
npm -g i wetty
```

## Usage

```sh
$ wetty --help
Options:
  --help, -h      Print help message                                   [boolean]
  --version       Show version number                                  [boolean]
  --conf          config file to load config from                       [string]
  --ssl-key       path to SSL key                                       [string]
  --ssl-cert      path to SSL certificate                               [string]
  --ssh-host      ssh server host                                       [string]
  --ssh-port      ssh server port                                       [number]
  --ssh-user      ssh user                                              [string]
  --title         window title                                          [string]
  --ssh-auth      defaults to "password", you can use "publickey,password"
                  instead                                               [string]
  --ssh-pass      ssh password                                          [string]
  --ssh-key       path to an optional client private key (connection will be
                  password-less and insecure!)                          [string]
  --ssh-config    Specifies an alternative ssh configuration file. For further
                  details see "-F" option in ssh(1)                     [string]
  --force-ssh     Connecting through ssh even if running as root       [boolean]
  --known-hosts   path to known hosts file                              [string]
  --base, -b      base path to wetty                                    [string]
  --port, -p      wetty listen port                                     [number]
  --host          wetty listen host                                     [string]
  --command, -c   command to run in shell                               [string]
  --allow-iframe  Allow wetty to be embedded in an iframe, defaults to allowing
                  same origin                                          [boolean]
```

Open your browser on `http://yourserver:3000/wetty` and you will prompted to
login. Or go to `http://yourserver:3000/wetty/ssh/<username>` to specify the
user beforehand.

If you run it as root it will launch `/bin/login` (where you can specify the
user name), else it will launch `ssh` and connect by default to `localhost`. The
SSH connection can be forced using the `--force-ssh` option.

If instead you wish to connect to a remote host you can specify the `--ssh-host`
option, the SSH port using the `--ssh-port` option and the SSH user using the
`--ssh-user` option.

Check out the [Flags docs](https://butlerx.github.io/wetty/flags) for a full
list of flags

### Docker container

To use WeTTY as a docker container, a docker image is available on
[docker hub](https://hub.docker.com/r/wettyoss/wetty). To run this image, use

```sh
docker run --rm -p 3000:3000 wettyoss/wetty --ssh-host=<YOUR-IP>
```

and you will be able to open a ssh session to the host given by `YOUR-IP` under
the URL [http://localhost:3000/wetty](http://localhost:3000/wetty).

It is recommended to drive WeTTY behind a reverse proxy to have HTTPS security
and possibly Let’s Encrypt support. Popular containers to achieve this are
[nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) and
[traefik](https://traefik.io/traefik/). For traefik there is an example
docker-compose file in the containers directory.

## FAQ

Check out the [docs](https://github.com/butlerx/wetty/tree/main/docs)

- [Running as daemon](https://butlerx.github.io/wetty/service)
- [HTTPS Support](https://butlerx.github.io/wetty/https)
  - [Using NGINX](https://butlerx.github.io/wetty/nginx)
  - [Using Apache](https://butlerx.github.io/wetty/apache)
- [Automatic Login](https://butlerx.github.io/wetty/auto-login)
- [Downloading Files](https://butlerx.github.io/wetty/downloading-files)

### What browsers are supported?

WeTTY supports all browsers that
[xterm.js supports](https://github.com/xtermjs/xterm.js#browser-support).

## Author

👤 **Cian Butler <butlerx@notthe.cloud>**

- Mastodon: [@butlerx@mastodon.ie](https://mastodon.ie/@butlerx)
- Github: [@butlerx](https://github.com/butlerx)

## Contributing ✨

Contributions, issues and feature requests are welcome!<br />Feel free to check
[issues page](https://github.com/butlerx/wetty/issues).

Please read the [development docs](https://butlerx.github.io/wetty/development)
for installing from source and running is dev node

Thanks goes to these wonderful people
([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://cianbutler.ie"><img src="https://avatars1.githubusercontent.com/u/867930?v=4?s=100" width="100px;" alt="Cian Butler"/><br /><sub><b>Cian Butler</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=butlerx" title="Code">💻</a> <a href="https://github.com/butlerx/WeTTy/commits?author=butlerx" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://about.me/krishnasrinivas"><img src="https://avatars0.githubusercontent.com/u/634494?v=4?s=100" width="100px;" alt="Krishna Srinivas"/><br /><sub><b>Krishna Srinivas</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=krishnasrinivas" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/acalatrava"><img src="https://avatars1.githubusercontent.com/u/8502129?v=4?s=100" width="100px;" alt="acalatrava"/><br /><sub><b>acalatrava</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=acalatrava" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Strubbl"><img src="https://avatars3.githubusercontent.com/u/97055?v=4?s=100" width="100px;" alt="Strubbl"/><br /><sub><b>Strubbl</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=Strubbl" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/2sheds"><img src="https://avatars3.githubusercontent.com/u/16163?v=4?s=100" width="100px;" alt="Oleg Kurapov"/><br /><sub><b>Oleg Kurapov</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=2sheds" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.rabchev.com"><img src="https://avatars0.githubusercontent.com/u/1876061?v=4?s=100" width="100px;" alt="Boyan Rabchev"/><br /><sub><b>Boyan Rabchev</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=rabchev" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nosemeocurrenada"><img src="https://avatars1.githubusercontent.com/u/3845708?v=4?s=100" width="100px;" alt="Jimmy"/><br /><sub><b>Jimmy</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nosemeocurrenada" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.gerritforge.com"><img src="https://avatars3.githubusercontent.com/u/182893?v=4?s=100" width="100px;" alt="Luca Milanesio"/><br /><sub><b>Luca Milanesio</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=lucamilanesio" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://anthonyjund.com"><img src="https://avatars3.githubusercontent.com/u/39376331?v=4?s=100" width="100px;" alt="Anthony Jund"/><br /><sub><b>Anthony Jund</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=antonyjim" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.mirtouf.fr"><img src="https://avatars3.githubusercontent.com/u/5165058?v=4?s=100" width="100px;" alt="mirtouf"/><br /><sub><b>mirtouf</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=mirtouf" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://cor-net.org"><img src="https://avatars1.githubusercontent.com/u/556693?v=4?s=100" width="100px;" alt="Bertrand Roussel"/><br /><sub><b>Bertrand Roussel</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=CoRfr" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.benl.com.au/"><img src="https://avatars0.githubusercontent.com/u/6703966?v=4?s=100" width="100px;" alt="Ben Letchford"/><br /><sub><b>Ben Letchford</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=benletchford" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SouraDutta"><img src="https://avatars0.githubusercontent.com/u/33066261?v=4?s=100" width="100px;" alt="SouraDutta"/><br /><sub><b>SouraDutta</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=SouraDutta" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/koushikmln"><img src="https://avatars3.githubusercontent.com/u/8670988?v=4?s=100" width="100px;" alt="Koushik M.L.N"/><br /><sub><b>Koushik M.L.N</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=koushikmln" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://imu.li/"><img src="https://avatars3.githubusercontent.com/u/4085046?v=4?s=100" width="100px;" alt="Imuli"/><br /><sub><b>Imuli</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=imuli" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/perpen"><img src="https://avatars2.githubusercontent.com/u/9963805?v=4?s=100" width="100px;" alt="perpen"/><br /><sub><b>perpen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=perpen" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nathanleclaire.com"><img src="https://avatars3.githubusercontent.com/u/1476820?v=4?s=100" width="100px;" alt="Nathan LeClaire"/><br /><sub><b>Nathan LeClaire</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nathanleclaire" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MiKr13"><img src="https://avatars2.githubusercontent.com/u/34394719?v=4?s=100" width="100px;" alt="Mihir Kumar"/><br /><sub><b>Mihir Kumar</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=MiKr13" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://redhat.com"><img src="https://avatars0.githubusercontent.com/u/540893?v=4?s=100" width="100px;" alt="Chris Suszynski"/><br /><sub><b>Chris Suszynski</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=cardil" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://9wd.de"><img src="https://avatars1.githubusercontent.com/u/1257835?v=4?s=100" width="100px;" alt="Felix Bartels"/><br /><sub><b>Felix Bartels</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=fbartels" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jarrettgilliam"><img src="https://avatars3.githubusercontent.com/u/5099690?v=4?s=100" width="100px;" alt="Jarrett Gilliam"/><br /><sub><b>Jarrett Gilliam</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jarrettgilliam" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://harrylee.me"><img src="https://avatars0.githubusercontent.com/u/7056279?v=4?s=100" width="100px;" alt="Harry Lee"/><br /><sub><b>Harry Lee</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=harryleesan" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://andreask.cs.illinois.edu"><img src="https://avatars3.githubusercontent.com/u/352067?v=4?s=100" width="100px;" alt="Andreas Klöckner"/><br /><sub><b>Andreas Klöckner</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=inducer" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DenisKramer"><img src="https://avatars1.githubusercontent.com/u/23534092?v=4?s=100" width="100px;" alt="DenisKramer"/><br /><sub><b>DenisKramer</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=DenisKramer" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vamship"><img src="https://avatars0.githubusercontent.com/u/7143376?v=4?s=100" width="100px;" alt="Vamshi K Ponnapalli"/><br /><sub><b>Vamshi K Ponnapalli</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=vamship" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tridnguyen.com"><img src="https://avatars1.githubusercontent.com/u/1652595?v=4?s=100" width="100px;" alt="Tri Nguyen"/><br /><sub><b>Tri Nguyen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=tnguyen14" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://felix.pojtinger.com/"><img src="https://avatars1.githubusercontent.com/u/28832235?v=4?s=100" width="100px;" alt="Felix Pojtinger"/><br /><sub><b>Felix Pojtinger</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=pojntfx" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nealey.github.io/"><img src="https://avatars3.githubusercontent.com/u/423780?v=4?s=100" width="100px;" alt="Neale Pickett"/><br /><sub><b>Neale Pickett</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=nealey" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.matthewpiercey.ml"><img src="https://avatars3.githubusercontent.com/u/22581026?v=4?s=100" width="100px;" alt="Matthew Piercey"/><br /><sub><b>Matthew Piercey</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=mtpiercey" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kholbekj"><img src="https://avatars3.githubusercontent.com/u/2786571?v=4?s=100" width="100px;" alt="Kasper Holbek Jensen"/><br /><sub><b>Kasper Holbek Jensen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=kholbekj" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mastodon.technology/@farhan"><img src="https://avatars1.githubusercontent.com/u/10103765?v=4?s=100" width="100px;" alt="Farhan Khan"/><br /><sub><b>Farhan Khan</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=khanzf" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.jurrevriesen.nl"><img src="https://avatars1.githubusercontent.com/u/7419259?v=4?s=100" width="100px;" alt="Jurre Vriesen"/><br /><sub><b>Jurre Vriesen</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jurruh" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.kartar.net/"><img src="https://avatars3.githubusercontent.com/u/4365?v=4?s=100" width="100px;" alt="James Turnbull"/><br /><sub><b>James Turnbull</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=jamtur01" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/deanshub"><img src="https://avatars2.githubusercontent.com/u/2688676?v=4?s=100" width="100px;" alt="Dean Shub"/><br /><sub><b>Dean Shub</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=deanshub" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lozbrown"><img src="https://avatars3.githubusercontent.com/u/9961593?v=4?s=100" width="100px;" alt="lozbrown "/><br /><sub><b>lozbrown </b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=lozbrown" title="Code">💻</a> <a href="#example-lozbrown" title="Examples">💡</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sergeir82"><img src="https://avatars0.githubusercontent.com/u/5081149?v=4?s=100" width="100px;" alt="sergeir82"/><br /><sub><b>sergeir82</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=sergeir82" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kmlucy"><img src="https://avatars1.githubusercontent.com/u/13952475?v=4?s=100" width="100px;" alt="Kyle Lucy"/><br /><sub><b>Kyle Lucy</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=kmlucy" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/userdocs"><img src="https://avatars1.githubusercontent.com/u/16525024?v=4?s=100" width="100px;" alt="userdocs"/><br /><sub><b>userdocs</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=userdocs" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://logmein.com/"><img src="https://avatars3.githubusercontent.com/u/1554533?v=4?s=100" width="100px;" alt="Janos Kasza"/><br /><sub><b>Janos Kasza</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=janoskk" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://grantshandy.xyz/"><img src="https://avatars3.githubusercontent.com/u/45475651?v=4?s=100" width="100px;" alt="Grant Handy"/><br /><sub><b>Grant Handy</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=DefunctLizard" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/LeszekBlazewski"><img src="https://avatars.githubusercontent.com/u/34927142?v=4?s=100" width="100px;" alt="Leszek Błażewski"/><br /><sub><b>Leszek Błażewski</b></sub></a><br /><a href="https://github.com/butlerx/WeTTy/commits?author=LeszekBlazewski" title="Code">💻</a> <a href="#platform-LeszekBlazewski" title="Packaging/porting to new platform">📦</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
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
project is [MIT](https://github.com/butlerx/wetty/blob/main/LICENSE) licensed.

---
