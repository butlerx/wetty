import { expect } from 'chai';
import 'mocha';

import { Notifier, parseOsc777 } from './notifications';

describe('notification permission', () => {
  it('installs one pending click listener across reconnects', async () => {
    const originalNotification = Object.getOwnPropertyDescriptor(
      globalThis,
      'Notification',
    );
    const listeners: EventListenerOrEventListenerObject[] = [];
    const options: AddEventListenerOptions[] = [];
    let permissionRequests = 0;
    const element = {
      addEventListener(
        event: string,
        listener: EventListenerOrEventListenerObject,
        listenerOptions?: boolean | AddEventListenerOptions,
      ) {
        expect(event).to.equal('click');
        listeners.push(listener);
        if (typeof listenerOptions === 'object') options.push(listenerOptions);
      },
    } as unknown as HTMLElement;
    const notification = {
      permission: 'default',
      requestPermission: () => {
        permissionRequests += 1;
        return Promise.resolve('default' as NotificationPermission);
      },
    } as unknown as typeof Notification;

    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: notification,
    });

    try {
      Notifier.requestPermissionOnClick(element);
      Notifier.requestPermissionOnClick(element);

      expect(listeners).to.have.length(1);
      expect(options).to.deep.equal([{ once: true }]);

      const listener = listeners[0];
      if (typeof listener === 'function') listener(new Event('click'));
      else listener.handleEvent(new Event('click'));
      await Promise.resolve();

      expect(permissionRequests).to.equal(1);
      Notifier.requestPermissionOnClick(element);
      expect(listeners).to.have.length(2);
    } finally {
      if (originalNotification === undefined) {
        Reflect.deleteProperty(globalThis, 'Notification');
      } else {
        Object.defineProperty(globalThis, 'Notification', originalNotification);
      }
    }
  });
});

describe('parseOsc777', () => {
  it('should parse title and body', () => {
    expect(parseOsc777('notify;Build;Done')).to.deep.equal({
      title: 'Build',
      body: 'Done',
    });
  });

  it('should keep semicolons in the body', () => {
    expect(
      parseOsc777('notify;Build;Build finished; tests passed'),
    ).to.deep.equal({
      title: 'Build',
      body: 'Build finished; tests passed',
    });
  });

  it('should fall back to a default title and an empty body', () => {
    expect(parseOsc777('notify')).to.deep.equal({
      title: 'Terminal',
      body: '',
    });
  });

  it('should ignore commands other than notify', () => {
    expect(parseOsc777('other;Title;Body')).to.be.undefined;
  });
});
