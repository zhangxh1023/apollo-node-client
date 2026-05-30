import { LoadConfigResp } from '../lib/request';
import { ConfigContentType } from '../lib/types';
import { PlainConfig } from '../lib/plain_config';
import { Request } from '../lib/request';
import { ConfigChangeEvent } from '../lib/config_change_event';
import { CHANGE_EVENT_NAME, PropertyChangeType } from '../lib/constants';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const actualRequest = jest.requireActual('../lib/request').Request;
mockRequest.isIncrementalConfig.mockImplementation(actualRequest.isIncrementalConfig);
mockRequest.mergeConfigurationChanges.mockImplementation(actualRequest.mergeConfigurationChanges);
const namespaceName = 'test.txt';
const mockResponse = (configs: string): LoadConfigResp<ConfigContentType> => {
  return {
    'appId': 'SampleApp',
    'cluster': 'default',
    'namespaceName': `${namespaceName}.txt`,
    'configurations': {
      'content': configs,
    },
    'releaseKey': '20200203154030-1dc524aa9a4a5974'
  };
};

const initConfigs = 'init config';

const configOptions = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName,
};

const plainConfig = new PlainConfig(configOptions, '0.0.0.0');

beforeAll(() => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  return plainConfig.loadAndUpdateConfig();
});

it('should return all the correct json configs', () => {
  expect(plainConfig.getAllConfig()).toStrictEqual(initConfigs);
});

it('should return the correct value and default value', () => {
  expect(plainConfig.getProperty('key')).toEqual(initConfigs);
});

it('should get the correct changeEvent', (done: jest.DoneCallback) => {
  try {
    const newConfigs = 'new configs';
    const handle = (changeEvent: ConfigChangeEvent<any>): void => {
      try {
        expect(changeEvent.getNamespace()).toBe(namespaceName);
        expect(changeEvent.changedKeys()).toEqual(['']);

        const modifiedChange = changeEvent.getChange('');
        if (!modifiedChange) {
          throw 'Missing added change';
        }
        expect(modifiedChange.getNamespace()).toBe(namespaceName);
        expect(modifiedChange.getPropertyName()).toBe('');
        expect(modifiedChange.getOldValue()).toEqual(initConfigs);
        expect(modifiedChange.getNewValue()).toEqual(newConfigs);
        expect(modifiedChange.getChangeType()).toBe(PropertyChangeType.MODIFIED);

        plainConfig.removeListener(CHANGE_EVENT_NAME, handle);
        done();
      } catch (error) {
        done(error);
      }
    };
    plainConfig.addChangeListener(handle);
    mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(newConfigs));
    plainConfig.loadAndUpdateConfig().then();
  } catch (error) {
    done(error);
  }
});

it('should not emit change event when content is unchanged', async () => {
  const noChangeConfig = new PlainConfig(configOptions);
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await noChangeConfig.loadAndUpdateConfig();

  const handle = jest.fn();
  noChangeConfig.addChangeListener(handle);
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await noChangeConfig.loadAndUpdateConfig();

  expect(handle).not.toHaveBeenCalled();
});

it('should apply incremental content response', async () => {
  const incrementalConfig = new PlainConfig(configOptions);
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await incrementalConfig.loadAndUpdateConfig();

  mockRequest.fetchConfig.mockResolvedValueOnce({
    appId: 'SampleApp',
    cluster: 'default',
    namespaceName,
    releaseKey: '20200203154031-1dc524aa9a4a5974',
    configSyncType: 'INCREMENTAL_SYNC',
    configurationChanges: [
      {
        key: 'content',
        changeType: 'MODIFIED',
        newValue: 'incremental config',
      },
    ],
  });
  await incrementalConfig.loadAndUpdateConfig();

  expect(incrementalConfig.getAllConfig()).toBe('incremental config');
});

it('should apply incremental content deletion', async () => {
  const incrementalConfig = new PlainConfig(configOptions);
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await incrementalConfig.loadAndUpdateConfig();

  const handle = jest.fn();
  incrementalConfig.addChangeListener(handle);
  mockRequest.fetchConfig.mockResolvedValueOnce({
    appId: 'SampleApp',
    cluster: 'default',
    namespaceName,
    releaseKey: '20200203154031-1dc524aa9a4a5974',
    configSyncType: 'INCREMENTAL_SYNC',
    configurationChanges: [
      {
        key: 'content',
        changeType: 'DELETED',
      },
    ],
  });
  await incrementalConfig.loadAndUpdateConfig();

  expect(incrementalConfig.getAllConfig()).toBeUndefined();
  expect(handle).toHaveBeenCalledTimes(1);
  const changeEvent = handle.mock.calls[0][0] as ConfigChangeEvent<string>;
  const change = changeEvent.getChange('');
  expect(change?.getChangeType()).toBe(PropertyChangeType.DELETED);
  expect(change?.getOldValue()).toBe(initConfigs);
  expect(change?.getNewValue()).toBeUndefined();
});

it('should throw request error', async () => {
  const error = new Error('Mock reject fetch config');
  mockRequest.fetchConfig.mockRejectedValueOnce(error);
  try {
    await plainConfig.loadAndUpdateConfig();
  } catch (e) {
    expect(e).toEqual(error);
  }
});

it('should parse success when fetch config return null', async () => {
  mockRequest.fetchConfig.mockResolvedValueOnce(mockResponse(initConfigs));
  await plainConfig.loadAndUpdateConfig();
  expect(plainConfig.getAllConfig()).toEqual(initConfigs);

  mockRequest.fetchConfig.mockResolvedValueOnce(null);
  await plainConfig.loadAndUpdateConfig();
  expect(plainConfig.getAllConfig()).toStrictEqual(initConfigs);
});
