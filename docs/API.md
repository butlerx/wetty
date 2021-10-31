## WeTTY

Create WeTTY server

- [WeTTy](#module_WeTTy)
  - [start](#module_WeTTy..start) ⇒ `Promise`
  - [connection](#event_connection)
  - [spawn](#event_spawn)
  - [exit](#event_exit)
  - [disconnect](#event_disconnect)
  - [server](#event_server)

### WeTTy.start ⇒ `Promise`

Starts WeTTY Server

**Kind**: inner property of [`WeTTy`](#module_WeTTy)  
**Returns**: `Promise` - Promise resolves once server is running

| Param                     | Type      | Default       | Description                                                                                                            |
| :------------------------ | --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [ssh]                     | `Object`  |               | SSH settings                                                                                                           |
| [ssh.user]                | `string`  | `"''"`        | default user for ssh                                                                                                   |
| [ssh.host]                | `string`  | `"localhost"` | machine to ssh too                                                                                                     |
| [ssh.auth]                | `string`  | `"password"`  | authtype to use                                                                                                        |
| [ssh.port]                | `number`  | `22`          | port to connect to over ssh                                                                                            |
| [ssh.pass]                | `string`  |               | Optional param of a password to use for ssh                                                                            |
| [ssh.key]                 | `string`  |               | path to an optional client private key (connection will be password-less and insecure!)                                |
| [ssh.config]              | `string`  |               | Specifies an alternative ssh configuration file. For further details see "-F" option in ssh(1)                         |
| [serverConf]              | `Object`  |               | Server settings                                                                                                        |
| [serverConf.base]         | `Object`  | `'/wetty/'`   | Server settings                                                                                                        |
| [serverConf.port]         | `number`  | `3000`        | Port to run server on                                                                                                  |
| [serverConf.host]         | `string`  | `'0.0.0.0'`   | Host address for server                                                                                                |
| [serverConf.title]        | `string`  | `'WeTTY'`     | Title of the server                                                                                                    |
| [serverConf.bypasshelmet] | `boolean` | `false`       | if helmet should be disabled on the sever                                                                              |
| [command]                 | `string`  | `"''"`        | The command to execute. If running as root and no host specified this will be login if a host is specified will be ssh |
| [forcessh]                | `boolean` | `false`       | Connecting through ssh even if running as root                                                                         |
| [ssl]                     | `Object`  |               | SSL settings                                                                                                           |
| [ssl.key]                 | `string`  |               | Path to ssl key                                                                                                        |
| [ssl.cert]                | `string`  |               | Path to ssl cert                                                                                                       |

### "connection"

**Kind**: event emitted by [`WeTTy`](#module_WeTTy)  
**Properties**

| Name | Type     | Description                 |
| ---- | -------- | --------------------------- |
| msg  | `string` | Message for logs            |
| date | `Date`   | date and time of connection |

### "spawn"

Terminal process spawned

**Kind**: event emitted by [`WeTTy`](#module_WeTTy)  
**Properties**

| Name    | Type     | Description                            |
| ------- | -------- | -------------------------------------- |
| msg     | `string` | Message containing pid info and status |
| pid     | `number` | Pid of the terminal                    |
| address | `string` | address of connecting user             |

### "exit"

Terminal process exits

**Kind**: event emitted by [`WeTTy`](#module_WeTTy)  
**Properties**

| Name | Type     | Description                            |
| ---- | -------- | -------------------------------------- |
| code | `number` | the exit code                          |
| msg  | `string` | Message containing pid info and status |

### "disconnect"

**Kind**: event emitted by [`WeTTy`](#module_WeTTy)

### "server"

**Kind**: event emitted by [`WeTTy`](#module_WeTTy)  
**Properties**

| Name       | Type     | Description                     |
| ---------- | -------- | ------------------------------- |
| msg        | `string` | Message for logging             |
| port       | `number` | port sever is on                |
| connection | `string` | connection type for web traffic |
