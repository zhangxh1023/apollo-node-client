import { AuthHeader } from './access';
import { Config } from './config';
import { ConfigInterface } from './configInterface';
import { ConfigChange } from './config_change';
import { ConfigChangeEvent } from './config_change_event';
import { CHANGE_EVENT_NAME, PropertyChangeType } from './constants';
import { Request } from './request';
import { ConfigContentType, ConfigOptions } from './types';

export type JSONBaseType = string | number | boolean | null;

export type JSONArrayType = JSONBaseType[];

export type JSONType = {
  [key: string]: JSONBaseType | JSONArrayType | JSONType;
}

export type JSONValueType = JSONBaseType | JSONArrayType | JSONType;

export class JSONConfig extends Config implements ConfigInterface {

  private configs: JSONValueType = Object.create(null);

  constructor(options: ConfigOptions, ip?: string) {
    super(options, ip);
  }

  public getProperty(key: string, defaultValue?: JSONValueType): undefined | JSONValueType {
    return this.getPropertyByJSONAndKey(this.configs, key, defaultValue);
  }

  private getPropertyByJSONAndKey(configs: JSONValueType,
    key: string, defaultValue?: JSONValueType): undefined | JSONValueType {
    const keySlice = key ? key.split('.') : [];
    const value = this.getPropertyByJSONAndKeySlice(configs, keySlice);
    if (value !== undefined) {
      return value;
    }
    return defaultValue;
  }

  private getPropertyByJSONAndKeySlice(JSONValue: undefined | JSONValueType, keySlice: string[]): undefined | JSONValueType {
    if (keySlice.length == 0) {
      return JSONValue;
    }
    if (typeof JSONValue === 'string'
      || typeof JSONValue === 'number'
      || typeof JSONValue === 'boolean'
      || JSONValue === null
      || JSONValue === undefined) return;
    if (Array.isArray(JSONValue)) return;
    const key = keySlice.shift();
    if (!key) return;
    return this.getPropertyByJSONAndKeySlice(JSONValue[key], keySlice);
  }

  public getAllConfig(): JSONValueType {
    return this.configs;
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<JSONValueType>) => void): JSONConfig {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  public async _loadAndUpdateConfig(url: string, headers: AuthHeader | undefined): Promise<void> {
    const loadConfigResp = await Request.fetchConfig<ConfigContentType>(url, headers);
    if (loadConfigResp) {
      const content = loadConfigResp.configurations.content;
      if (content) {
        let newConfigs: JSONValueType;
        try {
          newConfigs = JSON.parse(content);
        } catch (error) {
          newConfigs = content;
        }
        const { added, deleted, changed } = this.diffJSON(this.configs, newConfigs);
        const configChangeEvent = this.updateConfigAndCreateChangeEvent(added,
          deleted,
          changed,
          newConfigs);
        if (configChangeEvent) {
          this.emit(CHANGE_EVENT_NAME, configChangeEvent);
        }
      }
      this.setReleaseKey(loadConfigResp.releaseKey);
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
        const {
          added: _added,
          deleted: _deleted,
          changed: _changed
        } = this.diffJSON(oldJSONValue[key], newJSONValue[key], newKey);
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

  private updateConfigAndCreateChangeEvent(added: string[], deleted: string[], changed: string[], newConfigs: JSONValueType): undefined | ConfigChangeEvent<JSONValueType> {
    let configChangeEvent: undefined | ConfigChangeEvent<JSONValueType>;
    const configChanges: Map<string, ConfigChange<JSONValueType>> = new Map();
    for (const key of added) {
      const configChange = new ConfigChange(this.getNamespaceName(),
        key,
        undefined,
        this.getPropertyByJSONAndKey(newConfigs, key),
        PropertyChangeType.ADDED);
      configChanges.set(key, configChange);
    }
    for (const key of deleted) {
      const configChange = new ConfigChange(this.getNamespaceName(),
        key,
        this.getProperty(key),
        undefined,
        PropertyChangeType.DELETED);
      configChanges.set(key, configChange);
    }
    for (const key of changed) {
      const configChange = new ConfigChange(this.getNamespaceName(),
        key,
        this.getProperty(key),
        this.getPropertyByJSONAndKey(newConfigs, key),
        PropertyChangeType.MODIFIED);
      configChanges.set(key, configChange);
    }
    if (configChanges.size > 0) {
      configChangeEvent = new ConfigChangeEvent(this.getNamespaceName(), configChanges);
    }

    this.configs = newConfigs;
    return configChangeEvent;
  }

}
