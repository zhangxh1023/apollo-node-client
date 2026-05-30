export type ConfigOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  namespaceName: string;
  secret?: string;
  label?: string;
  dataCenter?: string;
}

export type ConfigContentType = {
  content: string;
}
