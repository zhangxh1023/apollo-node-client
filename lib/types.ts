export type ConfigOptions = {
  configServerUrl: string;
  appId: string;
  clusterName: string;
  namespaceName: string;
  secret?: string;
}

export type ConfigRequestOptions = {
  ip?: string;
  label?: string;
}

export type ConfigContentType = {
  content?: string;
}
