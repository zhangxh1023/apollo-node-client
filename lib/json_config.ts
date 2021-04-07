import { ConfigInterface } from './config';
import { JSONValueType } from './types';
import { NOTIFICATION_ID_PLACEHOLDER, CHANGE_EVENT_NAME } from './constants';
import { LoadConfigService } from './load_config_service';
import { ConfigChangeEvent } from './config_change_event';
import { ConfigChange } from './config_change';
import { PropertyChangeType } from './property_change_types';
import { EventEmitter } from 'events';
import { Access } from './access';

export class JSONConfig extends EventEmitter implements ConfigInterface {

  private releaseKey = '';

  private notificationId = NOTIFICATION_ID_PLACEHOLDER;

  private configs: JSONValueType = Object.create(null);

  constructor(private readonly options: {
    configServerUrl: string;
    appId: string;
    clusterName: string;
    namespaceName: string;
    secret?: string;
  }, private readonly ip?: string) {
    super();
    this.options = options;
    this.ip = ip;
  }

  public getProperty(key: string, defaultValue?: JSONValueType): undefined | JSONValueType {
    return this.getPropertyByJSONAndKey(this.configs, key, defaultValue);
  }

  private getPropertyByJSONAndKey(configs: JSONValueType, key: string, defaultValue?: JSONValueType): undefined | JSONValueType {
    const keySlice = key.split('.');
    const value = this.getPropertyByJSONAndKeySlice(configs, keySlice);
    if (value !== undefined) {
      return value;
    }
    return defaultValue;
  }

  private getPropertyByJSONAndKeySlice(JSONValue: undefined | JSONValueType, keySlice: string[]): undefined | JSONValueType {
    if (keySlice.length === 0) {
      return JSONValue;
    }
    if (typeof JSONValue === 'string' || typeof JSONValue === 'number' || typeof JSONValue === 'boolean' || JSONValue === null || JSONValue === undefined) {
      return;
    }
    if (Array.isArray(JSONValue)) {
      return;
    }
    const key = keySlice.shift();
    if (!key) {
      return;
    }
    return this.getPropertyByJSONAndKeySlice(JSONValue[key], keySlice);
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

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<JSONValueType>) => void): JSONConfig {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  public getIp(): undefined | string {
    return this.ip;
  }

  public async loadAndUpdateConfig(): Promise<void> {
    const url = LoadConfigService.formatLoadConfigUrl(Object.assign({}, this.options, {
      releaseKey: this.getReleaseKey(),
      ip: this.getIp(),
    }));
    try {
      let headers: undefined | {
        Authorization: string;
        Timestamp: number;
      };
      if (this.options.secret) {
        headers = Access.createAccessHeader(this.options.appId, url, this.options.secret);
      }
      const { error, response, body } = await LoadConfigService.loadConfig(url, { headers });
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
      console.log('[apollo-node-client] %s - load json configs - %s', new Date(), error);
    }
  }

  private diffJSON(oldJSONValue: JSONValueType, newJSONValue: JSONValueType, prefix = ''): {
    added: string[];
    deleted: string[];
    changed: string[];
  } {
    const added: string[] = [];
    const deleted: string[] = [];
    const changed: string[] = [];

    if (typeof oldJSONValue === 'string' ||
    typeof newJSONValue === 'string' ||
    typeof oldJSONValue === 'number' ||
    typeof newJSONValue === 'number' ||
    typeof oldJSONValue === 'boolean' ||
    typeof newJSONValue === 'boolean' ||
    oldJSONValue === null ||
    newJSONValue === null) {
      if (oldJSONValue !== newJSONValue) {
        changed.push(prefix);
      }
      return {
        added,
        deleted,
        changed,
      };
    }

    if (Array.isArray(oldJSONValue) || Array.isArray(newJSONValue)) {
      if (JSON.stringify(oldJSONValue) !== JSON.stringify(newJSONValue)) {
        changed.push(prefix);
      }
      return {
        added,
        deleted,
        changed,
      };
    }

    for (const key of Object.keys(oldJSONValue)) {
      if (!Object.prototype.hasOwnProperty.call(newJSONValue, key)) {
        const newKey = prefix ? prefix + '.' + key : key;
        deleted.push(newKey);
      }
    }

    for (const key of Object.keys(newJSONValue)) {
      const newKey = prefix ? prefix + '.' + key : key;
      if (!Object.prototype.hasOwnProperty.call(oldJSONValue, key)) {
        added.push(newKey);
      } else {
        // merge returned value
        const { added: _added, deleted: _deleted, changed: _changed } = this.diffJSON(oldJSONValue[key], newJSONValue[key], newKey);
        added.push(..._added);
        deleted.push(..._deleted);
        changed.push(..._changed);
      }
    }

    return {
      added,
      deleted,
      changed,
    };
  }

  private updateConfigAndCreateChangeEvent(added: string[], deleted: string[], changed: string[], newConfigs: JSONValueType, listeners: number): undefined | ConfigChangeEvent<any> {
    // if changeListeners === 0, not create ConfigChange
    let configChangeEvent: undefined | ConfigChangeEvent<any>;
    if (listeners > 0) {
      const configChanges: Map<string, ConfigChange<any>> = new Map();
      for (const key of added) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, undefined, this.getPropertyByJSONAndKey(newConfigs, key), PropertyChangeType.ADDED);
        configChanges.set(key, configChange);
      }
      for (const key of deleted) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, this.getProperty(key), undefined, PropertyChangeType.DELETED);
        configChanges.set(key, configChange);
      }
      for (const key of changed) {
        const configChange = new ConfigChange(this.getNamespaceName(), key, this.getProperty(key), this.getPropertyByJSONAndKey(newConfigs, key), PropertyChangeType.MODIFIED);
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
