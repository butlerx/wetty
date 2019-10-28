# HTTPS

Always use HTTPS especially with a terminal to your server. You can add HTTPS by
either using WeTTy behind a proxy or directly.

See docs for [NGinX](./nginx.md) and [Apache](./apache.md) for running behind a
proxy.

To run WeTTy directly with SSL use both the `--sslkey` and `--sslcert` flags and
pass them the path too your cert and key as follows:

```bash
wetty --sslkey key.pem --sslcert cert.pem
```

If you don't have SSL certificates from a CA you can create a self signed
certificate using this command:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes
```
