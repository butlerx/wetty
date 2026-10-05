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

WeTTY is event driven. Configure at least one trusted browser origin before
starting a server: set `ALLOWEDORIGINS` before importing WeTTY, or pass
`serverConf.allowedOrigins` to `start()` (see [API options](./API.md)).

For the example below, save the program as `app.js` and run:

```sh
ALLOWEDORIGINS=http://localhost:3000 node app.js
```

```javascript
import { start } from 'wetty';

start()
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
