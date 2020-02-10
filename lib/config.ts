import { JSONValueType } from '../types/jsonType';
import { ConfigChangeEvent } from './config_change_event';

export interface ConfigInterface {
  getProperty(key: string, defaultValue?: JSONValueType): void | JSONValueType;

  getAllConfig(): Map<string, string> | JSONValueType;

  getNamespaceName(): string;
  getNotificationId(): number;
  setNotificationId(notificationId: number): void;
  getIp(): void | string;

  addChangeListener(fn: (changeEvent: ConfigChangeEvent) => void): void;

  loadAndUpdateConfig(): Promise<void>;
}
