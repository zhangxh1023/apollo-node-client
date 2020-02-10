import * as request from 'request';

export class Request {
  public static get(url: string, options?: request.CoreOptions): Promise<{
    error: void | Error;
    response: request.Response;
    body: unknown;
  }> {
    return new Promise(resolve => {
      request.get(url, options, (error: Error, response: request.Response, body: unknown) => {
        resolve({ error, response, body });
      });
    });
  }
}
