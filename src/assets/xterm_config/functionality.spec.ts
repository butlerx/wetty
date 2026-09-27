import 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const indexHtml = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const functionality = readFileSync(
  new URL('./functionality.js', import.meta.url),
  'utf8',
);

function createOptionsDocument(messages: unknown[]): JSDOM {
  const html = indexHtml
    .replaceAll(/\s*<script src="[^"]+"><\/script>/g, '')
    .replace(
      '</body>',
      `<script>
${functionality}
inflateOptions([
  {
    type: 'boolean',
    name: 'Test option',
    description: 'Test description',
    path: ['xterm', 'testOption'],
  },
]);
</script>
</body>`,
    );

  return new JSDOM(html, {
    runScripts: 'dangerously',
    beforeParse(window) {
      window.alert = () => undefined;
      window.postMessage = ((message: unknown) => {
        messages.push(message);
      }) as typeof window.postMessage;
    },
  });
}

describe('xterm configuration options', () => {
  it('saves the first input change', () => {
    const messages: unknown[] = [];
    const dom = createOptionsDocument(messages);
    const input = dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );

    expect(input).not.to.equal(null);
    if (input == null) throw new Error('Test option was not rendered');

    input.checked = true;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(messages).to.have.length(1);
    expect(JSON.parse(JSON.stringify(messages[0]))).to.deep.equal({
      type: 'wetty:save',
      config: { xterm: { testOption: true } },
    });
  });
});
