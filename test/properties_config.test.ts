import { PropertiesConfig } from '../lib/properties_config';
import { Request } from '../lib/request';
import * as request from 'request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { PropertyChangeType } from '../enums/property_change_types';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const mockResponse = (configurations: {
  [key: string]: unknown;
}): {
  error: Error;
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

const propertiesConfig = new PropertiesConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.get.mockResolvedValueOnce(mockResponse({
    'a.b': '1',
    'a.b.c': '2'
  }));
  return propertiesConfig.loadAndUpdateConfig();
});

it('should return the correct properties configs', () => {
  expect(propertiesConfig.getAllConfig()).toEqual(new Map([
    ['a.b', '1'],
    ['a.b.c', '2'],
  ]));
  expect(propertiesConfig.getProperty('a.b')).toBe('1');
});

it('should get the correct changeEvent', async (done: jest.DoneCallback) => {
  try {
    propertiesConfig.addChangeListener((changeEvent: ConfigChangeEvent) => {
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
        expect(deletedChange.getOldValue()).toBe('1');
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
