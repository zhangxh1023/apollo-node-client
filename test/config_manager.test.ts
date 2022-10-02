import { ConfigManager } from '../lib/config_manager';
import { Request, Notification } from '../lib/request';
import {PropertiesConfig} from '../lib/properties_config';
import {JSONConfig} from '../lib/json_config';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;

const mockNotifications = (namespaceName: string, notificationId: number): Notification[] => {
  return [{ namespaceName, notificationId }];
};

mockRequest.fetchNotifications.mockResolvedValue(mockNotifications('a', 1));

const configManager = new ConfigManager({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
});

afterAll(() => {
  configManager.removeConfig('config');
  configManager.removeConfig('config2.properties');
  configManager.removeConfig('config3.json.properties');
  configManager.removeConfig('.properties');
  configManager.removeConfig('config.json');
  configManager.removeConfig('config2.properties.json');
  configManager.removeConfig('.json');
  configManager.removeConfig('errorConfig');
});

it('should throw Error with not support', () => {
  expect(configManager.getConfig('test.xml')).rejects.toThrowError(/xml/);
  expect(configManager.getConfig('test.yml')).rejects.toThrowError(/yml/);
  expect(configManager.getConfig('test.yaml')).rejects.toThrowError(/yaml/);
  expect(configManager.getConfig('test.txt')).rejects.toThrowError(/txt/);
});

it('should return a properties config', async () => {
  const config1 = await configManager.getConfig('config');
  expect(config1.getNamespaceName()).toEqual('config');
  expect(config1 instanceof PropertiesConfig).toBeTruthy();

  const config2 = await configManager.getConfig('config2.properties');
  expect(config2.getNamespaceName()).toEqual('config2');
  expect(config2 instanceof PropertiesConfig).toBeTruthy();

  expect(configManager.getConfig('.properties')).rejects.toThrowError('empty');
});

it('should return a json config', async () => {
  const config1 = await configManager.getConfig('config.json');
  expect(config1.getNamespaceName()).toEqual('config.json');
  expect(config1 instanceof JSONConfig).toBeTruthy();
});

it('should ignore the request error', async() => {
  mockRequest.fetchNotifications.mockRejectedValueOnce(new Error('Mock reject fetch config'));
  expect(configManager.getConfig('errorConfig')).resolves.not.toThrowError();
});
