import service from './util/service';
import type { ConfigChangeEvent, PropertiesConfig } from 'apollo-node-client';

const main = async (): Promise<void> => {
  const appConfig = (await service.getAppConfig()) as PropertiesConfig;
  appConfig.addChangeListener((changeEvent: ConfigChangeEvent<string>) => {
    for (const key of changeEvent.changedKeys()) {
      const change = changeEvent.getChange(key);
      if (change) {
        console.log(`namespace: ${change.getNamespace()},
changeType: ${change.getChangeType()},
propertyName: ${change.getPropertyName()},
oldValue: ${change.getOldValue()},
newValue: ${change.getNewValue()}`);
      }
    }
  });

  console.log(appConfig.getAllConfig());
  console.log(appConfig.getProperty('mysql.user'));
};

main();
