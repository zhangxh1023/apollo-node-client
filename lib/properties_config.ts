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

  public getProperty(key: string, defaultValue?: string): undefined | string {
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

  public getIp(): undefined | string {
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

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<string>) => void): PropertiesConfig {
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
        const { added, deleted, changed } = this.diffMap(this.configs, loadConfigResponse.configurations);
        const changeListeners = this.listenerCount(CHANGE_EVENT_NAME);
        // update change and emit changeEvent
        const configChangeEvent = this.updateConfigAndCreateChangeEvent(added, deleted, changed, loadConfigResponse.configurations, changeListeners);
        if (configChangeEvent) {
          this.emit(CHANGE_EVENT_NAME, configChangeEvent);
        }
        // update releaseKey
        this.setReleaseKey(loadConfigResponse.releaseKey);
      }
      // ignore no updates
    } catch (error) {
      console.log('[apollo-node-client] %s - load properties configs - %s', new Date(), error);
    }
  }

  private diffMap(oldConfigs: Map<string, string>, newConfigs: { [key: string]: string }): {
    added: string[];
    deleted: string[];
    changed: string[];
  } {
    const added: string[] = [];
    const deleted: string[] = [];
    const changed: string[] = [];
    for (const key in newConfigs) {
      if (oldConfigs.has(key)) {
        if (oldConfigs.get(key) !== newConfigs[key]) {
          changed.push(key);
        }
      } else {
        added.push(key);
      }
    }
    for (const key of oldConfigs.keys()) {
      if (!Object.prototype.hasOwnProperty.call(newConfigs, key)) {
        deleted.push(key);
      }
    }
    return {
      added,
      deleted,
      changed,
    };
  }

  private updateConfigAndCreateChangeEvent(added: string[], deleted: string[], changed: string[], newConfigs: {
    [key: string]: string;
  }, changeListeners: number): undefined | ConfigChangeEvent<string> {
    // if changeListeners > 0, not create ConfigChange
    const configChanges: Map<string, ConfigChange<string>> = new Map();

    for (const addedKey of added) {
      const newConfigValue = newConfigs[addedKey];
      if (changeListeners > 0) {
        configChanges.set(addedKey, new ConfigChange<string>(this.getNamespaceName(), addedKey, undefined, newConfigValue, PropertyChangeType.ADDED));
      }
      this.setProperty(addedKey, newConfigValue);
    }

    for (const deletedKey of deleted) {
      if (changeListeners > 0) {
        configChanges.set(deletedKey, new ConfigChange<string>(this.getNamespaceName(), deletedKey, this.configs.get(deletedKey), undefined, PropertyChangeType.DELETED));
      }
      this.deleteProperty(deletedKey);
    }

    for (const changedKey of changed) {
      const newConfigsValue = newConfigs[changedKey];
      if (changeListeners > 0) {
        configChanges.set(changedKey, new ConfigChange<string>(this.getNamespaceName(), changedKey, this.configs.get(changedKey), newConfigs[changedKey], PropertyChangeType.MODIFIED));
      }
      this.setProperty(changedKey, newConfigsValue);
    }

    let configChangeEvent: undefined | ConfigChangeEvent<string>;

    if (configChanges.size > 0) {
      configChangeEvent = new ConfigChangeEvent(this.getNamespaceName(), configChanges);
    }

    return configChangeEvent;
  }

}
