# HTTPS

Always use HTTPS especially with a terminal to your server. You can add HTTPS by
either using WeTTY behind a proxy or directly.

See docs for [NGinX](./nginx.md) and [Apache](./apache.md) for running behind a
proxy.

To run WeTTY directly with SSL use both the `--ssl-key` and `--ssl-cert` flags
and pass them the path too your cert and key as follows:

```bash
wetty --ssl-key key.pem --ssl-cert cert.pem
```

If you don't have SSL certificates from a CA you can create a self signed
certificate using this command:

```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 30000 -nodes
```
