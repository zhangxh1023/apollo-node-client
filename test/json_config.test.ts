import { JSONConfig } from '../lib/json_config';
import { Request } from '../lib/request';
import * as request from 'request';
import { JSONType } from '../types/jsonType';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../enums/property_change_types';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const mockResponse = (configs: JSONType): {
  error: Error;
  response: request.Response;
  body: unknown;
} => {
  const body = {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': 'application',
    'configurations': {
      'content': JSON.stringify(configs),
    },
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
  return {
    error: null,
    response: { statusCode: 200 } as request.Response,
    body: JSON.stringify(body),
  };
};

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'application',
};

const jsonConfig = new JSONConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.get.mockResolvedValueOnce(mockResponse({
    strKey: 'string',
    objKey: {
      arrKey: [1, 2, 3]
    },
    numberKey: 3,
  }));
  return jsonConfig.loadAndUpdateConfig();
});

it('should return the correct json configs', () => {
  expect(jsonConfig.getAllConfig()).toEqual({
    strKey: 'string',
    objKey: {
      arrKey: [1, 2, 3]
    },
    numberKey: 3,
  });
});

it('should get the correct changeEvent', async (done: jest.DoneCallback) => {
  try {
    jsonConfig.addChangeListener((changeEvent: ConfigChangeEvent) => {
      try {
        expect(changeEvent.getNamespace()).toBe('application');
        expect(changeEvent.changedKeys().sort()).toEqual(['strKey', 'objKey.arrKey', 'addedKey'].sort());

        const addedChange = changeEvent.getChange('addedKey');
        if (!addedChange) {
          throw 'Missing added change';
        }
        expect(addedChange.getNamespace()).toBe('application');
        expect(addedChange.getPropertyName()).toBe('addedKey');
        expect(addedChange.getOldValue()).toBeUndefined();
        expect(addedChange.getNewValue()).toEqual([1]);
        expect(addedChange.getChangeType()).toBe(PropertyChangeType.ADDED);

        const deletedChange = changeEvent.getChange('strKey');
        if (!deletedChange) {
          throw 'Missing deleted change';
        }
        expect(deletedChange.getNamespace()).toBe('application');
        expect(deletedChange.getPropertyName()).toBe('strKey');
        expect(deletedChange.getOldValue()).toBe('string');
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
