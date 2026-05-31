import { AuthHeader } from './access.js';
import { Config } from './config.js';
import { ConfigInterface } from './configInterface.js';
import { ConfigChangeEvent } from './config_change_event.js';
import { ConfigContentType, ConfigOptions, ConfigRequestOptions } from './types.js';
import { LoadConfigResp, Request } from './request.js';
import { CHANGE_EVENT_NAME, PropertyChangeType } from './constants.js';
import { ConfigChange } from './config_change.js';

type ResolvedContent = {
  resolved: boolean;
  content?: string;
};

export class PlainConfig extends Config implements ConfigInterface<string, undefined | string> {

  private configs: undefined | string;

  constructor(options: ConfigOptions, requestOptions?: string | ConfigRequestOptions) {
    super(options, requestOptions);
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
      const resolvedContent = this.resolveContent(loadConfigResp);
      if (resolvedContent.resolved) {
        const configChangeEvent = this.updateConfigAndCreateChangeEvent(this.configs, resolvedContent.content);
        if (configChangeEvent) {
          this.emit(CHANGE_EVENT_NAME, configChangeEvent);
        }
      }
      this.setReleaseKey(loadConfigResp.releaseKey);
    }
  }

  private resolveContent(loadConfigResp: LoadConfigResp<ConfigContentType>): ResolvedContent {
    if (loadConfigResp.configurations) {
      return {
        resolved: true,
        content: loadConfigResp.configurations.content,
      };
    }
    if (Request.isIncrementalConfig(loadConfigResp)) {
      const configurations: ConfigContentType = Object.create(null);
      if (this.configs !== undefined) {
        configurations.content = this.configs;
      }
      return {
        resolved: true,
        content: Request.mergeConfigurationChanges(configurations, loadConfigResp.configurationChanges).content,
      };
    }
    return {
      resolved: false,
    };
  }

  public addChangeListener(fn: (changeEvent: ConfigChangeEvent<string>) => void): this {
    this.addListener(CHANGE_EVENT_NAME, fn);
    return this;
  }

  private updateConfigAndCreateChangeEvent(oldText: undefined | string, newText: undefined | string): undefined | ConfigChangeEvent<string> {
    if (oldText === newText) {
      return;
    }
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
