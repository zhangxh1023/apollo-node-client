import * as request from 'request';
import { Request } from './request';
import { ConfigInterface } from './config';
import * as qs from 'qs';

export class LoadNotificationsService {
  public static formatLongPollUrl(options: {
    configServerUrl: string;
    appId: string;
    clusterName: string;
  }, configsMap: Map<string, ConfigInterface>): string {
    const configServerUrl = options.configServerUrl.endsWith('/') ? options.configServerUrl.substr(0, options.configServerUrl.length - 1) : options.configServerUrl;
    let url = `${configServerUrl}/notifications/v2`;
    const notifications: {
      namespaceName: string;
      notificationId: number;
    }[] = [];
    for (const config of configsMap.values()) {
      const temp = {
        namespaceName: config.getNamespaceName(),
        notificationId: config.getNotificationId(),
      };
      notifications.push(temp);
    }
    const strParams = qs.stringify({
      appId: options.appId,
      cluster: options.clusterName,
      notifications: JSON.stringify(notifications),
    });
    url = url + '?' + strParams;
    return url;
  }

  public static loadNotifications(url: string, options?: request.CoreOptions): Promise<{
    error: undefined | Error;
    response: request.Response;
    body: unknown;
  }> {
    return Request.get(url, options);
  }
}
