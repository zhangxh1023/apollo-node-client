import { NAMESPACE_APPLICATION, CLUSTER_NAME_DEFAULT } from './constants.js';
import { ConfigManager } from './config_manager.js';
import { PropertiesConfig } from './properties_config.js';
import { JSONConfig } from './json_config.js';
import { PlainConfig } from './plain_config.js';
import { ConfigRequestOptions } from './types.js';

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
  public async getAppConfig(ip?: string): Promise<PropertiesConfig>;
  public async getAppConfig(options?: ConfigRequestOptions): Promise<PropertiesConfig>;
  public async getAppConfig(options?: string | ConfigRequestOptions): Promise<PropertiesConfig>;
  public async getAppConfig(options?: string | ConfigRequestOptions): Promise<PropertiesConfig> {
    const config = await this.getConfig(NAMESPACE_APPLICATION, options);
    return config as PropertiesConfig;
  }

  /**
   * get Config by namespaceName
   */
  public getConfig(namespaceName: string, ip?: string): Promise<PropertiesConfig | JSONConfig | PlainConfig>;
  public getConfig(namespaceName: string, options?: ConfigRequestOptions): Promise<PropertiesConfig | JSONConfig | PlainConfig>;
  public getConfig(namespaceName: string,
    options?: string | ConfigRequestOptions): Promise<PropertiesConfig | JSONConfig | PlainConfig>;
  public getConfig(namespaceName: string,
    options?: string | ConfigRequestOptions): Promise<PropertiesConfig | JSONConfig | PlainConfig> {
    return this.configManager.getConfig(namespaceName, options);
  }

  /**
   * stop long polling and release cached config instances
   */
  public close(): void {
    this.configManager.close();
  }
}
