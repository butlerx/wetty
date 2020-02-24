# Docs

![WeTTy](./terminal.png?raw=true)

- [Running as daemon](./service.md)
- [HTTPS Support](./https.md)
  - [Using NGINX](./nginx.md)
  - [Using Apache](./apache.md)
- [Automatic Login](./auto-login.md)
- [Downloading Files](./downloading-files.md)
- [Development Docs](./development.md)

## API

For WeTTy options and event details please refer to the [api docs](./API.md)

### Getting started

WeTTy is event driven. To Spawn a new server call `wetty.start()` with no
arguments.

```javascript
const wetty = require('wetty.js');

wetty
  .on('exit', ({ code, msg }) => {
    console.log(`Exit with code: ${code} ${msg}`);
  })
  .on('spawn', msg => console.log(msg));
wetty.start(/* server settings, see Options */).then(() => {
  console.log('server running');
  /* code you want to execute */
});
```
