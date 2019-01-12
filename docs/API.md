<a name="module_WeTTy"></a>

## WeTTy

Create WeTTY server

* [WeTTy](#module_WeTTy)
  * [~start](#module_WeTTy..start) ⇒ <code>Promise</code>
  * ["connection"](#event_connection)
  * ["spawn"](#event_spawn)
  * ["exit"](#event_exit)
  * ["disconnect"](#event_disconnect)
  * ["server"](#event_server)

<a name="module_WeTTy..start"></a>

### WeTTy~start ⇒ <code>Promise</code>

Starts WeTTy Server

**Kind**: inner property of [<code>WeTTy</code>](#module_WeTTy)  
**Returns**: <code>Promise</code> - Promise resolves once server is running

| Param        | Type                | Default                               | Description                 |
| ------------ | ------------------- | ------------------------------------- | --------------------------- |
| [ssh]        | <code>Object</code> |                                       | SSH settings                |
| [ssh.user]   | <code>string</code> | <code>&quot;&#x27;&#x27;&quot;</code> | default user for ssh        |
| [ssh.host]   | <code>string</code> | <code>&quot;localhost&quot;</code>    | machine to ssh too          |
| [ssh.auth]   | <code>string</code> | <code>&quot;password&quot;</code>     | authtype to use             |
| [ssh.port]   | <code>number</code> | <code>22</code>                       | port to connect to over ssh |
| [serverPort] | <code>number</code> | <code>3000</code>                     | Port to run server on       |
| [ssl]        | <code>Object</code> |                                       | SSL settings                |
| [ssl.key]    | <code>string</code> |                                       | Path to ssl key             |
| [ssl.cert]   | <code>string</code> |                                       | Path to ssl cert            |

<a name="event_connection"></a>

### "connection"

**Kind**: event emitted by [<code>WeTTy</code>](#module_WeTTy)  
**Properties**

| Name | Type                | Description                 |
| ---- | ------------------- | --------------------------- |
| msg  | <code>string</code> | Message for logs            |
| date | <code>Date</code>   | date and time of connection |

<a name="event_spawn"></a>

### "spawn"

Terminal process spawned

**Kind**: event emitted by [<code>WeTTy</code>](#module_WeTTy)  
**Properties**

| Name    | Type                | Description                            |
| ------- | ------------------- | -------------------------------------- |
| msg     | <code>string</code> | Message containing pid info and status |
| pid     | <code>number</code> | Pid of the terminal                    |
| address | <code>string</code> | address of connecting user             |

<a name="event_exit"></a>

### "exit"

Terminal process exits

**Kind**: event emitted by [<code>WeTTy</code>](#module_WeTTy)  
**Properties**

| Name | Type                | Description                            |
| ---- | ------------------- | -------------------------------------- |
| code | <code>number</code> | the exit code                          |
| msg  | <code>string</code> | Message containing pid info and status |

<a name="event_disconnect"></a>

### "disconnect"

**Kind**: event emitted by [<code>WeTTy</code>](#module_WeTTy)  
<a name="event_server"></a>

### "server"

**Kind**: event emitted by [<code>WeTTy</code>](#module_WeTTy)  
**Properties**

| Name       | Type                | Description                     |
| ---------- | ------------------- | ------------------------------- |
| msg        | <code>string</code> | Message for logging             |
| port       | <code>number</code> | port sever is on                |
| connection | <code>string</code> | connection type for web traffic |
