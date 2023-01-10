import { PropertiesConfig } from './properties_config';
import { CLUSTER_NAMESPACE_SEPARATOR, ConfigTypes } from './constants';
import { JSONConfig } from './json_config';
import { Access, AuthHeader } from './access';
import { Request } from './request';
import { PlainConfig } from './plain_config';

export type ConfigManagerOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  secret?: string;
};

type NamespacePair = {
  namespaceName: string;
  type: ConfigTypes;
};

export class ConfigManager {

  private LONG_POLL_RETRY_TIME = 1000;

  private MAX_LONG_POLL_RETRY_TIME = 16000;

  private MIN_LONG_POLL_RETRY_TIME = 1000;

  private configsMap: Map<string, PropertiesConfig | JSONConfig | PlainConfig> = new Map();

  private configsMapVersion = 0;

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
    const mpKey = this.formatConfigsMapKey(type.namespaceName);
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
      const key = this.formatConfigsMapKey(config.getNamespaceName());
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

  public removeConfig(namespaceName: string): void {
    const type = this.getTypeByNamespaceName(namespaceName);
    const mpKey = this.formatConfigsMapKey(type.namespaceName);
    this.configsMap.delete(mpKey);
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
        const key = this.formatConfigsMapKey(item.namespaceName);
        const config = this.configsMap.get(key);
        if (config) {
          await config.loadAndUpdateConfig();
          config.setNotificationId(item.notificationId);
        }
      }
    }
    // ignore no update
  }

  private async startLongPoll(configsMapVersion: number): Promise<void> {
    if (configsMapVersion !== this.configsMapVersion) {
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

    if (this.configsMap.size > 0) {
      setImmediate(() => {
        this.startLongPoll(configsMapVersion);
      });
    }
  }

  private formatConfigsMapKey(namespaceName: string): string {
    return this.options.clusterName + CLUSTER_NAMESPACE_SEPARATOR + namespaceName;
  }

  private sleep(time = 2000): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, time));
  }

}
