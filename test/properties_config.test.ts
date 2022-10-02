import { PropertiesConfig } from '../lib/properties_config';
import { KVConfigContentType, LoadConfigResp, Request } from '../lib/request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../lib/property_change_types';
import { CHANGE_EVENT_NAME } from '../lib/constants';


jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const namespaceName = 'application';
const mockResponse = (configurations: KVConfigContentType): LoadConfigResp<KVConfigContentType> => {
  return {
    'appId': 'SampleApp',
    'cluster': 'default',
    namespaceName,
    'configurations': configurations,
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
};

const initResp = {
  'a.b': '',
  'a.b.c': '2',
};

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'application',
};

const propertiesConfig = new PropertiesConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initResp));
  return propertiesConfig.loadAndUpdateConfig();
});

it('should return all the correct properties configs', () => {
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initResp)));
  expect(propertiesConfig.getProperty('a.b')).toBe(initResp['a.b']);
  expect(propertiesConfig.getProperty('a.b.c')).toBe(initResp['a.b.c']);
});

it('should return the correct value and default value', () => {
  expect(propertiesConfig.getProperty('a.none', 'default value')).toBe('default value');
});

it('should get the correct changeEvent', (done: jest.DoneCallback): void => {
  try {
    const handle = (changeEvent: ConfigChangeEvent<string>): void => {
      expect(changeEvent.getNamespace()).toBe('application');
      expect(changeEvent.changedKeys().sort()).toStrictEqual(['a.b', 'a.b.c', 'b.a'].sort());

      const addedChange = changeEvent.getChange('b.a');
      if (!addedChange) {
        throw 'Missing added change';
      }
      expect(addedChange.getNamespace()).toBe('application');
      expect(addedChange.getPropertyName()).toBe('b.a');
      expect(addedChange.getOldValue()).toBeUndefined();
      expect(addedChange.getNewValue()).toBe('3');
      expect(addedChange.getChangeType()).toBe(PropertyChangeType.ADDED);

      const deletedChange = changeEvent.getChange('a.b');
      if (!deletedChange) {
        throw 'Missing deleted change';
      }
      expect(deletedChange.getNamespace()).toBe('application');
      expect(deletedChange.getPropertyName()).toBe('a.b');
      expect(deletedChange.getOldValue()).toBe('');
      expect(deletedChange.getNewValue()).toBeUndefined();
      expect(deletedChange.getChangeType()).toBe(PropertyChangeType.DELETED);

      const modifiedChange = changeEvent.getChange('a.b.c');
      if (!modifiedChange) {
        throw 'Missing modified change';
      }
      expect(modifiedChange.getNamespace()).toBe('application');
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
  mockRequest.fetchConfig.mockRejectedValueOnce(new Error('Mock reject fetch config'));
  expect(propertiesConfig.loadAndUpdateConfig()).rejects.toThrow();
});

it('should update config and correctly', async () => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initResp));
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
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initResp));
  await propertiesConfig.loadAndUpdateConfig();
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initResp)));

  mockRequest.fetchConfig.mockResolvedValueOnce(null);
  await propertiesConfig.loadAndUpdateConfig();
  expect(propertiesConfig.getAllConfig()).toStrictEqual(new Map(Object.entries(initResp)));
});
