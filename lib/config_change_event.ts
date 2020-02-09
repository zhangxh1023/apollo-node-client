import { ConfigChange } from './config_change';

export  class ConfigChangeEvent {
  constructor(
    private readonly namespaceName: string,
    private readonly configChanges: Map<string, ConfigChange>,
  ) {
    this.namespaceName = namespaceName;
    this.configChanges = configChanges;
  }

  public getNamespace(): string {
    return this.namespaceName;
  }

  public changedKeys(): string[] {
    return Array.from(this.configChanges.keys());
  }

  public getChange(key: string): void | ConfigChange {
    return this.configChanges.get(key);
  }

}
