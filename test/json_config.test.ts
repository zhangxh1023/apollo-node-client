import { JSONConfig } from '../lib/json_config';
import { JSONConfigContentType, LoadConfigResp, Request } from '../lib/request';
import { JSONValueType } from '../lib/types';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../lib/property_change_types';
import { CHANGE_EVENT_NAME } from '../lib/constants';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const mockResponse = (configs: JSONValueType): LoadConfigResp<JSONConfigContentType> => {
  return {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': 'application',
    'configurations': {
      'content': JSON.stringify(configs),
    },
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
};

const initResp = {
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
  namespaceName: 'application',
};

const jsonConfig = new JSONConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initResp));
  return jsonConfig.loadAndUpdateConfig();
});

it('should return all the correct json configs', () => {
  expect(jsonConfig.getAllConfig()).toStrictEqual(initResp);
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
});

it('should get the correct changeEvent', (done: jest.DoneCallback) => {
  try {
    const handle = (changeEvent: ConfigChangeEvent<any>): void => {
      try {
        expect(changeEvent.getNamespace()).toBe('application');
        expect(changeEvent.changedKeys().sort()).toEqual(['objKey.nullKey', 'objKey.arrKey', 'addedKey', 'strKey'].sort());

        const addedChange = changeEvent.getChange('addedKey');
        if (!addedChange) {
          throw 'Missing added change';
        }
        expect(addedChange.getNamespace()).toBe('application');
        expect(addedChange.getPropertyName()).toBe('addedKey');
        expect(addedChange.getOldValue()).toBeUndefined();
        expect(addedChange.getNewValue()).toEqual([1]);
        expect(addedChange.getChangeType()).toBe(PropertyChangeType.ADDED);

        const deletedChange = changeEvent.getChange('objKey.nullKey');
        if (!deletedChange) {
          throw 'Missing deleted change';
        }
        expect(deletedChange.getNamespace()).toBe('application');
        expect(deletedChange.getPropertyName()).toBe('objKey.nullKey');
        expect(deletedChange.getOldValue()).toBe(null);
        expect(deletedChange.getNewValue()).toBeUndefined();
        expect(deletedChange.getChangeType()).toBe(PropertyChangeType.DELETED);

        const modifiedChange = changeEvent.getChange('objKey.arrKey');
        if (!modifiedChange) {
          throw 'Missing added change';
        }
        expect(modifiedChange.getNamespace()).toBe('application');
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

it('should ignore request error', async () => {
  mockRequest.fetchConfig.mockRejectedValueOnce(new Error('Mock reject fetch config'));
  expect(jsonConfig.loadAndUpdateConfig()).rejects.toThrow();
});

it('should parse correctly when config type is a string', async () => {
  const stringValue = 'stringValue';
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(stringValue));
  await jsonConfig.loadAndUpdateConfig();
  expect(jsonConfig.getAllConfig()).toEqual(stringValue);
});

it('should parse success when fetch config return null', async () => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initResp));
  await jsonConfig.loadAndUpdateConfig();
  expect(jsonConfig.getAllConfig()).toStrictEqual(initResp);

  mockRequest.fetchConfig.mockResolvedValueOnce(null);
  await jsonConfig.loadAndUpdateConfig();
  expect(jsonConfig.getAllConfig()).toStrictEqual(initResp);
});
