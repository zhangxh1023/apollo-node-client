import { ConfigManager } from '../lib/config_manager';
import { Request } from '../lib/request';
import * as request from 'request';
import { URL } from 'url';

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;

const mockFn = (url: string): Promise<{
  error: Error;
  response: request.Response;
  body: unknown;
}> => {
  return new Promise(resolve => {
    const encodedURL = new URL(url);
    if (encodedURL.searchParams.get('notifications')) {
      const notifications: {
        namespaceName: string;
        notificationId: number;
      }[] = JSON.parse(encodedURL.searchParams.get('notifications'));
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
          error: null,
          response: { statusCode: 200 } as request.Response,
          body: JSON.stringify(res),
        });
      }
      setTimeout(() => {
        return resolve({
          error: null,
          response: { statusCode: 304 } as request.Response,
          body: '',
        });
      }, 60000);
    } else {
      return resolve({
        error: null,
        response: { statusCode: 304 } as request.Response,
        body: '',
      });
    }
  });
};

const configManager = new ConfigManager({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
});

beforeAll(() => {
  mockRequest.get.mockImplementation(mockFn);
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
  const config = await configManager.getConfig('test');
  expect(config.getNamespaceName()).toBe('test');
});
