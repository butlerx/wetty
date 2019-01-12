import { createInterface } from 'readline';

ask('Enter your username');

export default function ask(question: string): Promise<string> {
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
