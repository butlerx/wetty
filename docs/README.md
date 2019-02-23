# Docs

## Getting started

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

## API

For WeTTy options and event details please refer to the [api docs](./API.md)
