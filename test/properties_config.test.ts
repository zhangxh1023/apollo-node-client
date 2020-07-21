import { PropertiesConfig } from '../lib/properties_config';
import { Request } from '../lib/request';
import * as request from 'request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../lib/property_change_types';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const mockResponse = (configurations: {
  [key: string]: unknown;
}): {
  error: undefined | Error;
  response: request.Response;
  body: unknown;
} => {
  const body = {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': 'application',
    'configurations': configurations,
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
  return {
    error: undefined,
    response: { statusCode: 200 } as request.Response,
    body: JSON.stringify(body),
  };
};
const initResponse = {
  'a.b': '',
  'a.b.c': '2',
};
const mockInitResponse = mockResponse(initResponse);
const mockErrorResponse = {
  error: new Error('Mock network 500 error.'),
  response: { statusCode: 500 } as request.Response,
  body: '',
};

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'application',
};

const propertiesConfig = new PropertiesConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.get.mockResolvedValueOnce(mockInitResponse);
  return propertiesConfig.loadAndUpdateConfig();
});

it('should return all the correct properties configs', () => {
  expect(propertiesConfig.getAllConfig()).toEqual(new Map(Object.entries(initResponse)));
  expect(propertiesConfig.getProperty('a.b')).toBe(initResponse['a.b']);
});

it('should return the correct value and default value', () => {
  expect(propertiesConfig.getProperty('a.b')).toBe('');
  expect(propertiesConfig.getProperty('a.none', 'default value')).toBe('default value');
});

it('should get the correct changeEvent', async (done: jest.DoneCallback) => {
  try {
    propertiesConfig.addChangeListener((changeEvent: ConfigChangeEvent<string>) => {
      try {
        expect(changeEvent.getNamespace()).toBe('application');
        expect(changeEvent.changedKeys().sort()).toEqual(['a.b', 'a.b.c', 'b.a'].sort());

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

        done();
      } catch (error) {
        done(error);
      }
    });

    mockRequest.get.mockResolvedValueOnce(mockResponse({
      'a.b.c': '1',
      'b.a': '3',
    }));
    await propertiesConfig.loadAndUpdateConfig();
  } catch (error) {
    done(error);
  }
});

it('should ignore request error', async () => {
  mockRequest.get.mockResolvedValueOnce(mockErrorResponse);
  await propertiesConfig.loadAndUpdateConfig();
});

it('should update config and correctly', async () => {
  const propertiesConfig = new PropertiesConfig(configOptions, '0.0.0.0');
  mockRequest.get.mockResolvedValueOnce(mockInitResponse);
  await propertiesConfig.loadAndUpdateConfig();
  const newConfig = {
    '1': 'a',
    '2': 'b'
  };
  mockRequest.get.mockResolvedValueOnce(mockResponse(newConfig));
  await propertiesConfig.loadAndUpdateConfig();
  const config = propertiesConfig.getAllConfig();
  expect(config).toEqual(new Map(Object.entries(newConfig)));
});
