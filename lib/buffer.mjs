import rl from 'readline';

ask('Enter your username');

export default function ask(question) {
  const r = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    r.question(`${question}: `, answer => {
      r.close();
      resolve(answer);
    });
  });
}
