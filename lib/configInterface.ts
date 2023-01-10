import { ConfigChangeEvent } from './config_change_event';

export interface ConfigInterface {

  getAllConfig(): unknown;

  getProperty(key: string, defaultValue?: unknown): unknown;

  getNamespaceName(): string;

  getNotificationId(): number;

  loadAndUpdateConfig(): Promise<void>;

  addChangeListener(fn: (changeEvent: ConfigChangeEvent<unknown>) => void): unknown;
}
