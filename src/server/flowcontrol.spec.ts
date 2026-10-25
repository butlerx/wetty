import { expect } from 'chai';
import 'mocha';

import { FlowControlServer } from './flowcontrol';

describe('server flow control boundaries', () => {
  it('pauses when output reaches the high watermark exactly', () => {
    const flow = new FlowControlServer(2, 4);

    expect(flow.account(4)).to.equal(true);
    expect(flow.account(1)).to.equal(false);
  });

  it('pauses when output crosses the high watermark', () => {
    const flow = new FlowControlServer(2, 4);

    expect(flow.account(3)).to.equal(false);
    expect(flow.account(1)).to.equal(true);
    expect(flow.account(1)).to.equal(false);
  });

  it('resumes when a commit reaches the low watermark exactly', () => {
    const flow = new FlowControlServer(2, 4);

    expect(flow.account(4)).to.equal(true);
    expect(flow.commit(2)).to.equal(true);
    expect(flow.commit(1)).to.equal(false);
  });
});
