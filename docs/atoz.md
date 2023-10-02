# Introduction

This is an A to Z guide that will help you get WeTTY up and running on a Debian
based system. It covers the key configuration areas by using copy and paste
commands. This will help you install this application and get it securely up and
running with minimal system interference and reversible changes. It should also
provide enough information to allow you to understand and extend that
configuration for your personal requirements.

**Note:** Some of these configurations are optional, such as self signed SSL and
public key authentication. The purpose of the guide is to show you how to
correctly understand, configure, install and use these options should you wish
to use them but they are not required to use WeTTY in general.

## Required dependencies

`Node` - WeTTY requires node v20 or greater. We will install this locally for a
non root user later in the guide.

`python` - This should be installed by default but we will include it in our
`apt-get` command to be safe.

`build-essential` - We need this specifically for `node-gyp` to build packages
when using `npm` to install packages.

As the `root` or `sudo` user run these commands:

```bash
sudo apt update
sudo apt install -y build-essential curl python
```

If you have no root access and just want to check the dependencies are installed
you can use these commands:

```bash
dpkg -s python | grep Status:
dpkg -s build-essential | grep Status:
```

If the package is installed you will see this result:

```bash
Status: install ok installed
```

## Create a local user account

For this guide, unless specifically stated, you should not use a `root` account
to install and run WeTTY. Please use an existing local account or create one
now.

**Note:** Whichever user runs WeTTY should be the same user you wish to
authenticate with via `ssh` to keep this guide simple.

If you need to create a local user account you can run this command:

**Important note:** replace `username` with a user name of your choosing and
create a password when prompted

```bash
adduser --gecos "" username
```

Switch to your local user now and open an `ssh` session to continue with this
guide.

## Install node locally

