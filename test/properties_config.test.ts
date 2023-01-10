import { KVConfigContentType, PropertiesConfig } from '../lib/properties_config';
import { LoadConfigResp, Request } from '../lib/request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { CHANGE_EVENT_NAME, PropertyChangeType } from '../lib/constants';


jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const namespaceName = 'application';
const mockResponse = (configurations: KVConfigContentType): LoadConfigResp<KVConfigContentType> => {
  return {
    'appId': 'SampleApp',
    'cluster': 'default',
    'releaseKey': '20200203154030-1dc524aa9a4a5974',
    'configurations': configurations,
    namespaceName,
  };
};

const initConfigs = {
  'a.b': '',
  'a.b.c': '2',
};

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName,
};

const propertiesConfig = new PropertiesConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  return propertiesConfig.loadAndUpdateConfig();
});

it('should return all the correct properties configs', () => {
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initConfigs)));
  expect(propertiesConfig.getProperty('a.b')).toBe(initConfigs['a.b']);
  expect(propertiesConfig.getProperty('a.b.c')).toBe(initConfigs['a.b.c']);
});

it('should return the correct value and default value', () => {
  expect(propertiesConfig.getProperty('a.none', 'default value')).toBe('default value');
});

it('should get the correct changeEvent', (done: jest.DoneCallback): void => {
  try {
    const handle = (changeEvent: ConfigChangeEvent<string>): void => {
      expect(changeEvent.getNamespace()).toBe(namespaceName);
      expect(changeEvent.changedKeys().sort()).toStrictEqual(['a.b', 'a.b.c', 'b.a'].sort());

      const addedChange = changeEvent.getChange('b.a');
      if (!addedChange) {
        throw new Error('Missing added change');
      }
      expect(addedChange.getNamespace()).toBe(namespaceName);
      expect(addedChange.getPropertyName()).toBe('b.a');
      expect(addedChange.getOldValue()).toBeUndefined();
      expect(addedChange.getNewValue()).toBe('3');
      expect(addedChange.getChangeType()).toBe(PropertyChangeType.ADDED);

      const deletedChange = changeEvent.getChange('a.b');
      if (!deletedChange) {
        throw new Error('Missing deleted change');
      }
      expect(deletedChange.getNamespace()).toBe(namespaceName);
      expect(deletedChange.getPropertyName()).toBe('a.b');
      expect(deletedChange.getOldValue()).toBe('');
      expect(deletedChange.getNewValue()).toBeUndefined();
      expect(deletedChange.getChangeType()).toBe(PropertyChangeType.DELETED);

      const modifiedChange = changeEvent.getChange('a.b.c');
      if (!modifiedChange) {
        throw new Error('Missing modified change');
      }
      expect(modifiedChange.getNamespace()).toBe(namespaceName);
      expect(modifiedChange.getPropertyName()).toBe('a.b.c');
      expect(modifiedChange.getOldValue()).toBe('2');
      expect(modifiedChange.getNewValue()).toBe('1');
      expect(modifiedChange.getChangeType()).toBe(PropertyChangeType.MODIFIED);

      propertiesConfig.removeListener(CHANGE_EVENT_NAME, handle);
      done();
    };
    propertiesConfig.addChangeListener(handle);
  } catch (error) {
    done(error);
  }
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse({
    'a.b.c': '1',
    'b.a': '3',
  }));
  propertiesConfig.loadAndUpdateConfig().then();
});

it('should throw request error', async () => {
  const error = new Error('Mock reject fetch config');
  mockRequest.fetchConfig.mockRejectedValueOnce(error);
  try {
    await propertiesConfig.loadAndUpdateConfig();
  } catch (e) {
    expect(e).toEqual(error);
  }
});

it('should update config and correctly', async () => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await propertiesConfig.loadAndUpdateConfig();
  const newConfig = {
    '1': 'a',
    '2': 'b'
  };
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(newConfig));
  await propertiesConfig.loadAndUpdateConfig();
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(newConfig)));
});

it('should parse success when fetch config return null', async () => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await propertiesConfig.loadAndUpdateConfig();
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initConfigs)));

  mockRequest.fetchConfig.mockResolvedValueOnce(null);
  await propertiesConfig.loadAndUpdateConfig();
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initConfigs)));
});
