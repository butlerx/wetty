## Run wetty behind nginx or apache

As said earlier you can use a proxy to add https to WeTTy.

**Note** that if your proxy is configured for https you should run WeTTy without
SSL

If your proxy uses a base path other than `/wetty`, specify the path with the
`--base` flag, or the `BASE` environment variable.

The following confs assume you want to serve wetty on the url
`example.com/wetty` and are running wetty with the default base and serving it
on the same server

Put the following configuration in apache's conf:

```apache
RewriteCond %{REQUEST_URI}  ^/wetty/socket.io [NC]
RewriteCond %{QUERY_STRING} transport=websocket [NC]
RewriteRule /wetty/socket.io/(.*) ws://localhost:3000/wetty/socket.io/$1 [P,L]

<LocationMatch ^/wetty(.*)>
  DirectorySlash On
  Require all granted
  ProxyPassMatch http://127.0.0.1:3000
  ProxyPassReverse /wetty/
</LocationMatch>
```
