import { AuthHeader } from './access';
import { Config } from './config';
import { ConfigInterface } from './configInterface';
import { ConfigChangeEvent } from './config_change_event';
import { ConfigContentType, ConfigOptions } from './types';
import { Request } from './request';
import { CHANGE_EVENT_NAME, PropertyChangeType } from './constants';
import { ConfigChange } from './config_change';

export class PlainConfig extends Config implements ConfigInterface {

  private configs: undefined | string;

  constructor(options: ConfigOptions, ip?: string) {
    super(options, ip);
  }

  getAllConfig(): undefined | string {
    return this.configs;
  }

  public getProperty(_?: string, defaultValue?: string): undefined | string {
    if (this.configs !== undefined) {
      return this.configs;
    }
    return defaultValue;
  }

  public async _loadAndUpdateConfig(url: string, headers: AuthHeader | undefined): Promise<void> {
    const loadConfigResp = await Request.fetchConfig<ConfigContentType>(url, headers);
    if (loadConfigResp) {
      const configChangeEvent = this.updateConfigAndCreateChangeEvent(this.configs, loadConfigResp.configurations.content);
      if (configChangeEvent) {
        this.emit(CHANGE_EVENT_NAME, configChangeEvent);
      }
      this.setReleaseKey(loadConfigResp.releaseKey);
    }
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<string>) => void): PlainConfig {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  private updateConfigAndCreateChangeEvent(oldText: undefined | string, newText: string): undefined | ConfigChangeEvent<string> {
    let changeType: PropertyChangeType;
    if (oldText === undefined) {
      changeType = PropertyChangeType.ADDED;
    } else if (newText === undefined) {
      changeType = PropertyChangeType.DELETED;
    } else {
      changeType = PropertyChangeType.MODIFIED;
    }
    const configChanges: Map<string, ConfigChange<string>> = new Map();
    const configChange = new ConfigChange(this.getNamespaceName(),
      '',
      oldText,
      newText,
      changeType);
    configChanges.set('', configChange);
    this.configs = newText;
    return new ConfigChangeEvent(this.getNamespaceName(), configChanges);
  }

}
