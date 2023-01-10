import { EventEmitter } from 'stream';
import { Access, AuthHeader } from './access';
import { NOTIFICATION_ID_PLACEHOLDER } from './constants';
import { ConfigOptions } from './types';
import { Request } from './request';

export abstract class Config extends EventEmitter {

  private releaseKey = '';

  private notificationId = NOTIFICATION_ID_PLACEHOLDER;

  constructor(private readonly options: ConfigOptions, private readonly ip?: string) {
    super();
    this.options = options;
  }

  public getNamespaceName(): string {
    return this.options.namespaceName;
  }

  public getNotificationId(): number {
    return this.notificationId;
  }

  public setNotificationId(newNotificationId: number): void {
    this.notificationId = newNotificationId;
  }

  protected getConfigOptions(): ConfigOptions {
    return this.options;
  }

  protected getAppId(): string {
    return this.options.appId;
  }

  protected getSecret(): undefined | string {
    return this.options.secret;
  }

  protected getReleaseKey(): string {
    return this.releaseKey;
  }

  protected setReleaseKey(releaseKey: string): void {
    this.releaseKey = releaseKey;
  }

  protected getIp(): undefined | string {
    return this.ip;
  }

  public async loadAndUpdateConfig(): Promise<void> {
    const url = Request.formatConfigUrl({
      ...this.getConfigOptions(),
      releaseKey: this.getReleaseKey(),
      ip: this.getIp(),
    });
    let headers: AuthHeader | undefined;
    const secret = this.getSecret();
    if (secret) {
      headers = Access.createAccessHeader(this.getAppId(), url, secret);
    }
    return this._loadAndUpdateConfig(url, headers);
  }

  abstract _loadAndUpdateConfig(url: string, headers: AuthHeader | undefined): Promise<void>
}
