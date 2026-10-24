import 'mocha';
import { expect } from 'chai';
import { html } from './html';
import type { Request, Response } from 'express';

function render(base: string): string {
  let body: string | undefined;
  const response = {
    send(value: string) {
      body = value;
    },
  };

  html(base, 'WeTTY')(
    {} as Request,
    response as unknown as Response,
    () => undefined,
  );
  if (body === undefined) throw new Error('HTML response was not rendered');
  return body;
}

describe('configuration editor asset path', () => {
  it('uses the existing served path at the root base', () => {
    expect(render('')).to.include('src="/client/xterm_config/index.html"');
  });

  it('prefixes the existing served path for a non-root base', () => {
    expect(render('/wetty')).to.include(
      'src="/wetty/client/xterm_config/index.html"',
    );
  });
});
