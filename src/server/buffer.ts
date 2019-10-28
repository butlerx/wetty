import { createInterface } from 'readline';

ask('Enter your username');

function ask(question: string): Promise<string> {
  const r = createInterface({
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
