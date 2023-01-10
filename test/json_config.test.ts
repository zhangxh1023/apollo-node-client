import { JSONConfig, JSONValueType } from '../lib/json_config';
import { LoadConfigResp, Request } from '../lib/request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { CHANGE_EVENT_NAME, PropertyChangeType } from '../lib/constants';
import { ConfigContentType } from '../lib/types';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const namespaceName = 'test.json';
const mockResponse = (configs: JSONValueType): LoadConfigResp<ConfigContentType> => {
  return {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': `${namespaceName}.json`,
    'configurations': {
      'content': JSON.stringify(configs),
    },
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
};

const initConfigs = {
  strKey: 'string',
  objKey: {
    arrKey: [1, 2, 3],
    nullKey: null,
  },
  numberKey: 3,
};

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName,
};

const jsonConfig = new JSONConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  return jsonConfig.loadAndUpdateConfig();
});

it('should return all the correct json configs', () => {
  expect(jsonConfig.getAllConfig()).toStrictEqual(initConfigs);
});

it('should return the correct value and default value', () => {
  const defaultJsonValue = {
    default: ['defaultValue'],
  };
  const value1 = jsonConfig.getProperty('objKey.arrKey.none', defaultJsonValue);
  const value2 = jsonConfig.getProperty('objKey..arrKey', defaultJsonValue);
  const value3 = jsonConfig.getProperty('strKey.none', defaultJsonValue);
  expect(value1).toStrictEqual(defaultJsonValue);
  expect(value2).toStrictEqual(defaultJsonValue);
  expect(value3).toStrictEqual(defaultJsonValue);

  const value4 = jsonConfig.getProperty('strKey');
  const value5 = jsonConfig.getProperty('objKey');
  const value6 = jsonConfig.getProperty('objKey.arrKey');
  expect(value4).toStrictEqual(initConfigs.strKey);
  expect(value5).toStrictEqual(initConfigs.objKey);
  expect(value6).toStrictEqual(initConfigs.objKey.arrKey);
});

it('should get the correct changeEvent', (done: jest.DoneCallback) => {
  try {
    const handle = (changeEvent: ConfigChangeEvent<any>): void => {
      try {
        expect(changeEvent.getNamespace()).toBe(namespaceName);
        expect(changeEvent.changedKeys().sort()).toEqual(['objKey.nullKey', 'objKey.arrKey', 'addedKey', 'strKey'].sort());

        const addedChange = changeEvent.getChange('addedKey');
        if (!addedChange) {
          throw 'Missing added change';
        }
        expect(addedChange.getNamespace()).toBe(namespaceName);
        expect(addedChange.getPropertyName()).toBe('addedKey');
        expect(addedChange.getOldValue()).toBeUndefined();
        expect(addedChange.getNewValue()).toEqual([1]);
        expect(addedChange.getChangeType()).toBe(PropertyChangeType.ADDED);

        const deletedChange = changeEvent.getChange('objKey.nullKey');
        if (!deletedChange) {
          throw 'Missing deleted change';
        }
        expect(deletedChange.getNamespace()).toBe(namespaceName);
        expect(deletedChange.getPropertyName()).toBe('objKey.nullKey');
        expect(deletedChange.getOldValue()).toBe(null);
        expect(deletedChange.getNewValue()).toBeUndefined();
        expect(deletedChange.getChangeType()).toBe(PropertyChangeType.DELETED);

        const modifiedChange = changeEvent.getChange('objKey.arrKey');
        if (!modifiedChange) {
          throw 'Missing added change';
        }
        expect(modifiedChange.getNamespace()).toBe(namespaceName);
        expect(modifiedChange.getPropertyName()).toBe('objKey.arrKey');
        expect(modifiedChange.getOldValue()).toEqual([1, 2, 3]);
        expect(modifiedChange.getNewValue()).toEqual([1, 2, 3, 4]);
        expect(modifiedChange.getChangeType()).toBe(PropertyChangeType.MODIFIED);

        jsonConfig.removeListener(CHANGE_EVENT_NAME, handle);
        done();
      } catch (error) {
        done(error);
      }
    };
    jsonConfig.addChangeListener(handle);
    mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse({
      objKey: {
        arrKey: [1, 2, 3, 4]
      },
      numberKey: 3,
      addedKey: [1],
    }));
    jsonConfig.loadAndUpdateConfig().then();
  } catch (error) {
    done(error);
  }
});

it('should throw requets error', async () => {
  const error = new Error('Mock reject fetch config');
  mockRequest.fetchConfig.mockRejectedValueOnce(error);
  try {
    await jsonConfig.loadAndUpdateConfig();
  } catch (e) {
    expect(e).toEqual(error);
  }
});

it('should parse correctly when config type is a string', async () => {
  const stringValue = 'stringValue';
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(stringValue));
  await jsonConfig.loadAndUpdateConfig();
  expect(jsonConfig.getAllConfig()).toEqual(stringValue);
});
