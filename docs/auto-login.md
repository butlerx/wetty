# Auto Login

WeTTY Supports a form of auto login by passing a users password though url
params.

This is not a required feature and the security implications for passing the
password in the url will have to be considered by the user.

## Requirements

For auto-login feature you'll need sshpass installed

- `apt-get install sshpass` (debian eg. Ubuntu)
- `yum install sshpass` (red hat flavours eg. CentOs)

## Usage

You can also pass the ssh password as an optional query parameter to auto-login
the user like this (Only while running WeTTY as a non root account or when
specifying the ssh host):

`http://yourserver:3000/wetty/ssh/<username>?pass=<password>`
