import 'mocha';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';
import { buildSync } from 'esbuild';
import { JSDOM } from 'jsdom';
import { defaultOptions } from './xterm_defaults';

const indexHtml = readFileSync(
  new URL('../../assets/xterm_config/index.html', import.meta.url),
  'utf8',
);
const buildResult = buildSync({
  entryPoints: [fileURLToPath(new URL('./index.ts', import.meta.url))],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  write: false,
});
const editorBundle = buildResult.outputFiles[0].text;
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

function createEditorDocument(base = '/wetty'): EditorHarness {
  const html = indexHtml.replace(
    '<script type="module" src="./functionality.js"></script>',
    `<script>${editorBundle}</script>`,
  );
  const parentMessages: PostedMessage[] = [];
  const parentWindow = {
    postMessage(message: unknown, targetOrigin: string) {
      parentMessages.push({ message, targetOrigin });
    },
  } as unknown as Window;
  const dom = new JSDOM(html, {
    url: `${applicationOrigin}${base}/client/xterm_config/index.html`,
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

function findOption(harness: EditorHarness, name: string): HTMLElement {
  const options =
    harness.dom.window.document.querySelectorAll<HTMLElement>(
      '[data-option-name]',
    );
  const option = [...options].find(
    (candidate) => candidate.dataset.optionName === name,
  );
  if (option == null) throw new Error(`Option was not rendered: ${name}`);
  return option;
}

function optionInput(harness: EditorHarness, name: string): HTMLInputElement {
  const input = findOption(harness, name).querySelector<HTMLInputElement>(
    'input',
  );
  if (input == null) throw new Error(`Option input was not rendered: ${name}`);
  return input;
}

function savedConfig(harness: EditorHarness): Record<string, unknown> {
  const posted =
    harness.parentMessages[harness.parentMessages.length - 1]?.message;
  if (
    typeof posted !== 'object' ||
    posted === null ||
    !('config' in posted) ||
    typeof posted.config !== 'object' ||
    posted.config === null
  ) {
    throw new Error('A save message was not posted');
  }
  return posted.config as Record<string, unknown>;
}

describe('bundled xterm configuration editor', () => {
  it('loads one generated script at the existing static paths', () => {
    const dom = new JSDOM(indexHtml);
    const scripts = dom.window.document.querySelectorAll('script');
    const style = dom.window.document.querySelector<HTMLLinkElement>(
      'link[rel="stylesheet"]',
    );

    expect(scripts).to.have.length(1);
    expect(scripts[0].getAttribute('type')).to.equal('module');
    expect(scripts[0].getAttribute('src')).to.equal('./functionality.js');
    expect(style?.getAttribute('href')).to.equal('./style.css');
    dom.window.close();
  });

  it('registers every option group before applying defaults', () => {
    const harness = createEditorDocument();
    const groupSizes = [
      'general_options',
      'color_theme',
      'advanced_options',
    ].map(
      (id) =>
        harness.dom.window.document
          .getElementById(id)
          ?.querySelectorAll('[data-option-name]').length,
    );

    expect(groupSizes).to.deep.equal([16, 21, 16]);
    expect(optionInput(harness, 'Font Size').value).to.equal('15');
    expect(optionInput(harness, 'Fit Terminal').checked).to.equal(true);
    expect(optionInput(harness, 'Selection Color').value).to.equal('#ffffff');
    expect(optionInput(harness, 'Selection Color Opacity').value).to.equal(
      '0.3',
    );
    expect(optionInput(harness, 'Allow Proposed XTerm APIs').checked).to.equal(
      true,
    );
    expect(
      findOption(harness, 'Font Size').classList.contains('unbounded'),
    ).to.equal(false);
    expect(
      findOption(harness, 'Allow Proposed XTerm APIs').classList.contains(
        'unbounded',
      ),
    ).to.equal(false);
    harness.dom.window.close();
  });

  it('preserves the embedded default bell sound payload', () => {
    const { bellSound } = defaultOptions.xterm;

    expect(bellSound).to.be.a('string');
    expect(bellSound).to.have.length(638);
  });

  it('round-trips built-page options at root and non-root editor paths', () => {
    for (const base of ['', '/wetty']) {
      const harness = createEditorDocument(base);
      const fitTerminal = optionInput(harness, 'Fit Terminal');

      dispatchParentMessage(harness, {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 22 },
        },
      });
      expect(optionInput(harness, 'Font Size').value).to.equal('22');

      fitTerminal.checked = false;
      fitTerminal.dispatchEvent(
        new harness.dom.window.Event('input', { bubbles: true }),
      );

      expect(harness.dom.window.location.pathname).to.equal(
        `${base}/client/xterm_config/index.html`,
      );
      expect(harness.parentMessages).to.have.length(1);
      expect(harness.parentMessages[0]?.targetOrigin).to.equal(
        applicationOrigin,
      );
      const config = savedConfig(harness);
      expect(config.wettyFitTerminal).to.equal(false);
      expect(config.xterm).not.to.have.property('bellSound');
      harness.dom.window.close();
    }
  });

  it('loads options only from the same-origin parent window', () => {
    const harness = createEditorDocument();
    const fontSize = optionInput(harness, 'Font Size');

    dispatchParentMessage(harness, {
      type: 'wetty:load',
      config: {
        wettyFitTerminal: true,
        wettyVoid: 0,
        xterm: { fontSize: 22 },
      },
    });

    expect(fontSize.value).to.equal('22');
    harness.dom.window.close();
  });

  it('ignores the trusted origin when the source is not the parent window', () => {
    const harness = createEditorDocument();
    const otherWindow = new JSDOM('', { url: applicationOrigin }).window;

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 22 },
        },
      },
      applicationOrigin,
      otherWindow as unknown as Window,
    );

    expect(optionInput(harness, 'Font Size').value).to.equal('15');
    otherWindow.close();
    harness.dom.window.close();
  });

  it('ignores a foreign origin even when the source is the parent window', () => {
    const harness = createEditorDocument();

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 22 },
        },
      },
      'https://attacker.example',
    );

    expect(optionInput(harness, 'Font Size').value).to.equal('15');
    harness.dom.window.close();
  });

  it('does not grant a foreign outer frame parent authority', () => {
    const harness = createEditorDocument();
    const outer = new JSDOM('', { url: 'https://outer.example/' });

    dispatchParentMessage(
      harness,
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 22 },
        },
      },
      outer.window.location.origin,
      outer.window as unknown as Window,
    );
    expect(optionInput(harness, 'Font Size').value).to.equal('15');

    dispatchParentMessage(harness, {
      type: 'wetty:load',
      config: {
        wettyFitTerminal: true,
        wettyVoid: 0,
        xterm: { fontSize: 22 },
      },
    });
    expect(optionInput(harness, 'Font Size').value).to.equal('22');

    outer.window.close();
    harness.dom.window.close();
  });

  it('ignores malformed and unknown load messages', () => {
    const harness = createEditorDocument();

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
      {
        type: 'wetty:load',
        config: {
          wettyFitTerminal: true,
          wettyVoid: 0,
          xterm: { fontSize: 'large' },
        },
      },
    ]) {
      dispatchParentMessage(harness, data);
    }

    expect(optionInput(harness, 'Font Size').value).to.equal('15');
    expect(harness.parentMessages).to.deep.equal([]);
    harness.dom.window.close();
  });

  it('suppresses invalid JSON saves and recovers when corrected', () => {
    const harness = createEditorDocument();
    const wordSeparator = optionInput(harness, 'Word Separator');

    wordSeparator.value = '{invalid';
    wordSeparator.dispatchEvent(
      new harness.dom.window.Event('input', { bubbles: true }),
    );
    expect(harness.parentMessages).to.deep.equal([]);

    wordSeparator.value = '"separators"';
    wordSeparator.dispatchEvent(
      new harness.dom.window.Event('input', { bubbles: true }),
    );

    expect(harness.parentMessages).to.have.length(1);
    const xterm = savedConfig(harness).xterm as Record<string, unknown>;
    expect(xterm.wordSeparator).to.equal('separators');
    expect(harness.parentMessages[0]?.targetOrigin).to.equal(applicationOrigin);
    harness.dom.window.close();
  });

  it('sends close only to the application origin', () => {
    const harness = createEditorDocument();
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