To install and manage `node` as a local user we are going to use
[Node Version Manager](https://github.com/nvm-sh/nvm). This is an established
solution for installing and managing multiple versions of node without needing
`root` access. This will allow you to install and use multiple versions of
`node` at the same time.

This command will download and install `nvm` and reload our shell.

```bash
curl -sL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash && source ~/.profile
```

This command will install the latest version of the v20 branch, which is the
minimum required version for WeTTY.

```bash
nvm install 20
```

You can now call `node` to check it works using this command.

```bash
node -v
```

Your result should look something like this.

```bash
v20.2.0
```

**Note:** There is an important consideration with the `nvm` method. `node` is
only in the local user's path through sourcing of the `~/.nvm/nvm.sh` which is
done when the user logs in and the shell sources the user's `.bashrc` file. So
for some applications who are not aware of this local shell environment `node`
will not be usable unless we provide a full path and `nvm` commands will also be
unavailable. The way we over come this issue for the needs of this guide is by
using this command substitution to provide the full path, where applicable:

```bash
$(source ~/.nvm/nvm.sh && nvm which 20)
```

**Why?** This command will always provide us with the path to the most current
version of `node 20` installed via `nvm` regardless of other versions of `node`
installed with `nvm`.

## Generate OpenSSL certificates

**Why?** So that later we can configure WeTTY to work with `https` and make sure
we interact with WeTTY over a secure connection at all times.

Make the required directory using this command:

```bash
mkdir -p ~/.ssl
```

Generate the self signed `openssl` certificates we will use to encrypt our web
traffic when using WeTTY using this command:

**Note:** we are using `ecdsa` using the `secp384r1` curve. Tested to be
compatible with Chrome and Firefox browsers.

```bash
openssl req -x509 -nodes -days 1095 -newkey ec:<(openssl ecparam -name secp384r1) -subj "/C=GB/ST=None/L=None/O=None/OU=None/CN=None" -out ~/.ssl/wetty.crt -keyout ~/.ssl/wetty.key
```

Now give these file and folders the correct permissions using these commands:

```bash
chmod 700 ~/.ssl
chmod 644 ~/.ssl/wetty.crt
chmod 600 ~/.ssl/wetty.key
```

This is all we need to do for now in regards to https.

## Generate the ssh key file

**Why?** So that later we can set up automatic login via `ssh`. Our instance
will authorise using this key file stored locally.

Make the required directory, if it does not exist, using this command:

```bash
mkdir -p ~/.ssh
```

Create the `ssh` private key using `ed25519` that we need to authorise our local
connection, using this command:

```bash
ssh-keygen -q -C "wetty-keyfile" -t ed25519 -N '' -f ~/.ssh/wetty 2>/dev/null <<< y >/dev/null
```

**Important Note:** You must add the public key to your `authorized_keys` file
in order to be able to log in using your `ssh` key file when accessing WeTTY via
a web browser.

Copy the key to our `~/.ssh/authorized_keys` file, using this command:

```bash
cat ~/.ssh/wetty.pub >> ~/.ssh/authorized_keys
```

Now give these file and folders the correct permissions, using these commands:

```bash
chmod 700 ~/.ssh
chmod 644 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/wetty
```

**Optional:** A housekeeping command. If you need to remove all entries of the
WeTTY public key with the comment `wetty-keyfile` from the
`~/.ssh/authorized_keys` file use this command. Otherwise ignore this.

```bash
sed -r '/^ssh-ed25519(.*)wetty-keyfile$/d' -i ~/.ssh/authorized_keys
```

## Install WeTTY

**Note:** we are using `-g` for `npm` along with `--prefix ~/` so that the
application's symbolic link is installed to our `~/bin` directory and available
in our local user's `PATH`.

As your local user run these commands:

To make sure the local user's `~/bin` directory exists and is in the `PATH`
please run the following command.

```bash
mkdir -p ~/bin && source ~/.profile
```

Then use `npm` to install `wetty`.

```bash
npm -g i wetty --prefix ~/
```

Once successfully installed the application should be available in your local
user's `PATH`. To test the installation was successful please use this command:

```bash
wetty -h
```

## Accessing the web interface via our external IP

If you are using your external IP and not a domain to access WeTTY this step
needs to be done here because it is not easy to do in the next steps if WeTTY is
running in the terminal.

This command will generate the correct URL you need to visit after using the
start up commands in the following section.

```bash
echo https://$(curl -s4 icanhazip.com):3000
```

_Please make a note of this URL now._

## Running WeTTY

Now we have all the ground work done we can focus on our WeTTY server
configuration settings.

For example, the below command would provide a `https` instance with automatic
`ssh` authorisation using our `wetty` private key on port `3000` accessible at
`https://IP:3000` .

**Important note:** This command will run in your current terminal session and
not in the background. The key combination of `CTRL` + `c` will exit the
application.

```bash
wetty --host 0.0.0.0 --port 3000 --title wetty --base / --ssh-key ~/.ssh/wetty --ssh-host localhost --ssh-user $(whoami) --ssh-port 22 --ssh-auth publickey --ssl-key ~/.ssl/wetty.key --ssl-cert ~/.ssl/wetty.crt
```

Since you may not need all these settings we will look through what each one
does below so that you can decide how to best configure your instance.

### Environment settings explained

Let's break it down so that we can understand what's being done and why.

```bash
--host 0.0.0.0 --port 3000 --title wetty --base /
```

`--host 0.0.0.0` - defines the interface we want to bind to. Using `0.0.0.0`
means that we bind to all available interfaces so using this setting just works.
When we use nginx we can change this to `--host 127.0.0.1` in order to prevent
generic port access to the application and force traffic through our nginx
reverse proxy URL.

`--port 3000` - defines the local listening port. You will use this port to
connect via the remotely accessible web server or when configuring a reverse
proxy through nginx.

`--title wetty` - an optional setting to set the window title for this `wetty`
session.

`--base /` - changes the default base URL setting from `/wetty/` to define the
remote URL. We use `--base /` to make `wetty` accessible on the URL format
`https://IP:3000` instead of `https://IP:3000/wetty` but we would change this
back if we use nginx to reverse proxy the application.

### SSH settings explained

These settings are all specific to `ssh` and will enable you to automatically
log into you `ssh` session for the selected user.

```bash
--ssh-key ~/.ssh/wetty --ssh-host localhost --ssh-user $(whoami) --ssh-port 22 --ssh-auth publickey
```

`--ssh-key ~/.ssh/wetty` - we are telling WeTTY to load our `ssh` key file that
we generated earlier.

`--ssh-host localhost` - optional setting telling WeTTY to connect the host
`localhost`

`--ssh-user $(whoami)` - defines our `ssh` username. In this case via the
command substitution of `whoami` which will not require your input of a
username.

`--ssh-port 22` - optional setting to set the `ssh` port we need to connect to.

`--ssh-auth publickey` defines the accepted authentication types. You do not
have to use the key file and you can instead require a password but setting this
to `--sshauth password`. You can specify both `--sshauth publickey,password`

`--ssh-config configfile` - (not used for this guide) alternative ssh
configuration file. From ssh(1):

> If a configuration file is given on the command line, the system-wide
> configuration file (/etc/ssh/ssh_config) will be ignored. The default for the
> per-user configuration file is ~/.ssh/config.

### SSL settings explained

These settings are specific to `openssl` to make WeTTY load https webserver so
that all data is transmitted over a secure connection.

```bash
--ssl-key ~/.ssl/wetty.key --ssl-cert ~/.ssl/wetty.crt
```

`--ssl-key ~/.ssl/wetty.key` - tells WeTTY to load our `openssl` generated key
file.

`--ssl-cert ~/.ssl/wetty.crt` - tells WeTTY to load our `openssl` generates
certificate file.

### Optional - load settings via a configuration file

As of WeTTY v2 there is official support for a configuration file used with the
flag `--conf` to specify the location of this file.

Create the directory where we will store this configuration file.

```bash
mkdir -p ~/.config/wetty
```

Use `nano` to open a file for editing.

```bash
nano ~/.config/wetty/config.json
```

Here is the template `config.json` you need to use.

**Note:** To be [validated json](https://codebeautify.org/jsonvalidator) the
below json example should have the `// ...` comments removed. With all comments
removed the example is valid json. They are in the example to help explain the
options and won't stop WeTTY from loading if you leave them in place. Lines you
do not need can be commented out but should be removed if you want the json to
pass validation.

```json
  "ssh": {
        "user": "username", // default user to use when ssh-ing
        "host": "localhost", // Server to ssh to
        "auth": "publickey,password", // shh authentication, method. Defaults to "password", you can use "publickey,password" instead'
        "pass": "password", // Password to use when ssh-ing
        "key": "/home/username/.ssh/wetty", // path to an optional client private key, connection will be password-less and insecure!
        "port": 22, // Port to ssh to
        "knownHosts": "/dev/null" // ssh knownHosts file to use
    },
    "server": {
        "base": "/wetty/", // URL base to serve resources from
        "port": 3000, // Port to listen on
        "host": "0.0.0.0", // listen on all interfaces or can be 127.0.0.1 with nginx
        "title": "WeTTY - The Web Terminal Emulator", // Page title
        "bypassHelmet": false // Disable Helmet security checks
    },
    "forceSSH": false, // Force sshing to local machine over login if running as root
    "command": "login", // Command to run on server. Login will use ssh if connecting to different server
    "ssl": {
        "key": "/home/username/.ssl/wetty.key",
        "cert": "/home/username/.ssl/wetty.crt"
    }
}
```

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and
exit `nano`.

## System Environment Variables

**Note:** We will not be using this section to configure WeTTY. We are simply
documenting it.

There are some environment variables you can export that can be used by WeTTY to
configure an instance.

```bash
BASE
PORT
TITLE
SSHUSER
SSHHOST
SSHAUTH
SSHPASS
SSHKEY
SSHPORT
KNOWNHOSTS
FORCESSH
COMMAND
ALLOWIFRAME
```

These can be used in the following way

```bash
export PORT=3000
```

There are currently no environment settings for variables not listed above.

## Systemd service settings

We will use a local user `systemd` service file to manage the `wetty` service.

First, create the required directory, if it does not exist.

```bash
mkdir -p ~/.config/systemd/user
```

### Systemd service

Here is an example template of how to use service file with hardcoded values you
can set in the `wetty.service` file with all options enabled.

Use `nano` to open a file for editing.

```bash
nano ~/.config/systemd/user/wetty.service
```

Then copy and paste this code.

**Note:** This is an example service file based on all the options documented
and configured so far. You may not want all these option enabled so please
remove or modify the `ExecStart` command based on your needs.

```bash
[Unit]
Description=WeTTY
After=network-online.target

[Service]
Type=simple
ExecStart=/bin/bash -c "$$(source /home/$$(whoami)/.nvm/nvm.sh && nvm which 12) /home/$$(whoami)/bin/wetty --host 0.0.0.0 -p 3000 --title wetty --base / --ssh-key /home/$$(whoami)/.ssh/wetty --ssh-host localhost --ssh-user $$(whoami) --ssh-port 22 --ssh-auth publickey --ssl-key /home/$$(whoami)/.ssl/wetty.key --ssl-cert /home/$$(whoami)/.ssl/wetty.crt"
Restart=always
RestartSec=2
TimeoutStopSec=5
SyslogIdentifier=wetty

[Install]
WantedBy=default.target
```

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and
exit `nano`.

### Optional - Systemd service with config file

Here is the example using our pseudo configuration file. All modifications to
the start up of `wetty` will be done by editing the `~/.config/Wetty/config`
file and then reloading the `wetty.service`.

Use `nano` to open the file for editing.

```bash
nano ~/.config/systemd/user/wetty.service
```

Then copy and paste this code.

**Note:** This `ExecStart` assumes the location of your `config.json` to be
`~/.config/wetty/config.json`. Please make sure you use the correct location for
this file.

```bash
[Unit]
Description=WeTTY
After=network-online.target

[Service]
Type=simple
ExecStart=/bin/bash -c "$$(source /home/$$(whoami)/.nvm/nvm.sh && nvm which 20) /home/$$(whoami)/bin/wetty --conf /home/$$(whoami)/.config/wetty/config.json"
Restart=always
RestartSec=2
TimeoutStopSec=5
SyslogIdentifier=wetty

[Install]
WantedBy=default.target
```

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and
exit `nano`.

### Activating your service

Then you can enable and start your service.

```bash
systemctl --user enable --now wetty
```

### Managing your services

These commands will help you manage your service.

```bash
systemctl --user daemon-reload
systemctl --user status wetty
systemctl --user start wetty
systemctl --user stop wetty
systemctl --user restart wetty
systemctl --user disable --now wetty
systemctl --user enable --now wetty
```

## Nginx reverse proxy

If you want to use nginx as a reverse proxy here is the configuration file you
can use.

Please modify these specific environment settings:

**Why?** This will disable generic port access to the application and force
traffic via the nginx reverse proxy.

```bash
--host 127.0.0.1
```

**Why?** This change is so that our application does not attempt to load as the
web root of `/` for nginx.

```bash
--base /wetty/
```

Now you can use this nginx configuration file.

**Note:** we are using `https` with `https://127.0.0.1:3000/wetty;` because we
configured `wetty` to run via `https` using our self signed ssl certificates. If
you chose not to run WeTTY with a self signed certificate you should changes
this to `http://127.0.0.1:3000/wetty;`

Then copy and paste this into the `https` server block of your enable server
configuration file.

```nginx
location /wetty {
    proxy_pass https://127.0.0.1:3000/wetty;
    #
    proxy_pass_request_headers on;
    #
    proxy_set_header Host $host;
    #
    proxy_http_version 1.1;
    #
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Protocol $scheme;
    proxy_set_header X-Forwarded-Host $http_host;
    proxy_set_header X-NginX-Proxy true;
    #
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_read_timeout 43200000;
    proxy_set_header X-Forwarded-Ssl on;
    #
    proxy_redirect off;
    proxy_buffering off;
}
```

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and
exit `nano`

Now you would need to reload nginx service using this command:

```bash
systemctl restart nginx
```

### Accessing the web interface via nginx

Visit the URL format `https://YourIPorDomain/wetty` and you can access WeTTY.

This command will generate the correct URL you need to visit it you are not
using a domain.

```bash
echo https://$(curl -s4 icanhazip.com)/wetty
```

## Protecting your instance of WeTTY

**Disclaimer:** It is not recommended by this guide that you run an instance of
WeTTY on your server with no access control in place.

If you chose to not use a password to login in you should protect your instance
behind either:

1:
[Nginx basic auth](https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/)

2: [Authelia](https://github.com/authelia/authelia)

## Configuration reference

`wetty -h` configuration options for reference.

```bash
  --help, -h      Print help message                                   [boolean]
  --version       Show version number                                  [boolean]
  --conf          config file to load config from                       [string]
  --ssl-key       path to SSL key                                       [string]
  --ssl-cert      path to SSL certificate                               [string]
  --ssh-host      ssh server host                                       [string]   [default: "localhost"]
  --ssh-port      ssh server port                                       [number]   [default: 22]
  --ssh-user      ssh user                                              [string]   [default: ""]
  --title         window title                                          [string]   [default: "WeTTY - The Web Terminal Emulator"]
  --ssh-auth      defaults to "password", you can use "publickey,password"
                  instead                                               [string]   [default: "password"]
  --ssh-pass      ssh password                                          [string]
  --ssh-key       path to an optional client private key (connection will be
                  password-less and insecure!)                          [string]
  --ssh-config    Specifies an alternative ssh configuration file. For further
                  details see "-F" option in ssh(1)                     [string]   [default: ""]
  --force-ssh     Connecting through ssh even if running as root        [boolean]  [default: false]
  --known-hosts   path to known hosts file                              [string]
  --base, -b      base path to wetty                                    [string]   [default: "/wetty/"]
  --port, -p      wetty listen port                                     [number]   [default: 3000]
  --host          wetty listen host                                     [string]   [default: "0.0.0.0"]
  --command, -c   command to run in shell                               [string]   [default: "login"]
  --allow-iframe  Allow wetty to be embedded in an iframe, defaults to allowing
                  same origin                                           [boolean]  [default: false]
```

## Updating WeTTY

```bash
npm -g update wetty --prefix ~/
```

To update or downgrade to a specific version you use this command:

```bash
npm -g i wetty@2.7.0 --prefix ~/
```

Now restart your `wetty` service.

## Updating nvm

The proper way to update NVM is to use git. The `.nvm` directory is a git repo.

These commands will update NVM to the latest version of the script and load it
to your shell.

```bash
cd ~/.nvm
git fetch --tags
git checkout $(git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1))
source ~/.nvm/nvm.sh
```

## Updating node

You can use the same command you used to install it with `nvm`

```bash
nvm install 20
```
