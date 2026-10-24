import 'mocha';
import { expect } from 'chai';
import { escapeShell } from './shell';

describe('Values passed to escapeShell should be safe to pass woth sub processes', () => {
  it('should escape remove subcommands', () => {
    const cmd = escapeShell('test`echo hello`');
    expect(cmd).to.equal('testechohello');
  });

  it('should allow usernames with special characters', () => {
    const cmd = escapeShell('bob.jones\\COM@ultra-machine_dir');
    expect(cmd).to.equal('bob.jones\\COM@ultra-machine_dir');
  });

  it('should ensure args cant be flags', () => {
    const cmd = escapeShell("-oProxyCommand='bash' -c `wget localhost:2222`");
    expect(cmd).to.equal('oProxyCommandbash-cwgetlocalhost2222');
  });

  it('should remove dashes even when there are illegal characters before them', () => {
    const cmd = escapeShell("`-oProxyCommand='bash' -c `wget localhost:2222`");
    expect(cmd).to.equal('oProxyCommandbash-cwgetlocalhost2222');
  });
});
