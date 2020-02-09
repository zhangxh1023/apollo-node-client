import { LoadConfigService } from '../lib/load_config_service';
import { URL } from 'url';
import { Request } from '../lib/request';
import * as request from 'request';

const simpleUrl = LoadConfigService.formatLoadConfigUrl({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'test',
});

const releaseKey = '20200206xx-xx';
const ip = '0.0.0.1';
const urlWithQueryParams = LoadConfigService.formatLoadConfigUrl({
  configServerUrl: 'http://localhost:8080',
  appId: 'SampleApp',
  clusterName: 'default',
  namespaceName: 'test',
  releaseKey,
  ip,
});
const encodedUrlWithQueryParams = new URL(urlWithQueryParams);

it('should return the correct url', () => {
  expect(simpleUrl).toBe('http://localhost:8080/configs/SampleApp/default/test');
  expect(encodedUrlWithQueryParams.origin + encodedUrlWithQueryParams.pathname).toBe('http://localhost:8080/configs/SampleApp/default/test');
});

it('should get the correct query params', () => {
  expect(encodedUrlWithQueryParams.searchParams.get('releaseKey')).toBe(releaseKey);
  expect(encodedUrlWithQueryParams.searchParams.get('ip')).toBe(ip);
});

jest.mock('../lib/request');
const mockRequest = Request as jest.Mocked<typeof Request>;
const response = {
  error: null,
  response: { statusCode: 200 } as request.Response,
  body: 'xxxx',
};

it('should return correct value', () => {
  mockRequest.get.mockResolvedValue(response);
  expect(LoadConfigService.loadConfig(simpleUrl)).resolves.toEqual(response);
});
