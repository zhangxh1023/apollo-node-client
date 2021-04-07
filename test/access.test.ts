import { Access } from '../lib/access';

const appId = 'SampleApp';
const url = 'http://localhost:8080/notifications/v2?appId=SampleApp&cluster=default&notifications=%5B%7B%22namespaceName%22%3A%22application%22%2C%22notificationId%22%3A-1%7D%5D';
const secret = 'cf86d564d10a46d4a5989dfdeed3a3a2';

it('should return the correct access headers', () => {
  const headers = (Access as any).createAccessHeaderByTimestamp(1617795566349, appId, url, secret);
  expect(headers.Authorization).toBe('Apollo SampleApp:6VzjhD0wLAwRhyr4Rj/L7iwKK7Y=');
});
