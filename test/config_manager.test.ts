import { ConfigManager } from '../lib/config_manager';
import { Request } from '../lib/request';
import * as request from 'request';
import { URL } from 'url';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;

const mockFn = (url: string): Promise<{
  error: void | Error;
  response: request.Response;
  body: unknown;
}> => {
  return new Promise(resolve => {
    const encodedURL = new URL(url);
    if (encodedURL.searchParams.get('notifications')) {
      const notifications: {
        namespaceName: string;
        notificationId: number;
      }[] = JSON.parse(encodedURL.searchParams.get('notifications') as string);
      const res: {
        namespaceName: string;
        notificationId: number;
      }[] = [];
      for (const item of notifications) {
        if (item.notificationId === -1) {
          res.push({
            namespaceName: item.namespaceName,
            notificationId: 1,
          });
        }
      }
      if (res.length > 0) {
        return resolve({
          error: undefined,
          response: { statusCode: 200 } as request.Response,
          body: JSON.stringify(res),
        });
      }
      setTimeout(() => {
        return resolve({
          error: undefined,
          response: { statusCode: 304 } as request.Response,
          body: '',
        });
      }, 60000);
    } else {
      return resolve({
        error: undefined,
        response: { statusCode: 304 } as request.Response,
        body: '',
      });
    }
  });
};

const mockErrorFn = (): Promise<{
  error: void | Error;
  response: request.Response;
  body: unknown;
}> => {
  return new Promise(resolve => {
    return resolve({
      error: new Error('test Error'),
      response: { statusCode: 500 } as request.Response,
      body: '',
    });
  });
};

const configManager = new ConfigManager({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
});

afterAll(() => {
  return new Promise(resolve => {
    setTimeout(resolve, 1000);
  });
});

it('should throw Error with not support', () => {
  expect(configManager.getConfig('test.xml')).rejects.toThrowError(/XML/);
  expect(configManager.getConfig('test.yml')).rejects.toThrowError(/YML/);
  expect(configManager.getConfig('test.yaml')).rejects.toThrowError(/YAML/);
  expect(configManager.getConfig('test.txt')).rejects.toThrowError(/TXT/);
});

it('should return a properties config', async () => {
  mockRequest.get.mockImplementationOnce(mockFn);
  const config1 = await configManager.getConfig('test');
  const config2 = await configManager.getConfig('test.properties');
  expect(config1.getNamespaceName()).toBe('test');
  expect(config2.getNamespaceName()).toBe('test');
});

it('should return a json config', async () => {
  mockRequest.get.mockImplementationOnce(mockFn);
  const config = await configManager.getConfig('test.json');
  expect(config.getNamespaceName()).toBe('test.json');
});

it('should ignore the request error', async() => {
  mockRequest.get.mockImplementationOnce(mockErrorFn);
  await configManager.getConfig('errorConfig');
});
