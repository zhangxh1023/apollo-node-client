import { ConfigChange } from './config_change';

export  class ConfigChangeEvent<T> {
  constructor(
    private readonly namespaceName: string,
    private readonly configChanges: Map<string, ConfigChange<T>>,
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

  public getChange(key: string): undefined | ConfigChange<T> {
    return this.configChanges.get(key);
  }

}
