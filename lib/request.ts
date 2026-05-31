import fetch, { HeadersInit } from 'node-fetch';
import { ConfigInterface } from './configInterface.js';

export type ConfigUrlOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  namespaceName: string;
  releaseKey?: string;
  ip?: string;
  label?: string;
  messages?: NotificationMessages;
};

export type NotificationsUrlOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
};

export type ConfigQueryParam = {
  releaseKey?: string;
  ip?: string;
  label?: string;
  messages?: string;
};

export type Notification = {
  namespaceName: string;
  notificationId: number;
};

export type NotificationMessages = {
  details: {
    [key: string]: number;
  };
};

export type ConfigurationChange = {
  key?: string;
  propertyName?: string;
  changeType?: string;
  configurationChangeType?: string;
  oldValue?: string;
  newValue?: string;
};

export type LoadConfigResp<T> = {
  appId: string;
  cluster: string;
  namespaceName: string;
  configurations?: T;
  configurationChanges?: ConfigurationChange[];
  configSyncType?: string;
  releaseKey: string;
}

export class Request {
  public static formatConfigUrl(urlOptions: ConfigUrlOptions): string {
    const { appId, clusterName, namespaceName, configServerUrl, releaseKey, ip, label, messages } = urlOptions;
    const url = this.trimTrailingSlash(configServerUrl);
    const params: ConfigQueryParam = Object.create(null);
    if (releaseKey) {
      params.releaseKey = releaseKey;
    }
    if (ip) {
      params.ip = ip;
    }
    if (label) {
      params.label = label;
    }
    if (messages) {
      params.messages = JSON.stringify(messages);
    }
    const path = [
      appId,
      clusterName,
      namespaceName,
    ].map(encodeURIComponent).join('/');
    return this.appendQuery(`${url}/configs/${path}`, params);
  }

  public static async fetchConfig<T>(url: string, headers?: HeadersInit): Promise<LoadConfigResp<T> | null> {
    const response = await fetch(url, { headers });
    const status = response.status;
    const text = await response.text();
    if (status === 304) return null;
    if (status != 200) throw new Error(`Http request error: ${status}, ${response.statusText}`);
    if (!text) return null;
    return this.parseJSON<LoadConfigResp<T>>(url, status, text);
  }

  public static formatNotificationsUrl(options: NotificationsUrlOptions,
    configsMap: Map<string, ConfigInterface>): string {
    const { configServerUrl, appId, clusterName } = options;
    const url = this.trimTrailingSlash(configServerUrl);
    const notifications: Notification[] = [];
    const notificationMap: Map<string, number> = new Map();
    for (const config of configsMap.values()) {
      const namespaceName = config.getNamespaceName();
      const notificationId = config.getNotificationId();
      const currentNotificationId = notificationMap.get(namespaceName);
      if (currentNotificationId === undefined || notificationId < currentNotificationId) {
        notificationMap.set(namespaceName, notificationId);
      }
    }
    for (const [namespaceName, notificationId] of notificationMap) {
      notifications.push({
        namespaceName,
        notificationId,
      });
    }
    const strParams = this.stringify({
      appId: appId,
      cluster: clusterName,
      notifications: JSON.stringify(notifications),
    });
    return `${url}/notifications/v2?${strParams}`;
  }

  public static async fetchNotifications(url: string, headers?: HeadersInit): Promise<Notification[] | null> {
    const response = await fetch(url, { headers, timeout: 70000 });
    const status = response.status;
    const text = await response.text();
    if (status === 304) return null;
    if (status != 200) throw new Error(`Http request error: ${status}, ${response.statusText}`);
    if (!text) return null;
    return this.parseJSON<Notification[]>(url, status, text);
  }

  public static isIncrementalConfig<T>(loadConfigResp: LoadConfigResp<T>): boolean {
    const configSyncType = loadConfigResp.configSyncType || '';
    const normalizedConfigSyncType = configSyncType.replace(/[\s-]/g, '_').toUpperCase();
    return normalizedConfigSyncType.indexOf('INCREMENTAL') >= 0 ||
      (Array.isArray(loadConfigResp.configurationChanges) && loadConfigResp.configurations === undefined);
  }

  public static mergeConfigurationChanges(configurations: { [key: string]: string },
    configurationChanges: ConfigurationChange[] = []): { [key: string]: string } {
    const mergedConfigurations: { [key: string]: string } = {};
    for (const key of Object.keys(configurations)) {
      Object.defineProperty(mergedConfigurations, key, {
        value: configurations[key],
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    for (const configurationChange of configurationChanges) {
      const key = configurationChange.key !== undefined ? configurationChange.key : configurationChange.propertyName;
      if (key === undefined) {
        continue;
      }
      const changeType = configurationChange.changeType || configurationChange.configurationChangeType || '';
      const normalizedChangeType = changeType.toUpperCase();
      if (normalizedChangeType === 'DELETED' || normalizedChangeType === 'DELETE') {
        delete mergedConfigurations[key];
      } else if (configurationChange.newValue !== undefined) {
        Object.defineProperty(mergedConfigurations, key, {
          value: configurationChange.newValue,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      }
    }
    return mergedConfigurations;
  }

  private static trimTrailingSlash(url: string): string {
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  private static appendQuery(url: string, params: ConfigQueryParam): string {
    const strParams = this.stringify(params);
    return strParams ? `${url}?${strParams}` : url;
  }

  private static stringify(params: { [key: string]: string | undefined }): string {
    return Object.keys(params)
      .filter(key => params[key] !== undefined)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] as string)}`)
      .join('&');
  }

  private static parseJSON<T>(url: string, status: number, text: string): T {
    try {
      return JSON.parse(text);
    } catch (error) {
      const responseSnippet = text.length > 200 ? `${text.substring(0, 200)}...` : text;
      throw new Error(`Http response parse error: ${status}, ${url}, ${error}, body: ${responseSnippet}`);
    }
  }
}
