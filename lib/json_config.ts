import { ConfigInterface } from './config';
import { JSONValueType } from '../types/jsonType';
import { NOTIFICATION_ID_PLACEHOLDER, CHANGE_EVENT_NAME } from '../constants';
import { LoadConfigService } from './load_config_service';
import { ConfigChangeEvent } from './config_change_event';
import { ConfigChange } from './config_change';
import { PropertyChangeType } from '../enums/property_change_types';
import { EventEmitter } from 'events';

export class JSONConfig extends EventEmitter implements ConfigInterface {

  private releaseKey = '';

  private notificationId = NOTIFICATION_ID_PLACEHOLDER;

  private configs: JSONValueType = Object.create(null);

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

  public getProperty(key: string, defaultValue?: JSONValueType): JSONValueType {
    const keySlice = key.split('.');
    const value = this.getPropertyFromJSONAndKey(this.configs, keySlice);
    if (value) {
      return value;
    }
    return defaultValue;
  }

  private getPropertyFromJSONAndKey(JSONValue: JSONValueType, keySlice: string[]): void | JSONValueType {
    if (keySlice.length === 0) {
      return JSONValue;
    }
    if (typeof JSONValue === 'string' || typeof JSONValue === 'number' || typeof JSONValue === 'boolean' || JSONValue === null) {
      return;
    }
    if (Array.isArray(JSONValue)) {
      return;
    }
    const key = keySlice.shift();
    return this.getPropertyFromJSONAndKey(JSONValue[key], keySlice);
  }

  public getNamespaceName(): string {
    return this.options.namespaceName;
  }

  public getAllConfig(): JSONValueType {
    return this.configs;
  }

  public getNotificationId(): number {
    return this.notificationId;
  }

  public setNotificationId(newNotificationId: number): void {
    this.notificationId = newNotificationId;
  }

  private getReleaseKey(): string {
    return this.releaseKey;
  }

  private setReleaseKey(releaseKey: string): void {
    this.releaseKey = releaseKey;
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent) => void): JSONConfig {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  public getIp(): string {
    return this.ip;
  }

  public async loadAndUpdateConfig(): Promise<void> {
    const url = LoadConfigService.formatLoadConfigUrl(Object.assign({}, this.options, {
      releaseKey: this.getReleaseKey(),
      ip: this.getIp(),
    }));
    try {
      const { error, response, body } = await LoadConfigService.loadConfig(url, { timeout: this.REQUEST_TIME_OUT });
      if (error) {
        throw error;
      }
      if (response.statusCode === 200 && typeof body === 'string' && body) {
        const loadConfigResponse: {
          appId: string;
          cluster: string;
          namespaceName: string;
          configurations: {
            content: string;
          };
          releaseKey: string;
        } = JSON.parse(body);
        const content = loadConfigResponse.configurations.content;
        if (content) {
          let newConfigs: JSONValueType;
          try {
            newConfigs = JSON.parse(content);
          } catch (error) {
            newConfigs = content;
          }
          const { added, deleted, changed } = this.diffJSON(this.configs, newConfigs);
          const listeners = this.listenerCount(CHANGE_EVENT_NAME);
          const configChangeEvent = this.updateConfigAndCreateChangeEvent(added, deleted, changed, newConfigs, listeners);
          if (configChangeEvent) {
            this.emit(CHANGE_EVENT_NAME, configChangeEvent);
          }
        }
        this.setReleaseKey(loadConfigResponse.releaseKey);
      }
      // ignore no updates
    } catch (error) {
      // ignore
    }
  }

  private diffJSON(oldJSONValue: JSONValueType, newJSONValue: JSONValueType, prefix = ''): {
    added: {
      [key: string]: JSONValueType;
    };
    deleted: {
      [key: string]: JSONValueType;
    };
    changed: {
      [key: string]: JSONValueType;
    };
  } {
    const added = Object.create(null);
    const deleted = Object.create(null);
    const changed = Object.create(null);

    if (typeof oldJSONValue === 'string' ||
    typeof newJSONValue === 'string' ||
    typeof oldJSONValue === 'number' ||
    typeof newJSONValue === 'number' ||
    typeof oldJSONValue === 'boolean' ||
    typeof newJSONValue === 'boolean' ||
    oldJSONValue === null ||
    newJSONValue === null) {
      if (oldJSONValue !== newJSONValue) {
        changed[prefix] = newJSONValue;
        return {
          added,
          deleted,
          changed,
        };
      }
    }

    if (Array.isArray(oldJSONValue) || Array.isArray(newJSONValue)) {
      if (JSON.stringify(oldJSONValue) !== JSON.stringify(newJSONValue)) {
        changed[prefix] = newJSONValue;
        return {
          added,
          deleted,
          changed,
        };
      }
    }

    for (const key of Object.keys(oldJSONValue)) {
      if (!Object.prototype.hasOwnProperty.call(newJSONValue, key)) {
        const newKey = prefix ? prefix + '.' + key : key;
        deleted[newKey] = undefined;
      }
    }

    for (const key of Object.keys(newJSONValue)) {
      const newKey = prefix ? prefix + '.' + key : key;
      if (!Object.prototype.hasOwnProperty.call(oldJSONValue, key)) {
        added[newKey] = newJSONValue[key];
      } else {
        // merge returned value
        const { added: _added, deleted: _deleted, changed: _changed } = this.diffJSON(oldJSONValue[key], newJSONValue[key], newKey);
        Object.assign(added, _added);
        Object.assign(deleted, _deleted);
        Object.assign(changed, _changed);
      }
    }

    return {
      added,
      deleted,
      changed,
    };
  }

  private updateConfigAndCreateChangeEvent(added: {
    [key: string]: JSONValueType;
  }, deleted: {
    [key: string]: JSONValueType;
  }, changed: {
    [key: string]: JSONValueType;
  }, newConfigs: JSONValueType, listeners: number): ConfigChangeEvent {
    // if changeListeners > 0, not create ConfigChange
    let configChangeEvent: ConfigChangeEvent;
    if (listeners > 0) {
      const configChanges: Map<string, ConfigChange> = new Map();

      for (const key of Object.keys(added)) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, undefined, added[key], PropertyChangeType.ADDED);
        configChanges.set(key, configChange);
      }

      for (const key of Object.keys(deleted)) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, this.getProperty(key), undefined, PropertyChangeType.DELETED);
        configChanges.set(key, configChange);
      }

      for (const key of Object.keys(changed)) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, this.getProperty(key), changed[key], PropertyChangeType.MODIFIED);
        configChanges.set(key, configChange);
      }

      if (configChanges.size > 0) {
        configChangeEvent = new ConfigChangeEvent(this.getNamespaceName(), configChanges);
      }
    }

    this.configs = newConfigs;
    return configChangeEvent;
  }

}
