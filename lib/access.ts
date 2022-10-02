import * as crypto from 'crypto';
import { URL } from 'url';

export type AuthHeader = {
  Authorization: string;
  Timestamp: string;
};

export class Access {

  public static DELIMITER = '\n';

  public static createAccessHeader(appId: string, url: string, secret: string): AuthHeader {
    return this.createAccessHeaderByTimestamp(new Date().getTime(), appId, url, secret);
  }

  private static createAccessHeaderByTimestamp(timestamp: number, appId: string, url: string, secret: string): AuthHeader {
    const accessHeader = {
      Authorization: '',
      Timestamp: timestamp.toString(),
    };
    const sign = this.signature(accessHeader.Timestamp, this.url2PathWithQuery(url), secret);
    accessHeader.Authorization = `Apollo ${appId}:${sign}`;
    return accessHeader;
  }

  private static signature(timestamp: string, pathWithQuery: string, secret: string): string {
    const hash = crypto.createHmac('sha1', secret);
    hash.update(timestamp + this.DELIMITER + pathWithQuery);
    return hash.digest('base64');
  }

  private static url2PathWithQuery(urlString: string): string {
    const url = new URL(urlString);
    return url.pathname + url.search;
  }
}
