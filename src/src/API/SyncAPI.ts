import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export interface SyncDevice {
  id: string;
  name: string;
  platform: string;
  version: string;
}

export interface SyncStatus {
  device: SyncDevice;
  pin: string;
  port: number;
  addresses: string[];
  /** Announced on the network; otherwise the other device types the address. */
  discoverable: boolean;
}

export interface SyncPeer {
  id: string;
  name: string;
  platform: string;
  paired: boolean;
  online: boolean;
  addresses: string[];
  last_sync: number | null;
}

export interface MergeReport {
  books_matched: number;
  books_updated: number;
  series_updated: number;
  bookmarks_added: number;
  sessions_added: number;
  credentials_added: number;
  jellyfin_servers_added: number;
}

export interface RemoteBook {
  id: string;
  title: string;
  issue_number: string | null;
  series_id: string | null;
  series_title: string | null;
  file_name: string;
  size: number;
}

export interface SyncResult {
  pulled: MergeReport;
  pushed: MergeReport;
  remote_books: RemoteBook[];
}

export interface TransferResult {
  copied: number;
  failed: { title: string; error: string }[];
}

export interface TransferProgress {
  book_id: string;
  title: string;
  index: number;
  count: number;
  written: number;
  total: number;
}

export const startSync = (): Promise<SyncStatus> => invoke('sync_start');
export const stopSync = (): Promise<void> => invoke('sync_stop');
export const syncStatus = (): Promise<SyncStatus | null> =>
  invoke('sync_status');
export const setDeviceName = (name: string): Promise<void> =>
  invoke('sync_set_device_name', { name });
export const listPeers = (): Promise<SyncPeer[]> => invoke('sync_peers');
export const probePeer = (address: string): Promise<SyncPeer> =>
  invoke('sync_probe', { address });
export const pairPeer = (peerId: string, pin: string): Promise<SyncPeer> =>
  invoke('sync_pair', { peerId, pin });
export const forgetPeer = (peerId: string): Promise<void> =>
  invoke('sync_forget', { peerId });
export const runSync = (peerId: string): Promise<SyncResult> =>
  invoke('sync_run', { peerId });
export const transferBooks = (
  peerId: string,
  bookIds: string[]
): Promise<TransferResult> => invoke('sync_transfer', { peerId, bookIds });

export const onPeersChanged = (handler: () => void) =>
  listen('sync-peers-changed', handler);
export const onPinChanged = (handler: () => void) =>
  listen('sync-pin-changed', handler);
export const onPaired = (handler: (device: SyncDevice) => void) =>
  listen<SyncDevice>('sync-paired', (e) => handler(e.payload));
export const onMerged = (
  handler: (event: { peer: string; report: MergeReport }) => void
) =>
  listen<{ peer: string; report: MergeReport }>('sync-merged', (e) =>
    handler(e.payload)
  );
export const onTransferProgress = (
  handler: (progress: TransferProgress) => void
) =>
  listen<TransferProgress>('sync-transfer-progress', (e) => handler(e.payload));
