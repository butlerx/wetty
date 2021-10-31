# Docs

![WeTTY](./terminal.png?raw=true)

- [AtoZ](./atoz.md)
- [Running as daemon](./service.md)
- [HTTPS Support](./https.md)
  - [Using NGINX](./nginx.md)
  - [Using Apache](./apache.md)
- [Automatic Login](./auto-login.md)
- [Downloading Files](./downloading-files.md)
- [Development Docs](./development.md)

## API

For WeTTY options and event details please refer to the [api docs](./API.md)

### Getting started

WeTTY is event driven. To Spawn a new server call `wetty.start()` with no
arguments.

```javascript
import { start } from 'wetty';

start(/* server settings, see Options */)
  .then((wetty) => {
    console.log('server running');
    wetty
      .on('exit', ({ code, msg }) => {
        console.log(`Exit with code: ${code} ${msg}`);
      })
      .on('spawn', (msg) => console.log(msg));
    /* code you want to execute */
  })
  .catch((err) => {
    console.error(err);
  });
```
