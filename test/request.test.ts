import { ConfigUrlOptions, NotificationsUrlOptions, Request } from '../lib/request';
import http from 'http';
import { URL } from 'url';
import { PropertiesConfig } from '../lib/properties_config';
import { JSONConfig } from '../lib/json_config';
import { NOTIFICATION_ID_PLACEHOLDER } from '../lib/constants';

const releaseKey = '20170430092936-dee2d58e74515ff3';
const ip = '0.0.0.1';
const label = 'gray';
let configServerUrl = 'http://127.0.0.1:3000/';
const appId = 'SampleApp';
const clusterName = 'default';
const namespaceName1 = 'test';
const namespaceName2 = 'first.json';
const notificationMessages = {
  details: {
    [`${appId}+${clusterName}+${namespaceName1}`]: 101,
  },
};

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

const getConfigOptions = (): ConfigUrlOptions => ({
  configServerUrl,
  appId,
  clusterName,
  namespaceName: namespaceName1,
});

const formatSimpleConfigUrl = (): string => Request.formatConfigUrl({
  ...getConfigOptions()
});

const formatParamConfigUrl = (): string => Request.formatConfigUrl({
  ...getConfigOptions(),
  releaseKey,
  ip,
  label,
  messages: notificationMessages,
});

const formatEncodedConfigUrl = (): string => Request.formatConfigUrl({
  ...getConfigOptions(),
  appId: 'Sample App',
  namespaceName: 'test/namespace',
});

const getNotificationOptions = (): NotificationsUrlOptions => ({
  configServerUrl,
  appId,
  clusterName,
});

const propertiesConfig = new PropertiesConfig({
  namespaceName: namespaceName1,
  configServerUrl,
  appId,
  clusterName,
});

const jsonConfig = new JSONConfig({
  namespaceName: namespaceName2,
  configServerUrl,
  appId,
  clusterName,
});

const configsMap = new Map();
configsMap.set(namespaceName1, propertiesConfig);
configsMap.set(namespaceName2, jsonConfig);

const formatSimpleNotificationUrl = (): string => Request.formatNotificationsUrl(getNotificationOptions(), new Map());

const formatParamNotificationUrl = (): string => Request.formatNotificationsUrl(getNotificationOptions(), configsMap);

let mockHttpHandle: (req: http.IncomingMessage, res: http.ServerResponse<http.IncomingMessage> & {
  req: http.IncomingMessage;
}) => void;

let server: http.Server;
beforeAll((): Promise<void> => {
  return new Promise((resolve, reject) => {

    const hostname = '127.0.0.1';

    server = http.createServer((req, res) => {
      mockHttpHandle(req, res);
    });

    server.on('error', reject);
    server.listen(0, hostname, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        configServerUrl = `http://${hostname}:${address.port}/`;
      }
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
      const simpleUrl = new URL(formatSimpleConfigUrl());
      expect(simpleUrl.searchParams.get('releaseKey')).toBeNull();
      expect(simpleUrl.searchParams.get('ip')).toBeNull();
      expect(simpleUrl.search).toBe('');
      expect(simpleUrl.origin + simpleUrl.pathname).toBe(`${configServerUrl}configs/SampleApp/default/test`);
    });

    it('should format the correct config url with params', () => {
      const paramUrl = new URL(formatParamConfigUrl());
      expect(paramUrl.searchParams.get('releaseKey')).toBe(releaseKey);
      expect(paramUrl.searchParams.get('ip')).toBe(ip);
      expect(paramUrl.searchParams.get('label')).toBe(label);
      expect(JSON.parse(paramUrl.searchParams.get('messages') || '')).toStrictEqual(notificationMessages);
      expect(paramUrl.origin + paramUrl.pathname).toBe(`${configServerUrl}configs/SampleApp/default/test`);
    });

    it('should encode config path segments', () => {
      const encodedUrl = new URL(formatEncodedConfigUrl());
      expect(encodedUrl.pathname).toBe('/configs/Sample%20App/default/test%2Fnamespace');
    });

    it('should encode query spaces as %20 for compatibility', () => {
      const url = Request.formatConfigUrl({
        ...getConfigOptions(),
        label: 'gray release',
      });
      expect(url).toContain('label=gray%20release');
      expect(url).not.toContain('gray+release');
    });
  });

  describe('test http request', () => {
    it('should return correct config response', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.end(JSON.stringify(fetchConfigResp));
      };
      const resp = await Request.fetchConfig(formatParamConfigUrl());
      expect(resp).toStrictEqual(fetchConfigResp);
    });
    it('should throw server error', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 500;
        res.end(JSON.stringify(fetchConfigResp));
      };
      await expect(Request.fetchConfig(formatParamConfigUrl())).rejects.toThrowErrorMatchingInlineSnapshot('"Http request error: 500, Internal Server Error"');
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
      await expect(Request.fetchConfig(formatParamConfigUrl(), headers)).resolves.toStrictEqual(fetchConfigResp);
    });
    it('should include context when config response is invalid json', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        res.end('not json');
      };
      await expect(Request.fetchConfig(formatParamConfigUrl())).rejects.toThrow(/Http response parse error: 200, .*body: not json/);
    });
  });
});

