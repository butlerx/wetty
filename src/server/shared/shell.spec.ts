import 'mocha';
import { expect } from 'chai';
import { escapeShell } from './shell';

describe('Values passed to escapeShell should be safe to pass woth sub processes', () => {
  it('should escape remove subcommands', () => {
    const cmd = escapeShell('test`echo hello`');
    expect(cmd).to.equal('testechohello');
  });

  it('should ensure args cant be flags', () => {
    const cmd = escapeShell("-oProxyCommand='bash' -c `wget localhost:2222`");
    expect(cmd).to.equal('oProxyCommandbash-cwgetlocalhost2222');
  });
});
