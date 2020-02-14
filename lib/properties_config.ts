import { ConfigInterface } from './config';
import { NOTIFICATION_ID_PLACEHOLDER, CHANGE_EVENT_NAME } from './constants';
import { LoadConfigService } from './load_config_service';
import { EventEmitter } from 'events';
import { ConfigChangeEvent } from './config_change_event';
import { ConfigChange } from './config_change';
import { PropertyChangeType } from './property_change_types';

export class PropertiesConfig extends EventEmitter implements ConfigInterface {

  private configs: Map<string, string> = new Map();

  private releaseKey = '';

  private notificationId = NOTIFICATION_ID_PLACEHOLDER;

  private readonly REQUEST_TIME_OUT = 70000;

  constructor(private readonly options: {
    configServerUrl: string;
    appId: string;
    clusterName: string;
    namespaceName: string;
  }, private readonly ip?: string) {
    super();
    this.options = options;
    this.ip = ip;
  }

  public getProperty(key: string, defaultValue?: string): void | string {
    const value = this.configs.get(key);
    if (value || value === '') {
      return value;
    }
    return defaultValue;
  }

  public getAllConfig(): Map<string, string> {
    return this.configs;
  }

  private setProperty(key: string, value: string): void {
    this.configs.set(key, value);
  }

  private deleteProperty(key: string): boolean {
    return this.configs.delete(key);
  }

  public getNamespaceName(): string {
    return this.options.namespaceName;
  }

  public getIp(): void | string {
    return this.ip;
  }

  private getReleaseKey(): string {
    return this.releaseKey;
  }

  private setReleaseKey(newReleaseKey: string): void {
    this.releaseKey = newReleaseKey;
  }

  public getNotificationId(): number {
    return this.notificationId;
  }

  public setNotificationId(newNotificationId: number): void {
    this.notificationId = newNotificationId;
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent) => void): PropertiesConfig {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  public async loadAndUpdateConfig(): Promise<void> {
    const url = LoadConfigService.formatLoadConfigUrl(Object.assign({}, this.options, {
      releaseKey: this.getReleaseKey(),
      ip: this.getIp(),
    }));
    try {
      const { error, response, body } = await LoadConfigService.loadConfig(url, {
        timeout: this.REQUEST_TIME_OUT,
      });
      if (error) {
        throw error;
      }
      if (response.statusCode === 200 && typeof body === 'string' && body) {
        const loadConfigResponse: {
          appId: string;
          cluster: string;
          namespaceName: string;
          configurations: {
            [key: string]: string;
          };
          releaseKey: string;
        } = JSON.parse(body);
        // diff change
        const oldConfigKeys = Array.from(this.configs.keys());
        const newConfigKeys = Object.keys(loadConfigResponse.configurations);
        const { added, deleted, noChanged } = this.diffArray(oldConfigKeys, newConfigKeys);

        const changeListeners = this.listenerCount(CHANGE_EVENT_NAME);
        // update change and emit changeEvent
        const configChangeEvent = this.updateConfigAndCreateChangeEvent(added, deleted, noChanged, loadConfigResponse.configurations, changeListeners);
        if (configChangeEvent) {
          this.emit(CHANGE_EVENT_NAME, configChangeEvent);
        }
        // update releaseKey
        this.setReleaseKey(loadConfigResponse.releaseKey);
      }
      // ignore no updates
    } catch (error) {
      // ignore error
    }
  }

  private diffArray(oldConfigKeys: string[], newConfigKeys: string[]): {
    added: string[];
    deleted: string[];
    noChanged: string[];
  } {
    const added: string[] = [];
    const deleted: string[] = [];
    const noChanged: string[] = [];

    const compareFn = (a: string, b: string): number => {
      return a > b ? 1 : -1;
    };

    oldConfigKeys.sort(compareFn);
    newConfigKeys.sort(compareFn);

    const oldConfigKeysLength = oldConfigKeys.length;
    const newConfigKeysLength = newConfigKeys.length;
    let oldConfigKeysIndex = 0;
    let newConfigKeysIndex = 0;

    while (oldConfigKeysIndex < oldConfigKeysLength &&  newConfigKeysIndex < newConfigKeysLength) {
      const oldConfigKey = oldConfigKeys[oldConfigKeysIndex];
      const newConfigKey = newConfigKeys[newConfigKeysIndex];
      if (oldConfigKey === newConfigKey) {
        noChanged.push(oldConfigKey);
        oldConfigKeysIndex++;
        newConfigKeysIndex++;
        continue;
      } else if(oldConfigKey < newConfigKey) {
        deleted.push(oldConfigKey);
        oldConfigKeysIndex++;
      } else {
        added.push(newConfigKey);
        newConfigKeysIndex++;
      }
    }

    for (let i = oldConfigKeysIndex; i < oldConfigKeysLength; i++) {
      deleted.push(oldConfigKeys[i]);
    }

    for (let i = newConfigKeysIndex; i < newConfigKeysLength; i++) {
      added.push(newConfigKeys[i]);
    }

    return {
      added,
      deleted,
      noChanged,
    };
  }

  private updateConfigAndCreateChangeEvent(added: string[], deleted: string[], noChanged: string[], newConfigs: {
    [key: string]: string;
  }, changeListeners: number): void | ConfigChangeEvent {
    // if changeListeners > 0, not create ConfigChange
    const configChanges: Map<string, ConfigChange> = new Map();

    for (const addedKey of added) {
      const newConfigValue = newConfigs[addedKey];
      if (changeListeners > 0) {
        configChanges.set(addedKey, new ConfigChange(this.getNamespaceName(), addedKey, undefined, newConfigValue, PropertyChangeType.ADDED));
      }
      this.setProperty(addedKey, newConfigValue);
    }

    for (const deletedKey of deleted) {
      if (changeListeners > 0) {
        configChanges.set(deletedKey, new ConfigChange(this.getNamespaceName(), deletedKey, this.configs.get(deletedKey), undefined, PropertyChangeType.DELETED));
      }
      this.deleteProperty(deletedKey);
    }

    for (const noChangedKey of noChanged) {
      const newConfigsValue = newConfigs[noChangedKey];
      if (this.getProperty(noChangedKey) !== newConfigsValue) {
        if (changeListeners > 0) {
          configChanges.set(noChangedKey, new ConfigChange(this.getNamespaceName(), noChangedKey, this.configs.get(noChangedKey), newConfigs[noChangedKey], PropertyChangeType.MODIFIED));
        }
        this.setProperty(noChangedKey, newConfigsValue);
      }
    }

    let configChangeEvent: void | ConfigChangeEvent;

    if (configChanges.size > 0) {
      configChangeEvent = new ConfigChangeEvent(this.getNamespaceName(), configChanges);
    }

    return configChangeEvent;
  }

}
