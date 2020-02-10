import { ConfigService } from '../lib/config_service';
import { ConfigChangeEvent } from '../lib/config_change_event';

const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
});

async function main(): Promise<void> {
  const appConfig = await service.getAppConfig();
  const jsonConfig = await service.getConfig('first.json');

  appConfig.addChangeListener((changeEvent: ConfigChangeEvent) => {
    for (const key of changeEvent.changedKeys()) {
      const change = changeEvent.getChange(key);
      if (change) {
        console.log(`namespace: ${change.getNamespace()}, changeType: ${change.getChangeType()}, propertyName: ${change.getPropertyName()}, oldValue: ${change.getOldValue()}, newValue: ${change.getNewValue()}`);
      }
    }
  });

  jsonConfig.addChangeListener((changeEvent: ConfigChangeEvent) => {
    for (const key of changeEvent.changedKeys()) {
      const change = changeEvent.getChange(key);
      if (change) {
        console.log(`namespace: ${change.getNamespace()}, changeType: ${change.getChangeType()}, propertyName: ${change.getPropertyName()}, oldValue: ${JSON.stringify(change.getOldValue())}, newValue: ${JSON.stringify(change.getNewValue())}`);
      }
    }
  });

  console.log(appConfig.getAllConfig());
  console.log(jsonConfig.getAllConfig());
}

main();
