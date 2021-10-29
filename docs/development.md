# Installation from Source

WeTTY can be installed from source or from npm.

To install from source run:

```bash
$ git clone https://github.com/butlerx/wetty.git
$ cd wetty
$ yarn
$ yarn build
```

## Development Env

To run WeTTY in dev mode you can run `yarn dev` this will build latest version
of WeTTY and start the server pointing at `localhost` on port `22`. The Dev
server will rebuild WeTTY when ever a file is edited and restart the server with
the new build. Any current ssh session in WeTTY will be killed and the user
logged out.
