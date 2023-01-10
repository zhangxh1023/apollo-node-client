export const NAMESPACE_APPLICATION = 'application';

export const CLUSTER_NAME_DEFAULT = 'default';

export const CLUSTER_NAMESPACE_SEPARATOR = '+';

export const APOLLO_CLUSTER_KEY = 'apollo.cluster';

export const APOLLO_META_KEY = 'apollo.meta';

export const CONFIG_FILE_CONTENT_KEY = 'content';

export const NO_APPID_PLACEHOLDER = 'ApolloNoAppIdPlaceHolder';

export const NOTIFICATION_ID_PLACEHOLDER = -1;

export const CHANGE_EVENT_NAME = 'change';

export enum ConfigTypes {
  PROPERTIES = 'properties',
  XML = 'xml',
  JSON = 'json',
  YML = 'yml',
  YAML = 'yaml',
  TXT = 'txt',
}

export enum PropertyChangeType {
  ADDED = 'ADDED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED',
}
