import { JSONConfig } from '../lib/json_config';
import { Request } from '../lib/request';
import * as request from 'request';
import { JSONValueType } from '../lib/types';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../lib/property_change_types';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const mockResponse = (configs: JSONValueType): {
  error: void | Error;
  response: request.Response;
  body: unknown;
} => {
  const body = {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': 'application',
    'configurations': {
      'content': typeof configs === 'string' ? configs : JSON.stringify(configs),
    },
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
  return {
    error: undefined,
    response: { statusCode: 200 } as request.Response,
    body: JSON.stringify(body),
  };
};
const mockErrorResponse = {
  error: new Error('test error'),
  response: { statusCode: 500 } as request.Response,
  body: '',
};
const initResponse = {
  strKey: 'string',
  objKey: {
    arrKey: [1, 2, 3],
    nullKey: null,
  },
  numberKey: 3,
};
const mockInitResponse = mockResponse(initResponse);
const mockStringResponse = mockResponse('test config string');

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'application',
};

const jsonConfig = new JSONConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.get.mockResolvedValueOnce(mockInitResponse);
  return jsonConfig.loadAndUpdateConfig();
});

it('should return all the correct json configs', () => {
  expect(jsonConfig.getAllConfig()).toEqual(initResponse);
});

it('should return the correct value and default value', () => {
  const defaultJsonValue = {
    default: ['defaultValue'],
  };
  const value1 = jsonConfig.getProperty('objKey.arrKey.none', defaultJsonValue);
  const value2 = jsonConfig.getProperty('objKey..arrKey', defaultJsonValue);
  const value3 = jsonConfig.getProperty('strKey.none', defaultJsonValue);
  expect(value1).toEqual(defaultJsonValue);
  expect(value2).toEqual(defaultJsonValue);
  expect(value3).toEqual(defaultJsonValue);
});

it('should get the correct changeEvent', async (done: jest.DoneCallback) => {
  try {
    jsonConfig.addChangeListener((changeEvent: ConfigChangeEvent<any>) => {
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

        done();
      } catch (error) {
        done(error);
      }
    });
    mockRequest.get.mockResolvedValueOnce(mockResponse({
      objKey: {
        arrKey: [1, 2, 3, 4]
      },
      numberKey: 3,
      addedKey: [1],
    }));
    await jsonConfig.loadAndUpdateConfig();
  } catch (error) {
    done(error);
  }
});

it('should ignore request error', async () => {
  mockRequest.get.mockResolvedValueOnce(mockErrorResponse);
  await jsonConfig.loadAndUpdateConfig();
});

it('should parse correctly when config type is a string', async () => {
  const jsonConfig = new JSONConfig(configOptions, '0.0.0.0');
  mockRequest.get.mockResolvedValueOnce(mockStringResponse);
  await jsonConfig.loadAndUpdateConfig();
  const value = jsonConfig.getAllConfig();
  expect(value).toBe(JSON.parse(mockStringResponse.body as string).configurations.content);
});
