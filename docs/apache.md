## Run WeTTY behind nginx or apache

As said earlier you can use a proxy to add https to WeTTY.

**Note** that if your proxy is configured for https you should run WeTTY without
SSL

If your proxy uses a base path other than `/wetty`, specify the path with the
`--base` flag, or the `BASE` environment variable.

The following confs assume you want to serve WeTTY on the url
`example.com/wetty` and are running WeTTY with the default base and serving it
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

## SAML2 integration to auth users

This conf is using apache2 (as for nginx, SAML2 integration is not available on
the community version, only pro).

Main idea is to propagate the SAML2 validated user identity into the
`remote-user` HTTP header. You need to have the user id returned within the
SAML2 NameID matching the username defined on the platform WeTTY is running.

E.g: You can ask the Idp to return a sAMAccountName within the SAML2Response
NameID, and provision beforehand those allowed users on the OS WeTTY is running
on.

### SAML2 Metadata generation

SAML2 metadata needs to be generated for this new service on the server and
exchanged with the Idp. We will use the script provided at
https://raw.githubusercontent.com/bitsensor/saml-proxy/master/mellon_create_metadata.sh

```
$ mellon_create_metadata.sh urn:https://foo.bar.tlz https://foo.bar.tld/mellon
```

Then we move the generated files over `/etc/apache2/saml2/foo.{xml,key,cert}`.

You need to put here additionaly the metadata from your SAML2 provider, named
here `idp.xml` and exchange you foo.xml with it.

### Apache2 conf

```apache
<VirtualHost *:443>
        ServerName foo.bar.tld
        ServerAdmin admin@bar.tld

        SSLEngine on
        SSLCertificateFile      /etc/apache2/ssl/foo.pem
        SSLCertificateKeyFile   /etc/apache2/ssl/foo.key

        RedirectMatch ^/$ /wetty/
        ProxyPass "/wetty" "http://127.0.0.1:3000/wetty"

        <Location / >
                AuthType Mellon
                MellonEnable info

                # this propagates to apache2 (and thus to access log) the proper user id, and not
                # the transiant nameid that is taken by default
                # it has no impact on the backend as we propagate identify via remote-user header there
                MellonUser "NameID"

                MellonEndpointPath /mellon/
                MellonSPMetadataFile /etc/apache2/saml2/foo.xml
                MellonSPPrivateKeyFile /etc/apache2/saml2/foo.key
                MellonSPCertFile /etc/apache2/saml2/foo.cert
                MellonIdPMetadataFile /etc/apache2/saml2/idp.xml

                # the identity propagated to WeTTY (as HTTP header 'remote-user: xxxxx')
                # is retrieved from SAMLResponse NameID attribute
                RequestHeader set remote-user %{MELLON_NAMEID}e
        </Location>

        <Location /wetty>
                AuthType Mellon
                MellonEnable auth
                Require valid-user
        </Location>

        # security hazard for switching between users, disabled if remote-user set as recent github commit
        # but not yet published via npm, so we put here a double security belt
        <Location /wetty/ssh/>
            Deny from all
        </Location>
</VirtualHost>
```

### Auto login

If you want to have a seamless login by trusting your IdP for authentication,
you can create password-less users on the WeTTY platform and have them trust an
SSH key used by the NodeJS, owned by the dedicated WeTTY OS user.

WeTTY instanciation with proper parameters, especially the SSH private key is
done via the following systemd service `/etc/systemd/system/wetty.service`:

```
[Unit]
Description=WeTTY Web Terminal
After=network.target

[Service]
User=wetty
Type=simple
WorkingDirectory=/home/wetty/.node_modules/wetty/
ExecStart=/usr/bin/node . -p 3000 --host 127.0.0.1 --ssh-key /home/wetty/.ssh/wetty --ssh-auth publickey --force-ssh --title "Foo bar terminal services"
TimeoutStopSec=20
KillMode=mixed
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```

For your new users to be automically trusting this SSH key when provisionning,
you may add the pubkey to `/etc/skel/.ssh/authorized_keys`.

### Security precautions

You probably don't want local users to impersonate each other, for that you need
to make sure that:

1. NodeJS is listenning only to localhost: provided by `wetty.service`
2. **Only** the apache2 process can join the WeTTY port. Else local users will
   be able to connect and forge a `remote-user` header: provided by
   `iptables -A OUTPUT -o lo -p tcp --dport 3000 -m owner \! --uid-owner www-data -j DROP`
3. Validate your WeTTY version does not allow access to `/wetty/ssh/` else again
   you will be able to impersonnate anyone: provided by either:
   1. WeTTY version 2.0.3 and beyond implements this by disabling this feature
      in case of `remote-user` presence
   2. apache2 conf as provided in previous section (containing the
      `<Location /wetty/ssh/>`)
