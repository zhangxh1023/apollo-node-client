import { ConfigService, ConfigChangeEvent } from 'apollo-node-client';

const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'apolloNodeClient',
  clusterName: 'default',
  // secret: '16b63e04c38f4bd2b10dadb3ad39e356'
});

async function main(): Promise<void> {
  const [
    appConfig,
    jsonConfig,
    txtConfig
  ] = await Promise.all([
    service.getAppConfig(),
    service.getConfig('first.json'),
    service.getConfig('first.txt')
  ]);

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

  txtConfig.addChangeListener((changeEvent: ConfigChangeEvent<any>) => {
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
  console.log(jsonConfig.getAllConfig());
  console.log(jsonConfig.getProperty('mysql.user'));
  console.log(txtConfig.getAllConfig());
  console.log(txtConfig.getProperty('mysql.user'));
}

main();
