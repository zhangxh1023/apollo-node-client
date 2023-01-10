import { NAMESPACE_APPLICATION, CLUSTER_NAME_DEFAULT } from './constants';
import { ConfigManager } from './config_manager';
import { PropertiesConfig } from './properties_config';
import { JSONConfig } from './json_config';
import { PlainConfig } from './plain_config';

export class ConfigService {

  private readonly configManager: ConfigManager;

  constructor(private readonly options: {
    configServerUrl: string;
    appId: string;
    clusterName?: string;
    secret?: string;
  }) {
    this.options = options;
    this.options.clusterName = this.options.clusterName ? this.options.clusterName : CLUSTER_NAME_DEFAULT;
    this.configManager = new ConfigManager({
      ...this.options,
      clusterName: this.options.clusterName,
    });
  }

  /**
   * getAppConfig, default namespace name: `application`
   */
  public async getAppConfig(ip? : string): Promise<PropertiesConfig> {
    const config = await this.getConfig(NAMESPACE_APPLICATION, ip);
    return config as PropertiesConfig;
  }

  /**
   * get Config by namespaceName
   */
  public getConfig(namespaceName: string, ip?: string): Promise<PropertiesConfig | JSONConfig | PlainConfig> {
    return this.configManager.getConfig(namespaceName, ip);
  }
}
