import { NAMESPACE_APPLICATION, CLUSTER_NAME_DEFAULT } from './constants';
import { ConfigManager } from './config_manager';
import { ConfigInterface } from './config';

export class ConfigService {

  private readonly configManager: ConfigManager;

  constructor(private readonly options: {
    configServerUrl: string;
    appId: string;
    clusterName?: string;
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
  public getAppConfig(ip? : string): Promise<ConfigInterface> {
    return this.getConfig(NAMESPACE_APPLICATION, ip);
  }

  /**
   * get Config by namespaceName
   */
  public getConfig(namespaceName: string, ip?: string): Promise<ConfigInterface> {
    return this.configManager.getConfig(namespaceName, ip);
  }
}
