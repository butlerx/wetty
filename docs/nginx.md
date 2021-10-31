## Run WeTTY behind nginx

As said earlier you can use Nginx to add https to WeTTY.

**Note** that if your proxy is configured for https you should run WeTTY without
SSL

If you configure nginx to use a base path other than `/wetty`, then specify that
path with the `--base` flag, or the `BASE` environment variable.

The following confs assume you want to serve WeTTY on the url
`example.com/wetty` and are running WeTTY with the default base and serving it
on the same server

For a more detailed look see the
[nginx.conf](https://github.com/butlerx/wetty/blob/main/conf/nginx.template)
used for testing

Put the following configuration in your nginx conf:

```nginx
location ^~ /wetty {
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
```
