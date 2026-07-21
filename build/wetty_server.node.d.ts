/**
 * Type declarations for the wetty-server napi-rs native addon.
 *
 * Generated manually to match the #[napi] exports in crates/server/src/lib.rs.
 */

import type { SSH, SSL, Server } from '../src/config/interfaces.js';

export interface ServerHandle {
  close(): void;
  wait(): Promise<void>;
}

export function start(
  ssh: SSH | null,
  serverConf: Server | null,
  command: string | null,
  forcessh: boolean | null,
  ssl: SSL | null,
): Promise<ServerHandle>;

export function decorateServerWithSsh(
  ssh: SSH | null,
  serverConf: Server | null,
  command: string | null,
  forcessh: boolean | null,
  ssl: SSL | null,
): Promise<ServerHandle>;
