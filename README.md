# apollo-node-client
Node.js Client for [Apollo](https://github.com/ctripcorp/apollo)

> **v2.0+** supports both CommonJS and ESM. 1.x only supports CommonJS.

## Install
```bash
$ npm install apollo-node-client --save
```

## Examples
[examples](https://github.com/zhangxh1023/apollo-node-client/tree/master/examples)

## Usage

### Create a `ConfigService`

CommonJS:
```javascript
const { ConfigService } = require('apollo-node-client');
```

ESM:
```javascript
import { ConfigService } from 'apollo-node-client';
```

Then create an instance:
```javascript
const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  secret: 'cf86d564d10a46d4a5989dfdeed3a3a2'
});
```

### Get the default `namespace` config (`application`)
```javascript
const config = await service.getAppConfig();
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### Get `properties` format `namespace` config
```javascript
const config = await service.getConfig('application');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### Get `json` format `namespace` config
```javascript
const config = await service.getConfig('config.json');
config.getAllConfig();                                          // { mysql: { user: 'root' } }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### Get `xml/yml/yaml/txt` format `namespace` config
```javascript
const config = await service.getConfig('config.txt');
config.getAllConfig();                                          // txt config
console.log(config.getProperty('', 'default'));                 // txt config
console.log(config.getProperty());                              // txt config
```

### Specify a canary release server `ip`
```javascript
const config = await service.getConfig('application', '192.168.3.4');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```
Configs are cached by `namespace` and `ip`. Calling `getConfig('application', '192.168.3.4')`
and `getConfig('application', '192.168.3.5')` returns different config instances.

### Specify `label` or `dataCenter`
```javascript
const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  label: 'gray',
  dataCenter: 'shanghai'
});
```

### Listen for config change events
```javascript
config.addChangeListener((changeEvent) => {
  for (const key of changeEvent.changedKeys()) {
    const change = changeEvent.getChange(key);
    if (change) {
      console.log(`namespace: ${change.getNamespace()},
        changeType: ${change.getChangeType()},
        propertyName: ${change.getPropertyName()},
        oldValue: ${change.getOldValue()},
        newValue: ${change.getNewValue()}`);
    }
  }
});
```

### Stop long polling
```javascript
service.close();
```
`close()` stops background long polling and clears cached config instances held by the service.
Existing config objects can still read their last loaded values, but they will no longer update.

## API

### Class: ConfigService

- new ConfigService( options )
  - `options` _\<Object>_
    - `configServerUrl` _\<string>_ Apollo config server URL
    - `appId` _\<string>_ Application ID
    - `[clusterName]` _\<string>_ Cluster name
    - `[secret]` _\<string>_ Access key secret
    - `[label]` _\<string>_ Apollo label for grayscale release
    - `[dataCenter]` _\<string>_ Apollo data center
  
  - Returns: _ConfigService_

- configService.getAppConfig( [ ip ] )
  - `[ip]` _\<string>_ Server IP for canary release

  - Returns: _Promise\<PropertiesConfig>_ Default `namespace` is `application`

- configService.getConfig( namespaceName, [ ip ] )
  - `namespaceName` _\<string>_ Namespace name. The config format is determined by the file extension. Defaults to `properties` if no extension. Supports `.json`, `.properties`, `.xml`, `.yml`, `.yaml`, `.txt`
  - `[ip]` _\<string>_ Server IP for canary release

  - Returns: _Promise\<PropertiesConfig | JSONConfig | PlainConfig>_

- configService.close()

  - Stops long polling and clears cached config instances.

  - Returns: _void_

> Initial load errors are logged and the config instance is still returned. The service keeps
> long polling, so later successful Apollo responses can still populate or update the config.

---

### Class: PropertiesConfig

- propertiesConfig.getAllConfig()

  - Returns: _Map\<string, string>_ A copy of the current configs.

- propertiesConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ Config key to retrieve
  - `[defaultValue]` _\<string>_ Default value returned when the key does not exist

  - Returns: _undefined | string_

- propertiesConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<string> ) => void_ Callback for config change events

  - Returns: _PropertiesConfig_

---

### Class: JSONConfig

- jsonConfig.getAllConfig()

  - Returns: _JSONValueType_ A copy of the current configs.

- jsonConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ Config key to retrieve
  - `[defaultValue]` _\<JSONValueType>_ Default value returned when the key does not exist

  - Returns: _undefined | JSONValueType_

  - Dot-separated keys are used for object traversal, for example `mysql.user`. Array indexes
    are not traversed. Invalid JSON namespace content is returned as a plain string for backward
    compatibility.

- jsonConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<JSONValueType> ) => void_ Callback for config change events

  - Returns: _JSONConfig_

---

### Class: PlainConfig

- plainConfig.getAllConfig()

  - Returns: _string_

- plainConfig.getProperty( key, [ defaultValue ] )
  - `[key]` _\<string>_ Compatible with other config types. Any key returns the entire config text
  - `[defaultValue]` _\<string>_ Default value returned when the config does not exist

  - Returns: _undefined | string_

- plainConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<string> ) => void_ Callback for config change events

  - Returns: _PlainConfig_

---

### Class: ConfigChangeEvent

- configChangeEvent.getNamespace()
  
  - Returns: _string_

- configChangeEvent.changedKeys()

  - Returns: _string[]_

- configChangeEvent.getChange()

  - Returns: _undefined | ConfigChange\<T>_

---

### Class: ConfigChange\<T>

- configChange.getNamespace()

  - Returns: _string_

- configChange.getPropertyName()

  - Returns: _string_

- configChange.getOldValue()

  - Returns: _undefined | T_

- configChange.getNewValue()

  - Returns: _undefined | T_

- configChange.getChangeType()

  - Returns: _PropertyChangeType_

---

### Enum: PropertyChangeType

- propertyChangeType.ADDED

- propertyChangeType.MODIFIED

- propertyChangeType.DELETED

---

## Contributing
Contributions are always welcome!

## License
[MIT](https://github.com/zhangxh1023/apollo-node-client/blob/master/LICENSE)
