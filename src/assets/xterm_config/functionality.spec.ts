import 'mocha';
import { expect } from 'chai';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const indexHtml = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const functionality = readFileSync(
  new URL('./functionality.js', import.meta.url),
  'utf8',
);
const applicationOrigin = 'https://wetty.example';

interface PostedMessage {
  message: unknown;
  targetOrigin: string;
}

interface EditorHarness {
  dom: JSDOM;
  parentMessages: PostedMessage[];
  parentWindow: Window;
}

function createOptionsDocument(
  optionsSchema: unknown[] = [
    {
      type: 'boolean',
      name: 'Test option',
      description: 'Test description',
      path: ['xterm', 'testOption'],
    },
  ],
): EditorHarness {
  const html = indexHtml
    .replaceAll(/\s*<script src="[^"]+"><\/script>/g, '')
    .replace(
      '</body>',
      `<script>
${functionality}
inflateOptions(${JSON.stringify(optionsSchema)});
</script>
</body>`,
    );
  const parentMessages: PostedMessage[] = [];
  const parentWindow = {
    postMessage(message: unknown, targetOrigin: string) {
      parentMessages.push({ message, targetOrigin });
    },
  } as unknown as Window;
  const dom = new JSDOM(html, {
    url: `${applicationOrigin}/wetty/client/xterm_config/index.html`,
    runScripts: 'dangerously',
    beforeParse(window) {
      window.alert = () => undefined;
      Object.defineProperty(window, 'parent', {
        configurable: true,
        value: parentWindow,
      });
    },
  });

  return { dom, parentMessages, parentWindow };
}

function dispatchParentMessage(
  harness: EditorHarness,
  data: unknown,
  origin = applicationOrigin,
  source: Window = harness.parentWindow,
): void {
  harness.dom.window.dispatchEvent(
    new harness.dom.window.MessageEvent('message', {
      data,
      origin,
      source,
    }),
  );
}

describe('xterm configuration options', () => {
  it('loads options only from the same-origin parent window', () => {
    const harness = createOptionsDocument();
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    dispatchParentMessage(harness, {
      type: 'wetty:load',
      config: {
        wettyFitTerminal: true,
        wettyVoid: 0,
        xterm: { testOption: true },
      },
    });

    expect(input.checked).to.equal(true);
    expect(input.closest('.boolean_option')?.classList.contains('unbounded')).to
      .equal(false);
    harness.dom.window.close();
  });

  it('ignores the trusted origin when the source is not the parent window', () => {
    const harness = createOptionsDocument();
    const otherWindow = new JSDOM('', { url: applicationOrigin }).window;
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { testOption: true },
        },
      },
      applicationOrigin,
      otherWindow as unknown as Window,
    );

    expect(input.checked).to.equal(false);
    expect(input.closest('.boolean_option')?.classList.contains('unbounded')).to
      .equal(true);
    otherWindow.close();
    harness.dom.window.close();
  });

  it('ignores a foreign origin even when the source is the parent window', () => {
    const harness = createOptionsDocument();
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { testOption: true },
        },
      },
      'https://attacker.example',
    );

    expect(input.checked).to.equal(false);
    expect(input.closest('.boolean_option')?.classList.contains('unbounded')).to
      .equal(true);
    harness.dom.window.close();
  });

  it('does not grant a foreign outer frame parent authority', () => {
    const harness = createOptionsDocument();
    const outer = new JSDOM('', { url: 'https://outer.example/' });
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { testOption: true },
        },
      },
      outer.window.location.origin,
      outer.window as unknown as Window,
    );

    expect(input.checked).to.equal(false);
    expect(input.closest('.boolean_option')?.classList.contains('unbounded')).to
      .equal(true);

    dispatchParentMessage(harness, {
      type: 'wetty:load',
      config: {
        wettyFitTerminal: true,
        wettyVoid: 0,
        xterm: { testOption: true },
      },
    });
    expect(input.checked).to.equal(true);

    outer.window.close();
    harness.dom.window.close();
  });

  it('ignores malformed and unknown load messages before changing options', () => {
    const harness = createOptionsDocument();
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    for (const data of [
      null,
      'wetty:load',
      { type: 'wetty:unknown' },
      { type: 'wetty:load' },
      { type: 'wetty:load', config: null },
      { type: 'wetty:load', config: { xterm: [] } },
      {
        type: 'wetty:load',
        config: { wettyFitTerminal: 'yes', wettyVoid: 0, xterm: {} },
      },
    ]) {
      dispatchParentMessage(harness, data);
    }

    expect(input.checked).to.equal(false);
    expect(input.closest('.boolean_option')?.classList.contains('unbounded')).to
      .equal(true);
    expect(harness.parentMessages).to.deep.equal([]);
    harness.dom.window.close();
  });

  it('saves the first valid input change to the application origin', () => {
    const harness = createOptionsDocument();
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .boolean_option input',
    );
    if (input == null) throw new Error('Test option was not rendered');

    input.checked = true;
    input.dispatchEvent(
      new harness.dom.window.Event('input', { bubbles: true }),
    );

    expect(harness.parentMessages).to.have.length(1);
    expect(
      JSON.parse(JSON.stringify(harness.parentMessages[0]?.message)),
    ).to.deep.equal({
      type: 'wetty:save',
      config: { xterm: { testOption: true } },
    });
    expect(harness.parentMessages[0]?.targetOrigin).to.equal(applicationOrigin);
    harness.dom.window.close();
  });

  it('suppresses saves while JSON input is invalid and recovers when corrected', () => {
    const harness = createOptionsDocument([
      {
        type: 'text',
        name: 'JSON option',
        description: 'JSON test description',
        path: ['xterm', 'windowOptions'],
        json: true,
      },
    ]);
    const input = harness.dom.window.document.querySelector<HTMLInputElement>(
      'body > .text_option input',
    );
    if (input == null) throw new Error('JSON option was not rendered');

    input.value = '{invalid';
    input.dispatchEvent(
      new harness.dom.window.Event('input', { bubbles: true }),
    );
    expect(harness.parentMessages).to.deep.equal([]);

    input.value = '{"fullscreen":true}';
    input.dispatchEvent(
      new harness.dom.window.Event('input', { bubbles: true }),
    );

    expect(harness.parentMessages).to.have.length(1);
    expect(
      JSON.parse(JSON.stringify(harness.parentMessages[0]?.message)),
    ).to.deep.equal({
      type: 'wetty:save',
      config: { xterm: { windowOptions: { fullscreen: true } } },
    });
    expect(harness.parentMessages[0]?.targetOrigin).to.equal(applicationOrigin);
    harness.dom.window.close();
  });

  it('sends close only to the application origin', () => {
    const harness = createOptionsDocument();
    const editorWindow = harness.dom.window as unknown as Window & {
      closeConfig: () => void;
    };

    editorWindow.closeConfig();

    expect(harness.parentMessages).to.deep.equal([
      {
        message: { type: 'wetty:close' },
        targetOrigin: applicationOrigin,
      },
    ]);
    harness.dom.window.close();
  });
});
