import { ConfigChangeEvent } from './config_change_event.js';

export interface ConfigInterface<TValue = unknown, TAllConfig = unknown> {

  getAllConfig(): TAllConfig;

  getProperty(key: string, defaultValue?: TValue): undefined | TValue;

  getNamespaceName(): string;

  getNotificationId(): number;

  loadAndUpdateConfig(notificationId?: number): Promise<void>;

  addChangeListener(fn: (changeEvent: ConfigChangeEvent<TValue>) => void): this;
}
