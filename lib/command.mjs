const localhost = host =>
  process.getuid() === 0 &&
  (host === 'localhost' || host === '0.0.0.0' || host === '127.0.0.1');

export default (
  { request: { headers }, client: { conn } },
  { user, host, port, auth }
) => ({
  args: localhost(host)
    ? ['login', '-h', conn.remoteAddress.split(':')[3]]
    : [
        'ssh',
        address(headers, user, host),
        '-p',
        port,
        '-o',
        `PreferredAuthentications=${auth}`,
      ],
  user:
    localhost(host) ||
    user !== '' ||
    user.includes('@') ||
    address(headers, user, host).includes('@'),
});

function address(headers, user, host) {
  const match = headers.referer.match('.+/ssh/.+$');
  const fallback = user ? `${user}@${host}` : host;
  return match ? `${match[0].split('/ssh/').pop()}@${host}` : fallback;
}
