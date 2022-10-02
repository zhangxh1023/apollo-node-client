import { Request } from '../lib/request';
import http from 'http';
import { URL } from 'url';
import { PropertiesConfig } from '../lib/properties_config';
import { JSONConfig } from '../lib/json_config';
import { NOTIFICATION_ID_PLACEHOLDER } from '../lib/constants';

const releaseKey = '20170430092936-dee2d58e74515ff3';
const ip = '0.0.0.1';
const configServerUrl = 'http://localhost:3000/';
const appId = 'SampleApp';
const clusterName = 'default';
const namespaceName1 = 'test';
const namespaceName2 = 'first.json';

const fetchConfigResp = {
  appId,
  cluster: clusterName,
  namespaceName: namespaceName1,
  configurations: {
    'portal.elastic.document.type': 'biz',
    'portal.elastic.cluster.name': 'hermes-es-fws'
  },
  releaseKey
};

const fetchNotificationsResp = [
  {
    namespaceName: namespaceName1,
    notificationId: 101
  },
  {
    namespaceName: namespaceName2,
    notificationId: 63
  }
];

const configOptions = {
  configServerUrl,
  appId,
  clusterName,
  namespaceName: namespaceName1,
};

const simpleConfigUrl = Request.formatConfigUrl({
  ...configOptions
});

const paramConfigUrl = Request.formatConfigUrl({
  ...configOptions,
  releaseKey,
  ip,
});

const notificationOptions = {
  configServerUrl,
  appId,
  clusterName,
};

const propertiesConfig = new PropertiesConfig({
  namespaceName: namespaceName1,
  ...notificationOptions
});

const jsonConfig = new JSONConfig({
  namespaceName: namespaceName2,
  ...notificationOptions
});

const configsMap = new Map();
configsMap.set(namespaceName1, propertiesConfig);
configsMap.set(namespaceName2, jsonConfig);

const simpleNotificationUrl = Request.formatNotificationsUrl(notificationOptions, new Map());

const paramNotificationUrl = Request.formatNotificationsUrl(notificationOptions, configsMap);

let mockHttpHandle: (req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {
  req: http.IncomingMessage;
}) => void;

let server: http.Server;
beforeAll((): Promise<void> => {
  return new Promise(resolve => {

    const hostname = '127.0.0.1';
    const port = 3000;

    server = http.createServer((req, res) => {
      mockHttpHandle(req, res);
    });

    server.listen(port, hostname, () => {
      resolve();
    });
  });
});

afterAll((): Promise<void> => {
  return new Promise(resolve => {
    server.close(() => {
      resolve();
    });
  });
});

describe('test config request', () => {
  describe('test format url', () => {
    it('should format the correct simple config url', () => {
      const simpleUrl = new URL(simpleConfigUrl);
      expect(simpleUrl.searchParams.get('releaseKey')).toBeNull();
      expect(simpleUrl.searchParams.get('ip')).toBeNull();
      expect(simpleUrl.origin + simpleUrl.pathname).toBe(`${configServerUrl}configs/SampleApp/default/test`);
    });

    it('should format the correct config url with params', () => {
      const paramUrl = new URL(paramConfigUrl);
      expect(paramUrl.searchParams.get('releaseKey')).toBe(releaseKey);
      expect(paramUrl.searchParams.get('ip')).toBe(ip);
      expect(paramUrl.origin + paramUrl.pathname).toBe(`${configServerUrl}configs/SampleApp/default/test`);
    });
  });

  describe('test http request', () => {
    it('should return correct config response', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.end(JSON.stringify(fetchConfigResp));
      };
      const resp = await Request.fetchConfig(paramConfigUrl);
      expect(resp).toStrictEqual(fetchConfigResp);
    });
    it('should throw server error', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 500;
        res.end(JSON.stringify(fetchConfigResp));
      };
      await expect(Request.fetchConfig(paramConfigUrl)).rejects.toThrowErrorMatchingInlineSnapshot('"Http request error: 500, Internal Server Error"');
    });
    it('should receive http headers', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        if (req.headers['header1'] != '1') res.statusCode = 500;
        res.end(JSON.stringify(fetchConfigResp));
      };
      const headers = {
        header1: '1'
      };
      await expect(Request.fetchConfig(paramConfigUrl, headers)).resolves.toStrictEqual(fetchConfigResp);
    });
  });
});

describe('test notification request', () => {
  describe('test format url', () => {
    it('should format the correct simple notification url', () => {
      const simpleUrl = new URL(simpleNotificationUrl);
      expect(simpleUrl.searchParams.get('notifications')).toBe('[]');
      expect(simpleUrl.origin + simpleUrl.pathname).toBe(`${configServerUrl}notifications/v2`);
    });

    it('should format the correct notification url with params', () => {
      const paramUrl = new URL(paramNotificationUrl);
      expect(JSON.parse(paramUrl.searchParams.get('notifications') || '').sort())
        .toEqual([
          {
            namespaceName: namespaceName1,
            notificationId: NOTIFICATION_ID_PLACEHOLDER
          },
          {
            namespaceName: namespaceName2,
            notificationId: NOTIFICATION_ID_PLACEHOLDER
          }
        ].sort());
      expect(paramUrl.origin + paramUrl.pathname).toBe(`${configServerUrl}notifications/v2`);
    });
  });

  describe('test http request', () => {
    it('should return correct notification response', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.end(JSON.stringify(fetchNotificationsResp));
      };
      const resp = await Request.fetchConfig(paramConfigUrl);
      expect(resp).toStrictEqual(fetchNotificationsResp);
    });
    it('should throw server error', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 500;
        res.end(JSON.stringify(fetchNotificationsResp));
      };
      await expect(Request.fetchConfig(paramConfigUrl)).rejects.toThrowErrorMatchingInlineSnapshot('"Http request error: 500, Internal Server Error"');
    });
    it('should receive http headers', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        if (req.headers['header1'] != '1') res.statusCode = 500;
        res.end(JSON.stringify(fetchNotificationsResp));
      };
      const headers = {
        header1: '1'
      };
      await expect(Request.fetchConfig(paramConfigUrl, headers)).resolves.toStrictEqual(fetchNotificationsResp);
    });
  });
});
