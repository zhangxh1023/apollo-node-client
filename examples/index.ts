import { ConfigService } from '..';
import { ConfigChangeEvent } from '..';

const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  secret: '0ddfacb7ce2e449f8a07b152fbba9375'
});

async function main(): Promise<void> {
  const appConfig = await service.getAppConfig();
  const jsonConfig = await service.getConfig('first.json');
  // const [appConfig, jsonConfig] = await Promise.all([service.getAppConfig(), service.getConfig('first.json')]);

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

  jsonConfig.addChangeListener((changeEvent: ConfigChangeEvent<any>) => {
    for (const key of changeEvent.changedKeys()) {
      const change = changeEvent.getChange(key);
      if (change) {
        console.log(`namespace: ${change.getNamespace()},
          changeType: ${change.getChangeType()},
          propertyName: ${change.getPropertyName()},
          oldValue: ${JSON.stringify(change.getOldValue())},
          newValue: ${JSON.stringify(change.getNewValue())}`);
      }
    }
  });

  console.log(appConfig.getAllConfig());
  console.log(appConfig.getProperty('mysql.user'));
  console.log(jsonConfig.getAllConfig());
  console.log(jsonConfig.getProperty('mysql.user'));
}

main();
