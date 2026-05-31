import { ConfigService } from 'apollo-node-client';

const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'apolloNodeClient',
  clusterName: 'default',
  secret: '4765dcd7334b4cef8435bb97d4b5bbca'
});

export default service;
