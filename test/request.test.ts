import { Request } from '../lib/request';
import * as http from 'http';

let server: http.Server;
const serverResponseBody = JSON.stringify({
  'key': 'value',
  'array': [1, 2, 3],
});

beforeAll((): Promise<void> => {
  return new Promise(resolve => {

    const hostname = '127.0.0.1';
    const port = 3000;

    server = http.createServer((req, res) => {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json;charset=UTF-8');
      res.end(serverResponseBody);
    });

    server.listen(port, hostname, () => {
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

it('should request successfully and get the correct response', async () => {
  const { error, response, body } = await Request.get('http://localhost:3000');
  expect(error).toBeNull();
  expect(response.statusCode).toBe(200);
  expect(body).toBe(serverResponseBody);
});
