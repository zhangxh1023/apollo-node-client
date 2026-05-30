import { PropertiesConfig } from './properties_config.js';
import { CLUSTER_NAMESPACE_SEPARATOR, ConfigTypes } from './constants.js';
import { JSONConfig } from './json_config.js';
import { Access, AuthHeader } from './access.js';
import { Request } from './request.js';
import { PlainConfig } from './plain_config.js';

export type ConfigManagerOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  secret?: string;
  label?: string;
  dataCenter?: string;
};

type NamespacePair = {
  namespaceName: string;
  type: ConfigTypes;
};

export class ConfigManager {

  private static readonly NO_IP_CONFIGS_MAP_KEY = '<no-ip>';

  private LONG_POLL_RETRY_TIME = 1000;

  private MAX_LONG_POLL_RETRY_TIME = 16000;

  private MIN_LONG_POLL_RETRY_TIME = 1000;

  private configsMap: Map<string, PropertiesConfig | JSONConfig | PlainConfig> = new Map();

  private configsMapVersion = 0;

  private closed = false;

  constructor(private readonly options: ConfigManagerOptions) {
    this.options = options;
  }

  private getTypeByNamespaceName(namespaceName: string): NamespacePair {
    for (const key in ConfigTypes) {
      if (namespaceName.endsWith(`.${ConfigTypes[key]}`)) {
        return {
          namespaceName: ConfigTypes[key] === ConfigTypes.PROPERTIES ?
            namespaceName.substring(
              0,
              namespaceName.length - ConfigTypes[key].length - 1
            ) : namespaceName,
          type: ConfigTypes[key]
        };
      }
    }
    return { namespaceName, type: ConfigTypes.PROPERTIES };
  }

  public async getConfig(namespaceName: string, ip?: string): Promise<PropertiesConfig | JSONConfig | PlainConfig> {
    const type = this.getTypeByNamespaceName(namespaceName);
    if (!type.namespaceName) {
      throw new Error('namespaceName can not be empty!');
    }
    this.closed = false;
    const mpKey = this.formatConfigsMapKey(type.namespaceName, ip);
    let config = this.configsMap.get(mpKey);
    if (!config) {
      if (type.type == ConfigTypes.PROPERTIES) {
        config = new PropertiesConfig({
          ...this.options,
          namespaceName: type.namespaceName,
        }, ip);
      } else if (type.type == ConfigTypes.JSON) {
        config = new JSONConfig({
          ...this.options,
          namespaceName: type.namespaceName,
        }, ip);
      } else {
        config = new PlainConfig({
          ...this.options,
          namespaceName: type.namespaceName,
        }, ip);
      }

      this.configsMapVersion = this.configsMapVersion % Number.MAX_SAFE_INTEGER + 1;
      const configsMapVersion = this.configsMapVersion;
      const key = this.formatConfigsMapKey(config.getNamespaceName(), ip);
      this.configsMap.set(key, config);
      const singleMap = new Map();
      singleMap.set(key, config);
      try {
        await this.updateConfigs(singleMap);
      } catch (error) {
        console.log('[apollo-node-client] %s - load notifications failed. - %s', new Date(), error);
      }
      setImmediate(async () => {
        await this.startLongPoll(configsMapVersion);
      });
    }
    return config;
  }

  public removeConfig(namespaceName: string, ip?: string): void {
    const type = this.getTypeByNamespaceName(namespaceName);
    const mpKey = this.formatConfigsMapKey(type.namespaceName, ip);
    this.configsMap.delete(mpKey);
    if (this.configsMap.size === 0) {
      this.configsMapVersion = this.configsMapVersion % Number.MAX_SAFE_INTEGER + 1;
    }
  }

  public close(): void {
    this.closed = true;
    this.configsMap.clear();
    this.configsMapVersion = this.configsMapVersion % Number.MAX_SAFE_INTEGER + 1;
  }

  private async updateConfigs(configsMap: Map<string, PropertiesConfig | JSONConfig | PlainConfig>): Promise<void> {
    const url = Request.formatNotificationsUrl({
      ...this.options,
    }, configsMap);
    let headers: undefined | AuthHeader;
    if (this.options.secret) {
      headers = Access.createAccessHeader(this.options.appId, url, this.options.secret);
    }
    const notification = await Request.fetchNotifications(url, headers);

    if (notification) {
      for (const item of notification) {
        for (const config of configsMap.values()) {
          if (config.getNamespaceName() !== item.namespaceName) {
            continue;
          }
          await config.loadAndUpdateConfig(item.notificationId);
          config.setNotificationId(item.notificationId);
        }
      }
    }
    // ignore no update
  }

  private async startLongPoll(configsMapVersion: number): Promise<void> {
    if (this.closed || configsMapVersion !== this.configsMapVersion) {
      return;
    }
    try {
      await this.updateConfigs(this.configsMap);
      this.LONG_POLL_RETRY_TIME = this.MIN_LONG_POLL_RETRY_TIME;
    } catch (error) {
      console.log('[apollo-node-client] %s - update configs failed, will retry in %s seconds. - %s',
        new Date(), this.LONG_POLL_RETRY_TIME / 1000, error);
      await this.sleep(this.LONG_POLL_RETRY_TIME);
      if (this.LONG_POLL_RETRY_TIME < this.MAX_LONG_POLL_RETRY_TIME) {
        this.LONG_POLL_RETRY_TIME *= 2;
      }
    }

    if (!this.closed && this.configsMap.size > 0) {
      setImmediate(() => {
        this.startLongPoll(configsMapVersion);
      });
    }
  }

  private formatConfigsMapKey(namespaceName: string, ip?: string): string {
    return [
      this.options.clusterName,
      namespaceName,
      ip || ConfigManager.NO_IP_CONFIGS_MAP_KEY,
    ].join(CLUSTER_NAMESPACE_SEPARATOR);
  }

  private sleep(time = 2000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
  }

}
