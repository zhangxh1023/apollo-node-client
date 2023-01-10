import { ConfigManager } from '../lib/config_manager';
import { Request, Notification } from '../lib/request';
import { PropertiesConfig } from '../lib/properties_config';
import { JSONConfig } from '../lib/json_config';
import { PlainConfig } from '../lib/plain_config';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;

const mockNotifications = (namespaceName: string, notificationId: number): Notification[] => {
  return [{ namespaceName, notificationId }];
};

const sleep = (time = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, time));
};

const configManager = new ConfigManager({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
});

afterAll(() => {
  configManager.removeConfig('config');
  configManager.removeConfig('config2.properties');
  configManager.removeConfig('config3.json.properties');
  configManager.removeConfig('config.json');
  configManager.removeConfig('config.txt');
  configManager.removeConfig('errorConfig');
  configManager.removeConfig('errorConfig2');
});

describe('properties config', () => {
  const configs = {
    'key1': 'value1',
    'key1.key2': 'value2',
    'key1.key2.key3': 'value3',
  };
  let propertiesConfig1;
  let propertiesConfig2;

  const mockOnce = (namespaceName: string): void => {
    mockRequest.fetchNotifications.mockResolvedValueOnce(mockNotifications(namespaceName, 1));
    mockRequest.fetchConfig.mockResolvedValueOnce({
      'appId': 'SampleApp',
      'cluster': 'default',
      namespaceName,
      'configurations': configs,
      'releaseKey': '20200203154030-1dc524aa9a4a5974'
    });
  };

  it('should return a properties config', async () => {
    const configNamespaceName = 'config';
    mockOnce(configNamespaceName);
    propertiesConfig1 = await configManager.getConfig(configNamespaceName);
    expect(propertiesConfig1.getNamespaceName()).toEqual(configNamespaceName);
    expect(propertiesConfig1 instanceof PropertiesConfig).toBeTruthy();

    const config2NamespaceName = 'config2';
    mockOnce(config2NamespaceName);
    propertiesConfig2 = await configManager.getConfig(`${config2NamespaceName}.properties`);
    expect(propertiesConfig2.getNamespaceName()).toEqual('config2');
    expect(propertiesConfig2 instanceof PropertiesConfig).toBeTruthy();

    expect(configManager.getConfig('.properties')).rejects.toThrowError('empty');
  });

  it('should get correct configs', () => {
    expect(propertiesConfig1.getAllConfig()).toStrictEqual(new Map(Object.entries(configs)));
    expect(propertiesConfig2.getAllConfig()).toStrictEqual(new Map(Object.entries(configs)));
  });
});

describe('json config', () => {
  const namespaceName = 'config.json';
  const configs = {
    key: 'value',
    key2: [1, 2],
    key3: {
      key4: null
    },
  };
  let jsonConfig;

  it('should return a json config', async () => {
    mockRequest.fetchNotifications.mockResolvedValueOnce(mockNotifications(namespaceName, 1));
    mockRequest.fetchConfig.mockResolvedValueOnce({
      'appId': 'SampleApp',
      'cluster': 'default',
      namespaceName,
      'configurations': {
        'content': JSON.stringify(configs),
      },
      'releaseKey': '20200203154030-1dc524aa9a4a5974'
    });
    jsonConfig = await configManager.getConfig(namespaceName);
    expect(jsonConfig.getNamespaceName()).toEqual(namespaceName);
    expect(jsonConfig instanceof JSONConfig).toBeTruthy();
  });

  it('should get correct configs', () => {
    expect(jsonConfig.getAllConfig()).toStrictEqual(configs);
  });
});

describe('plain config', () => {
  const namespaceName = 'config.txt';
  const configs = 'plain configs';
  let plainConfig;

  it('should return a plain config', async () => {
    mockRequest.fetchNotifications.mockResolvedValueOnce(mockNotifications(namespaceName, 1));
    mockRequest.fetchConfig.mockResolvedValueOnce({
      'appId': 'SampleApp',
      'cluster': 'default',
      namespaceName,
      'configurations': {
        'content': configs,
      },
      'releaseKey': '20200203154030-1dc524aa9a4a5974'
    });
    plainConfig = await configManager.getConfig(namespaceName);
    expect(plainConfig.getNamespaceName()).toEqual(namespaceName);
    expect(plainConfig instanceof PlainConfig).toBeTruthy();
  });

  it('should get correct configs', () => {
    expect(plainConfig.getAllConfig()).toEqual(configs);
  });

  it('should ignore the long poll error', async () => {
    mockRequest.fetchNotifications.mockRejectedValueOnce(new Error('mock reject fetch notifications'));
    await sleep();
    expect(plainConfig.getAllConfig()).toEqual(configs);
  });

  it('should long poll update config', async () => {
    const newConfigs = 'new configs';
    mockRequest.fetchNotifications.mockResolvedValueOnce(mockNotifications(namespaceName, 3));
    mockRequest.fetchConfig.mockResolvedValueOnce({
      'appId': 'SampleApp',
      'cluster': 'default',
      namespaceName,
      'configurations': {
        'content': newConfigs,
      },
      'releaseKey': '20200203154030-1dc524aa9a4a5974'
    });
    await sleep();
    expect(plainConfig.getAllConfig()).toEqual(newConfigs);
  });

});

it('should ignore the request error', async () => {
  mockRequest.fetchNotifications.mockRejectedValueOnce(new Error('Mock reject fetch notifications'));
  expect(configManager.getConfig('errorConfig')).resolves.not.toThrowError();

  const namespaceName2 = 'errorConfig2';
  mockRequest.fetchNotifications.mockResolvedValueOnce(mockNotifications(namespaceName2, Number.MAX_VALUE));
  mockRequest.fetchConfig.mockRejectedValueOnce(new Error('Mock reject fetch config'));
  expect(configManager.getConfig(namespaceName2)).resolves.not.toThrowError();
});
