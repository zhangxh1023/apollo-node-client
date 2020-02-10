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
    console.log(changeEvent);
  });

  jsonConfig.addChangeListener((changeEvent: ConfigChangeEvent) => {
    console.log(changeEvent);
  });

  console.log(appConfig.getAllConfig());
  console.log(jsonConfig.getAllConfig());
}

main();
