import { AuthHeader } from './access.js';
import { Config } from './config.js';
import { ConfigInterface } from './configInterface.js';
import { ConfigChange } from './config_change.js';
import { ConfigChangeEvent } from './config_change_event.js';
import { CHANGE_EVENT_NAME, PropertyChangeType } from './constants.js';
import { LoadConfigResp, Request } from './request.js';
import { ConfigContentType, ConfigOptions, ConfigRequestOptions } from './types.js';

export type JSONBaseType = string | number | boolean | null;

export type JSONArrayType = JSONValueType[];

export type JSONType = {
  [key: string]: JSONValueType;
}

export type JSONValueType = JSONBaseType | JSONArrayType | JSONType;

export class JSONConfig extends Config implements ConfigInterface<JSONValueType, JSONValueType> {

  private configs: JSONValueType = Object.create(null);

  private content: undefined | string;

  constructor(options: ConfigOptions, requestOptions?: string | ConfigRequestOptions) {
    super(options, requestOptions);
  }

  public getProperty(key: string, defaultValue?: JSONValueType): undefined | JSONValueType {
    const value = this.getPropertyByJSONAndKey(this.configs, key);
    if (value !== undefined) {
      return this.cloneJSONValue(value);
    }
    return defaultValue;
  }

  private getPropertyByJSONAndKey(configs: JSONValueType,
    key: string): undefined | JSONValueType {
    const keySlice = key ? key.split('.') : [];
    return this.getPropertyByJSONAndKeySlice(configs, keySlice);
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
    if (!Object.prototype.hasOwnProperty.call(JSONValue, key)) return;
    return this.getPropertyByJSONAndKeySlice(JSONValue[key], keySlice);
  }

  public getAllConfig(): JSONValueType {
    return this.cloneJSONValue(this.configs);
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<JSONValueType>) => void): this {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  public async _loadAndUpdateConfig(url: string, headers: AuthHeader | undefined): Promise<void> {
    const loadConfigResp = await Request.fetchConfig<ConfigContentType>(url, headers);
    if (loadConfigResp) {
      const content = this.resolveContent(loadConfigResp);
      if (content !== undefined) {
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
        this.content = content;
      }
      this.setReleaseKey(loadConfigResp.releaseKey);
    }
  }

  private resolveContent(loadConfigResp: LoadConfigResp<ConfigContentType>): undefined | string {
    if (loadConfigResp.configurations) {
      return loadConfigResp.configurations.content;
    }
    if (Request.isIncrementalConfig(loadConfigResp)) {
      const configurations: ConfigContentType = Object.create(null);
      if (this.content !== undefined) {
        configurations.content = this.content;
      }
      return Request.mergeConfigurationChanges(configurations, loadConfigResp.configurationChanges).content;
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
      const newValue = this.getPropertyByJSONAndKey(newConfigs, key);
      const configChange = new ConfigChange(this.getNamespaceName(),
        key,
        undefined,
        newValue === undefined ? undefined : this.cloneJSONValue(newValue),
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
      const newValue = this.getPropertyByJSONAndKey(newConfigs, key);
      const configChange = new ConfigChange(this.getNamespaceName(),
        key,
        this.getProperty(key),
        newValue === undefined ? undefined : this.cloneJSONValue(newValue),
        PropertyChangeType.MODIFIED);
      configChanges.set(key, configChange);
    }
    if (configChanges.size > 0) {
      configChangeEvent = new ConfigChangeEvent(this.getNamespaceName(), configChanges);
    }

    this.configs = newConfigs;
    return configChangeEvent;
  }

  private cloneJSONValue(value: JSONValueType): JSONValueType {
    if (value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean') {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map(item => this.cloneJSONValue(item));
    }
    const cloned: JSONType = {};
    for (const key of Object.keys(value)) {
      cloned[key] = this.cloneJSONValue(value[key]);
    }
    return cloned;
  }

}
