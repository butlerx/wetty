### Introduction

This is an A to Z guide that will help you get `wetty` up and running on Debian Stable. It covers the key configuration areas using copy and paste commands to help you install this application and get it securely up and running. It should also provide enough information to allow you to understand extend that configuration for your personal requirements.

### Required dependencies

You will need the package `build-essential` to be installed. We need this specifically for `node-gyp` to build packages when using `npm` or `yarn`.

As the `root` user run these commands:

~~~bash
apt update
apt install -y build-essential
~~~

If you do not have root access and just want to check the dependency is installed you can use this command:

~~~bash
dpkg -s build-essential | grep Status:
~~~

If the program is installed you will see this result:

~~~bash
Status: install ok installed
~~~

### Create a local user account

For this guide, unless specifically stated, you should not use a `root` account to install and run `wetty`. Please use an existing local account or create one. 

**Note:** Whichever user runs `wetty` should be the same user you wish to authenticate with via `ssh` to keep this simple.

If you need to create a local user account you can run this command: 

**Important note:** replace `username` with a user name of your choosing and create a password when prompted

~~~bash
adduser --gecos "" username
~~~

Switch to your local user now and open an `ssh` session to continue with this guide.

### Install node locally

To install and manage `node` as a local user we are going to use [Node Version Manager](https://github.com/nvm-sh/nvm) as an established solution to installing and managing multiple versions of node without needing `root` access. We are going to install the `lts` or long term support release of `node` to use with this application.

~~~bash
bash <(curl -s https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh) && source ~/.profile
nvm install --lts
~~~

You can now call `node` to check it works using this command. 

~~~bash
node -v
~~~

Your result should look something like this.

~~~bash
v12.16.2
~~~

**Note:** There is consideration with this method. `node` is only in the local user's path through sourcing of the `~/.nvm/nvm.sh` via the users `.bashrc` file. Unless this is done `node` will not be usable unless directly linked to and `nvm` commands will be unavailable. 

The way we over come this issue for the needs of this guide is by using this command where applicable:

~~~bash
source ~/.nvm/nvm.sh && nvm which 12
~~~

**Why?** This command will always provide us with the path to the most current version of `node 12` installed via `nvm` regardless of other versions of `node` installed.

### Generate openssl certificates.

**Why?** So that later we can configure `wetty` to work with `https` and make sure we interact with `wetty` over a secure connection at all times.

Make the required directory using this command:

~~~bash
mkdir -p ~/.ssl
~~~

Generate the self signed `openssl` certificates we will use to encrypt our web traffic when using `wetty` using this command:

**Note:** we are using`ecdsa` using the `secp521r1` curve.

~~~bash
openssl req -x509 -nodes -days 1095 -newkey ec:<(openssl ecparam -name secp521r1) -subj "/C=GB/ST=None/L=None/O=None/OU=None/CN=None" -out ~/.ssl/wetty.crt -keyout ~/.ssl/wetty.key
~~~

Now give these file and folders the correct permissions using these commands:

~~~bash
chmod 700 ~/.ssl
chmod 644 ~/.ssl/wetty.crt 
chmod 600 ~/.ssl/wetty.key
~~~

This is all we need to do for now in regards to https.

### Generate the ssh key file

**Why?** So that later we can set up automatic login via `ssh`. Our instance will authorise using this key file stored locally. 

Make the required directory, if it does not exist, using this command:

~~~bash
mkdir -p ~/.ssh
~~~

Create the `ssh` private key using `ed25519` that we need to authorise our local connection, using this command:

~~~bash
ssh-keygen -q -C "wetty-keyfile" -t ed25519 -N '' -f ~/.ssh/wetty 2>/dev/null <<< y >/dev/null
~~~

**Important Note:** You must add the public key to your `authorized_keys` file in order to be able to log in using your `ssh` key file when accessing `wetty` via a web browser.

Copy the key to our `~/.ssh/authorized_keys` file, using this command:

~~~bash
cat ~/.ssh/wetty.pub >> ~/.ssh/authorized_keys
~~~

Now give these  file the correct permissions, using these commands:

~~~bash
chmod 700 ~/.ssh
chmod 644 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/wetty
~~~

**Optional:** A housekeeping command. If you need to remove all entries of the `wetty` public key with the comment `wetty-keyfile` from the `~/.ssh/authorized_keys` file use this command. Otherwise ignore this.

~~~bash
sed -r '/^ssh-ed25519(.*)wetty-keyfile$/d' -i ~/.ssh/authorized_keys
~~~

### Install wetty

**Note:** we are using `-g` for `npm` or `global` for `yarn` along with `--prefix ~/` so that the application symbolic link is installed to our `~/bin` directory and available in our local user's `PATH`.

As your local use run these commands to install `wetty` and `forever`. We will need `forever` later to run wetty in in the background.

First, we need to make sure the local user `~/bin` folder exists and is in the `PATH` for the following commands to work.

~~~bash
mkdir -p ~/bin && source ~/.profile
~~~

Please use either the `npm` or `yarn` method and not both. The `yarn` method is recommended but I provide both as you may have a personal preference. The outcome is effectively the same.

`npm `  - optional - use `npm` to install wetty

~~~bash
npm install -g wetty forever --prefix ~/
~~~

`yarn` -  recommended - use `yarn` to install wetty

~~~bash
npm install -g yarn --prefix ~/
yarn global add wetty forever --prefix ~/
~~~

Once successfully installed the application should be available in your local user's `PATH`. To test the installation was successful please use this command:

~~~bash
wetty -h
~~~

### Accessing the web interface.

This needs to be clarified here because it is not easy to do in the next steps if `wetty` is running in the terminal.

This command will generate the correct URL you need to visit after using the start up commands in the following section.

~~~bash
echo https://$(curl -s4 icanhazip.com):3000
~~~

*Please make make a note of this URL now.*

### Running wetty

Now we have all the ground work done we can focus on our `wetty` server configuration settings.

For example, the below command would provide a `https` instance with automatic `ssh` authorisation using our `wetty` private key on port `3000` accessible at `https://IP:3000` . Refer to the previous URL generation command.

**Important note:** This command will run in your current terminal session and not in the background.

~~~bash
wetty --host 0.0.0.0 -p 3000 --title wetty --base / --sshkey ~/.ssh/wetty --sshhost localhost --sshuser $(whoami) --sshport 22 --sshauth publickey --sslkey ~/.ssl/wetty.key --sslcert ~/.ssl/wetty.crt
~~~

#### forever to manage wetty

Now you can use `forever` we installed to run `wetty` in the background instead of directly in your terminal

~~~bash
forever start ~/bin/wetty --host 0.0.0.0 -p 3000 --title wetty --base / --sshkey ~/.ssh/wetty --sshhost localhost --sshuser $(whoami) --sshport 22 --sshauth publickey --sslkey ~/.ssl/wetty.key --sslcert ~/.ssl/wetty.crt
~~~

To stop `wetty` from running you can use this command

~~~bash
forever stop ~/bin/wetty
~~~

#### Optional - config file.

**Important Note:** This is an optional and unsupported method to load settings from a physical configuration file. It's a hack and you need to accept it has some limitations but I've made it as easy as I can to use.

Since `wetty` does not have configurations files and all commands are passed as command line arguments we can fake this behaviour by using a method to read from a text file and expand variables then pass this to `wetty`. All arguments must be on a single line

Create a directory to store our configuration data using this command:

~~~bash
mkdir -p ~/.config/wetty
~~~

Now populate our `config` file with some settings. This examples is the same command as above.

~~~bash
echo -n '--host 0.0.0.0 -p 3000 --title wetty --base / --sshkey ~/.ssh/wetty --sshhost localhost --sshuser $(whoami) --sshport 22 --sshauth publickey --sslkey ~/.ssl/wetty.key --sslcert ~/.ssl/wetty.crt' > ~/.config/wetty/config
~~~

This configuration file is now available here for you to manage your settings.

~~~bash
~/.config/wetty/config
~~~

Now we can load this file as part of the command we pass to `wetty` with shell expansion and command substitution.

~~~bash
wetty $(eval echo $(cat ~/.config/wetty/config))
~~~

#### forever using a config file

Now you can use `forever` to run it in the background instead of directly in your terminal

~~~bash
forever start ~/bin/wetty $(eval echo $(cat ~/.config/wetty/config))
~~~

To stop `wetty` from running you can use this command

~~~bash
forever stop ~/bin/wetty
~~~

#### Environment settings explained

Let's break it down so that we can understand what's being done and why.

~~~bash
--host 0.0.0.0 -p 3000 --title wetty --base /
~~~

`--host 0.0.0.0` - defines the interface we want to bind to. Using `0.0.0.0` means that we bind to all available interfaces so using this setting just works. When we use nginx we can change this to `--host 127.0.0.1` in order to prevent generic port access to the application and force traffic through our nginx reverse proxy URL.

`-p 3000` - defines the local listening port. You will use this port to connect via the remotely accessible web server or when configuring a reverse proxy through nginx.

`--title wetty` - an optional setting to set the window title for this `wetty` session.

`--base /` - changes the default base URL setting from `/wetty/` to define the remote URL. We use `--base /` to make `wetty` accessible on the URL format `https://IP:3000` instead of `https://IP:3000/wetty` but we would change this back if we use nginx to reverse proxy the application.

#### SSH settings explained

These settings are all specific to `ssh` and will enable you to automatically log into you ssh session for the selected user.

~~~bash
--sshkey ~/.ssh/wetty --sshhost localhost --sshuser $(whoami) --sshport 22 --sshauth publickey
~~~

`--sshkey ~/.ssh/wetty` - we are telling `wetty` to load our `ssh` key file that we generated earlier.

`--sshhost localhost` - optional setting telling `wetty` to connect the host `localhost`

`--sshuser $(whomai)` - defines our `ssh` username. In this case via the command substitution of `whoami` which will not require your input of a username.

`--sshport 22` - optional setting to set the `ssh` port we need to connect to.

`--sshauth publickey` defines the accepted authentication types. You do not have to use the key file and you can instead require a password but setting this to `--sshauth password`. You can specify both `--sshauth publickey,password`

#### SSL settings explained

These settings are specific to `openssl` to make `wetty` load https webserver so that all data is transmitted over a secure connection.

~~~bash
--sslkey ~/.ssl/wetty.key --sslcert ~/.ssl/wetty.crt
~~~

`--sslkey ~/.ssl/wetty.key` - tells `wetty` to load our `openssl` generated key file.

`--sslcert ~/.ssl/wetty.crt` -  tells `wetty` to load our `openssl` generates certificate file.

### Systemd service settings

We will use a local user `systemd` service file to manage the `wetty` service.

First, create the required directory, if it does not exist.

~~~bash
mkdir -p ~/.config/systemd/user
~~~

#### Systemd service.

Here is a normal service file template with hardcoded values you can insert into the `wetty.service` file.

Use `nano` to open the file for editing.

~~~
nano ~/.config/systemd/user/wetty.service
~~~

The copy and paste this code.

~~~bash
[Unit]
Description=wetty
After=network.target

[Service]
Type=simple
WorkingDirectory=%h
ExecStart=/bin/bash -c "$$(source /home/$$(whoami)/.nvm/nvm.sh && nvm which 12) /home/$$(whoami)/bin/wetty --host 0.0.0.0 -p 3000 --title wetty --base / --sshkey /home/$$(whoami)/.ssh/wetty --sshhost localhost --sshuser $$(whoami) --sshport 22 --sshauth publickey --sslkey /home/$$(whoami)/.ssl/wetty.key --sslcert /home/$$(whoami)/.ssl/wetty.crt"
TimeoutStopSec=20
KillMode=mixed
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
~~~

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and exit `nano`.

#### Optional - Systemd service with config file

Here is the example using our pseudo configuration file. All modifications to the start up of `wetty` will be done by editing the `~/.config/Wetty/config` file and then reloading the ` wetty.service`. 

Use `nano` to open the file for editing.

~~~bash
nano ~/.config/systemd/user/wetty.service
~~~

The copy and paste this code.

~~~bash
[Unit]
Description=wetty
After=network.target

[Service]
Type=simple
WorkingDirectory=%h
ExecStart=/bin/bash -c "$$(source /home/$$(whoami)/.nvm/nvm.sh && nvm which 12) /home/$$(whoami)/bin/wetty $$(eval echo $(cat /home/$$(whoami)/.config/wetty/config))"
TimeoutStopSec=20
KillMode=mixed
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
~~~

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and exit `nano`.

#### Activating your service

The you can enable and start your service.

~~~bash
systemctl --user enable --now wetty
~~~

#### Managing your services

These commands will help you manage your service.

~~~bash
systemctl --user daemon-reload
systemctl --user status wetty
systemctl --user start wetty
systemctl --user stop wetty
systemctl --user restart wetty
systemctl --user disable --now wetty
systemctl --user enable --now wetty
~~~

### Nginx reverse proxy

If you want to use nginx as a revers proxy here is the configuration file you can use.

Please modify these specific environment settings:

**Why?** This will disable generic port access to the application and force traffic via the nginx reverse proxy. 

~~~bash
--host 127.0.0.1
~~~

**Why?** This change is so that our application does not attempt to load as the web root of `/` for nginx.

~~~bash
--base /wetty
~~~

Now you can use this nginx configuration file.

**Note:** we are using `https` here `https://127.0.0.1:3000/wetty;` because we configured `wetty` to run via `https`

The copy and paste this into the `https` server block of your enable server configuration file.

~~~nginx
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
~~~

Press `ctrl` + `x` and then press `y` to save then press `enter` to confirm and exit `nano`

Now you would need to reload nginx service using this command:

~~~bash
systemctl restart nginx
~~~

#### Accessing the web interface via nginx

Visit the URL format `https://YourIP/wetty` and you can access `wetty`. This command will generate the correct URL you need to visit.

~~~bash
echo https://$(curl -s4 icanhazip.com)/wetty
~~~

### Configuration  reference

`wetty -h` configuration options for reference.

~~~bash
  --help, -h      Print help message                                   [boolean]
  --version       Show version number                                  [boolean]
  --sslkey        path to SSL key                                       [string]
  --sslcert       path to SSL certificate                               [string]
  --sshhost       ssh server host                [string] [default: "localhost"]
  --sshport       ssh server port                         [number] [default: 22]
  --sshuser       ssh user                                [string] [default: ""]
  --title         window title [string] [default: "WeTTy - The Web Terminal Emulator"]
  --sshauth       defaults to "password", you can use "publickey,password" instead[string] [default: "password"]
  --sshpass       ssh password                                          [string]
  --sshkey        path to an optional client private key (connection will be password-less and insecure!) [string]
  --forcessh      Connecting through ssh even if running as root [boolean] [default: false]
  --base, -b      base path to wetty               [string] [default: "/wetty/"]
  --port, -p      wetty listen port                     [number] [default: 3000]
  --host          wetty listen host                [string] [default: "0.0.0.0"]
  --command, -c   command to run in shell            [string] [default: "login"]
  --bypasshelmet  disable helmet from placing security restrictions [boolean] [default: false]
~~~
