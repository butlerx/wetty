# Installation from Source

WeTTY can be installed from source or from npm.

To install from source run:

```bash
$ git clone https://github.com/butlerx/wetty.git
$ cd wetty
$ pnpm install
$ pnpm build
```

## Development Env

To run WeTTY in dev mode you can run `pnpm dev`.

WeTTY will then be served from `http://localhost:3000/wetty` on your machine.

The server will be using the [`conf/config.json5`](../conf/config.json5) config
file and be pointing at `localhost` on port `22` .

The Dev server will rebuild WeTTY when ever a file is edited and restart the
server with the new build. Any current ssh session in WeTTY will be killed and
the user logged out.
