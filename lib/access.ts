import * as crypto from 'crypto';
import { URL } from 'url';

export class Access {

  public static DELIMITER = '\n';

  public static createAccessHeader(appId: string, url: string, secret: string): {
    Authorization: string;
    Timestamp: number;
  } {
    return this.createAccessHeaderByTimestamp(new Date().getTime(), appId, url, secret);
  }

  private static createAccessHeaderByTimestamp(timestamp: number, appId: string, url: string, secret: string): {
    Authorization: string;
    Timestamp: number;
  } {
    const accessHeader = {
      Authorization: '',
      Timestamp: timestamp,
    };
    const sign = this.signature(accessHeader.Timestamp, this.url2PathWithQuery(url), secret);
    accessHeader.Authorization = `Apollo ${appId}:${sign}`;
    return accessHeader;
  }

  private static signature(timestamp: number, pathWithQuery: string, secret: string): string {
    const hash = crypto.createHmac('sha1', secret);
    hash.update(timestamp + this.DELIMITER + pathWithQuery);
    return hash.digest('base64');
  }

  private static url2PathWithQuery(urlString: string): string {
    const url = new URL(urlString);
    return url.pathname + url.search;
  }
}
