import { JSONValueType } from '../types/jsonType';
import { ConfigChangeEvent } from './config_change_event';

export interface ConfigInterface {
  getProperty(key: string, defaultValue: string | JSONValueType): string | JSONValueType;
  getProperty(key: string): string | JSONValueType;

  getAllConfig(): Map<string, string> | JSONValueType;

  getNamespaceName(): string;
  getNotificationId(): number;
  setNotificationId(notificationId: number): void;
  getIp(): string;

  addChangeListener(fn: (changeEvent: ConfigChangeEvent) => void): void;

  loadAndUpdateConfig(): Promise<void>;
}
