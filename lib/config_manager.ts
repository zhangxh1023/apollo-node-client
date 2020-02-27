import { PropertiesConfig } from './properties_config';
import { ConfigTypes } from './config_types';
import { CLUSTER_NAMESPACE_SEPARATOR } from './constants';
import { LoadNotificationsService } from './load_notifications_service';
import { JSONConfig } from './json_config';

export class ConfigManager {
  
  private configsMap: Map<string, PropertiesConfig | JSONConfig> = new Map();

  private configsMapVersion = 0;

  constructor(private readonly options: {
    configServerUrl: string;
    appId: string;
    clusterName: string;
  }) {
    this.options = options;
  }

  public async getConfig(namespaceName: string, ip?: string): Promise<PropertiesConfig | JSONConfig> {
    let config = this.configsMap.get(namespaceName);
    if (!config) {
      const nameSlice = namespaceName.split('.');
      const postfix = nameSlice.pop();
      switch (postfix) {
      case ConfigTypes.PROPERTIES:
        config = new PropertiesConfig({
          ...this.options,
          namespaceName: nameSlice.join('.'),
        }, ip);
        break;
      case ConfigTypes.XML:
        throw new Error('XML type is not support!');
      case ConfigTypes.JSON:
        config = new JSONConfig({
          ...this.options,
          namespaceName,
        }, ip);
        break;
      case ConfigTypes.YML:
        throw new Error('YML type is not support!');
      case ConfigTypes.YAML:
        throw new Error('YAML type is not support!');
      case ConfigTypes.TXT:
        throw new Error('TXT type is not support!');
      default:
        config = new PropertiesConfig({
          ...this.options,
          namespaceName,
        }, ip);
        break;
      }

      this.configsMapVersion = this.configsMapVersion % Number.MAX_SAFE_INTEGER + 1;
      const key = this.formatConfigsMapKey(config.getNamespaceName());
      this.configsMap.set(key, config);
      await this.longPoll(this.configsMapVersion);
    }
    return config;
  }

  private formatConfigsMapKey(namespaceName: string): string {
    return this.options.clusterName + CLUSTER_NAMESPACE_SEPARATOR + namespaceName;
  }

  private async longPoll(configsMapVersion: number): Promise<void> {
    if (configsMapVersion !== this.configsMapVersion) {
      return;
    }
    const url = LoadNotificationsService.formatLongPollUrl({
      ...this.options,
    }, this.configsMap);
    try {
      const { error, response, body } = await LoadNotificationsService.loadNotifications(url);


      // console.log(`configsMapVersion: ${configsMapVersion}, error: ${error}, body: ${body}`);


      if (error) {
        throw error;
      }
      if (response && response.statusCode === 200 && typeof body === 'string' && body) {
        const notificationsResponse: {
          namespaceName: string;
          notificationId: number;
        }[] = JSON.parse(body);
        for (const item of notificationsResponse) {
          const key = this.formatConfigsMapKey(item.namespaceName);
          const config = this.configsMap.get(key);
          if (config) {
            await config.loadAndUpdateConfig();
            config.setNotificationId(item.notificationId);
          }
        }
      }
      // ignore no update
    } catch (error) {
      // ignore error
    }


    setImmediate(() => {
      this.longPoll(configsMapVersion);
    });
  }

}