describe('test notification request', () => {
  describe('test format url', () => {
    it('should format the correct simple notification url', () => {
      const simpleUrl = new URL(formatSimpleNotificationUrl());
      expect(simpleUrl.searchParams.get('notifications')).toBe('[]');
      expect(simpleUrl.origin + simpleUrl.pathname).toBe(`${configServerUrl}notifications/v2`);
    });

    it('should format the correct notification url with params', () => {
      const paramUrl = new URL(formatParamNotificationUrl());
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
      const resp = await Request.fetchNotifications(formatParamNotificationUrl());
      expect(resp).toStrictEqual(fetchNotificationsResp);
    });
    it('should throw server error', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 500;
        res.end(JSON.stringify(fetchNotificationsResp));
      };
      await expect(Request.fetchNotifications(formatParamNotificationUrl())).rejects.toThrowErrorMatchingInlineSnapshot('"Http request error: 500, Internal Server Error"');
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
      await expect(Request.fetchNotifications(formatParamNotificationUrl(), headers)).resolves.toStrictEqual(fetchNotificationsResp);
    });
    it('should include context when notification response is invalid json', async () => {
      mockHttpHandle = (req, res): void => {
        res.statusCode = 200;
        res.end('not json');
      };
      await expect(Request.fetchNotifications(formatParamNotificationUrl())).rejects.toThrow(/Http response parse error: 200, .*body: not json/);
    });
  });
});

describe('test incremental config helpers', () => {
  it('should detect incremental config response', () => {
    expect(Request.isIncrementalConfig({
      appId,
      cluster: clusterName,
      namespaceName: namespaceName1,
      releaseKey,
      configSyncType: 'INCREMENTAL_SYNC',
      configurationChanges: [],
    })).toBeTruthy();
  });

  it('should merge incremental config changes', () => {
    expect(Request.mergeConfigurationChanges({
      key1: 'value1',
      key2: 'value2',
    }, [
      {
        key: 'key1',
        changeType: 'MODIFIED',
        newValue: 'value3',
      },
      {
        key: 'key2',
        changeType: 'DELETED',
      },
      {
        key: 'key3',
        changeType: 'ADDED',
        newValue: '',
      },
    ])).toStrictEqual({
      key1: 'value3',
      key3: '',
    });
  });

  it('should merge unsafe keys as own properties', () => {
    const mergedConfigurations = Request.mergeConfigurationChanges({}, [
      {
        key: '__proto__',
        changeType: 'ADDED',
        newValue: 'polluted',
      },
    ]);

    expect(Object.prototype.hasOwnProperty.call(mergedConfigurations, '__proto__')).toBeTruthy();
    expect(({} as any).polluted).toBeUndefined();
  });
});
