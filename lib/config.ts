import { EventEmitter } from 'events';
import { Access, AuthHeader } from './access.js';
import { NOTIFICATION_ID_PLACEHOLDER } from './constants.js';
import { ConfigOptions, ConfigRequestOptions } from './types.js';
import { NotificationMessages, Request } from './request.js';

export abstract class Config extends EventEmitter {

  private releaseKey = '';

  private notificationId = NOTIFICATION_ID_PLACEHOLDER;

  private readonly requestOptions: ConfigRequestOptions;

  constructor(private readonly options: ConfigOptions, requestOptions: string | ConfigRequestOptions = {}) {
    super();
    this.options = options;
    this.requestOptions = this.normalizeRequestOptions(requestOptions);
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
    return this.requestOptions.ip;
  }

  protected getLabel(): undefined | string {
    return this.requestOptions.label;
  }

  public async loadAndUpdateConfig(notificationId?: number): Promise<void> {
    const url = Request.formatConfigUrl({
      ...this.getConfigOptions(),
      releaseKey: this.getReleaseKey(),
      ip: this.getIp(),
      label: this.getLabel(),
      messages: notificationId === undefined ? undefined : this.createNotificationMessages(notificationId),
    });
    let headers: AuthHeader | undefined;
    const secret = this.getSecret();
    if (secret) {
      headers = Access.createAccessHeader(this.getAppId(), url, secret);
    }
    return this._loadAndUpdateConfig(url, headers);
  }

  private createNotificationMessages(notificationId: number): NotificationMessages {
    const { appId, clusterName, namespaceName } = this.options;
    return {
      details: {
        [`${appId}+${clusterName}+${namespaceName}`]: notificationId,
      },
    };
  }

  private normalizeRequestOptions(options: string | ConfigRequestOptions): ConfigRequestOptions {
    if (typeof options === 'string') {
      return { ip: options };
    }
    return {
      ip: options.ip,
      label: options.label,
    };
  }

  abstract _loadAndUpdateConfig(url: string, headers: AuthHeader | undefined): Promise<void>
}
