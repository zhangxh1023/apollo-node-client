import * as qs from 'qs';
import * as request from 'request';
import { Request } from './request';

export class LoadConfigService {
  public static formatLoadConfigUrl(options: {
    configServerUrl: string;
    appId: string;
    clusterName: string;
    namespaceName: string;
    releaseKey?: string;
    ip?: string;
  }): string {
    const configServerUrl = options.configServerUrl.endsWith('/') ? options.configServerUrl.substr(0, options.configServerUrl.length - 1) : options.configServerUrl;
    let url = `${configServerUrl}/configs/${options.appId}/${options.clusterName}/${options.namespaceName}`;
    if (options.releaseKey && options.ip) {
      const params: {
        [key: string]: string;
      } = Object.create(null);
      if (options.releaseKey) {
        params.releaseKey = options.releaseKey;
      }
      if (options.ip) {
        params.ip = options.ip;
      }
      const strParams = qs.stringify(params);
      url = url + '?' + strParams;
    }
    return url;
  }

  public static loadConfig(url: string, options?: request.CoreOptions): Promise<{
    error: void | Error;
    response: request.Response;
    body: unknown;
  }> {
    return Request.get(url, options);
  }

}
