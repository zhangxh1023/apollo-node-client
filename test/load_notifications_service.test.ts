import { LoadNotificationsService } from '../lib/load_notifications_service';
import { ConfigInterface } from '../lib/config';
import { PropertiesConfig } from '../lib/properties_config';
import { JSONConfig } from '../lib/json_config';
import { URL } from 'url';
import { Request } from '../lib/request';
import * as request from 'request';

const options = {
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
};

const configsMap: Map<string, ConfigInterface> = new Map();
const config1 = new PropertiesConfig({
  namespaceName: 'test',
  ...options
});
const config2 = new JSONConfig({
  namespaceName: 'first.json',
  ...options
});
configsMap.set('test', config1);
configsMap.set('first.json', config2);

const url = LoadNotificationsService.formatLongPollUrl(options, configsMap);

const encodedUrl = new URL(url);

/**
 * difference configServerUrl
 */
const anotherOptions = {
  configServerUrl: 'http://localhost:8080',
  appId: 'SampleApp',
  clusterName: 'default',
};
const anotherUrl = LoadNotificationsService.formatLongPollUrl(anotherOptions, configsMap);
const anotherEncodeUrl = new URL(anotherUrl);

it('should return the correct origin', () => {
  expect(encodedUrl.origin).toBe('http://localhost:8080');
  expect(anotherEncodeUrl.origin).toBe('http://localhost:8080');
});

it('should return the correct pathname', () => {
  expect(encodedUrl.pathname).toBe('/notifications/v2');
  expect(anotherEncodeUrl.pathname).toBe('/notifications/v2');
});

it('should return the correct query params', () => {
  const strQueryParams = encodedUrl.searchParams.get('notifications');
  const notifications: {
    namespaceName: string;
    notificationId: number;
  }[] = JSON.parse(strQueryParams as string);
  expect(notifications.sort()).toEqual([{ namespaceName: 'test', notificationId: -1 }, { namespaceName: 'first.json', notificationId: -1 }].sort());
});

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const response = {
  error: undefined,
  response: { statusCode: 200 } as request.Response,
  body: 'xxxx',
};

it('should return the correct value', () => {
  mockRequest.get.mockResolvedValue(response);
  expect(LoadNotificationsService.loadNotifications(url)).resolves.toEqual(response);
});
