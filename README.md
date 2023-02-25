# apollo-node-client
Node.js Client for [Apollo](https://github.com/ctripcorp/apollo)

## install
```bash
$ npm install apollo-node-client --save
```

## Examples
[examples](https://github.com/zhangxh1023/apollo-node-client/tree/master/examples)

## Usage

### 实例化 `ConfigService`

```javascript
const { ConfigService } = require('apollo-node-client');

const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  secret: 'cf86d564d10a46d4a5989dfdeed3a3a2'
});
```

### 获取默认 `namespace` 的配置（`application`）
```javascript
const config = await service.getAppConfig();
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `properties` 格式 `namespace` 的配置
```javascript
const config = await service.getConfig('application');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `json` 格式 `namespace` 的配置
```javascript
const config = await service.getConfig('config.json');
config.getAllConfig();                                          // { mysql: { user: 'root' } }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `xml/yml/yaml/txt` 格式 `namespace` 的配置
```javascript
const config = await service.getConfig('config.txt');
config.getAllConfig();                                          // txt config
console.log(config.getProperty('', 'default'));                 // txt config
console.log(config.getProperty());                              // txt config
```

### 指定灰度发布的服务 `ip`
```javascript
const config = await service.getConfig('application', '192.168.3.4');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 监听配置变化事件
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

## API

### Class: ConfigService

- new ConfigService( options )
  - `options` _\<Object>_
    - `configServerUrl` _\<string>_ Apollo 配置服务的地址
    - `appId` _\<string>_ 应用的 appId
    - `[clusterName]` _\<string>_ 集群名
    - `[secret]` _\<string>_ 服务端密钥 access key
  
  - Returns: _ConfigService_

- configService.getAppConfig( [ ip ] )
  - `[ip]` _\<string>_ 应用部署的机器ip

  - Returns: _Promise\<PropertiesConfig>_ 默认的 `namespace` 为 `application`

- configService.getConfig( namespaceName, [ ip ] )
  - `namespaceName` _\<string>_ Namespace的名字，以后缀名判断是什么类型格式的 `Config`。如果没有后缀名，默认为 `properties`，目前支持 `.json`，`.properties`，`.xml`，`.yml`， `.yaml`，`.txt`
  - `[ip]` _\<string>_ 应用部署的机器ip

  - Returns: _Promise\<PropertiesConfig | JSONConfig | PlainConfig>_

---

### Class: PropertiesConfig

- propertiesConfig.getAllConfig()

  - Returns: _Map\<string, string>_

- propertiesConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ 要获取的配置的 `key`
  - `[defaultValue]` _\<string>_ 默认值，当传入的 `key` 不存在时，会返回 `defaultValue`

  - Returns: _undefined | string_

- propertiesConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<string> ) => void_ 监听配置变化事件的回调函数

  - Returns: _void_

---

### Class: JSONConfig

- jsonConfig.getAllConfig()

  - Returns: _JSONValueType_

- jsonConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ 要获取的配置的 `key`
  - `[defaultValue]` _\<string>_ 默认值，当传入的 `key` 不存在时，会返回 `defaultValue`

  - Returns: _undefined | JSONValueType_

- jsonConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<JSONValueType> ) => void_ 监听配置变化事件的回调函数

  - Returns: _void_

---

### Class: PlainConfig

- plainConfig.getAllConfig()

  - Returns: _string_

- plainConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ 兼容其他类型的 _Config_，不做校验，传入任意 `key` 都会返回整个配置文本内容
  - `[defaultValue]` _\<string>_ 默认值，当配置不存在时，会返回 `defaultValue`

  - Returns: _undefined | string_

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

- configChange.getOldValues()

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
