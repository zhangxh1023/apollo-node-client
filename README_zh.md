# apollo-node-client
用于 [Apollo](https://github.com/ctripcorp/apollo) 的 Node.js 客户端。

[English](./README.md) | 简体中文

> **v2.0+** 同时支持 CommonJS 和 ESM。1.x 仅支持 CommonJS。

## 安装
```bash
$ npm install apollo-node-client --save
```

## 示例
[examples](https://github.com/zhangxh1023/apollo-node-client/tree/master/examples)

## 使用方式

### 创建 `ConfigService`

CommonJS:
```javascript
const { ConfigService } = require('apollo-node-client');
```

ESM:
```javascript
import { ConfigService } from 'apollo-node-client';
```

然后创建实例：
```javascript
const service = new ConfigService({
  configServerUrl: 'http://localhost:8080/',
  appId: 'SampleApp',
  clusterName: 'default',
  secret: 'cf86d564d10a46d4a5989dfdeed3a3a2'
});
```

### 获取默认 `namespace` 配置（`application`）
```javascript
const config = await service.getAppConfig();
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `properties` 格式的 `namespace` 配置
```javascript
const config = await service.getConfig('application');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `json` 格式的 `namespace` 配置
```javascript
const config = await service.getConfig('config.json');
config.getAllConfig();                                          // { mysql: { user: 'root' } }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

### 获取 `xml/yml/yaml/txt` 格式的 `namespace` 配置
```javascript
const config = await service.getConfig('config.txt');
config.getAllConfig();                                          // txt config
console.log(config.getProperty('', 'default'));                 // txt config
console.log(config.getProperty());                              // txt config
```

### 指定灰度发布的 `ip` 或 `label`
```javascript
const config = await service.getConfig('application', '192.168.3.4');
config.getAllConfig();                                          // Map(1) { 'mysql.user' => 'root' }
console.log(config.getProperty('mysql.user'));                  // root
console.log(config.getProperty('mysql.missing', 'default'));    // default
```

为了向后兼容，第二个字符串参数仍会被作为服务器 `ip` 使用。
当你需要使用 `label`，或者同时使用 `ip` 和 `label` 时，请传入 options 对象：

```javascript
const labelConfig = await service.getConfig('application', {
  label: 'gray',
});

const ipAndLabelConfig = await service.getConfig('application', {
  ip: '192.168.3.4',
  label: 'gray',
});
```

配置会按照 `namespace`、`ip` 和 `label` 进行缓存。调用 `getConfig('application', '192.168.3.4')`
和 `getConfig('application', '192.168.3.5')` 会返回不同的配置实例。

### 监听配置变更事件
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

### 停止长轮询
```javascript
service.close();
```

`close()` 会停止后台长轮询，并清理 service 持有的缓存配置实例。
已有的 config 对象仍然可以读取最后一次加载到的值，但不会再继续更新。

## API

### Class: ConfigService

- new ConfigService( options )
  - `options` _\<Object>_
    - `configServerUrl` _\<string>_ Apollo 配置服务地址
    - `appId` _\<string>_ 应用 ID
    - `[clusterName]` _\<string>_ 集群名称
    - `[secret]` _\<string>_ 访问密钥 secret

  - 返回：_ConfigService_

- configService.getAppConfig( [ ipOrOptions ] )
  - `[ipOrOptions]` _\<string | Object>_ 服务器 IP 字符串，或灰度发布的请求选项
    - `[ip]` _\<string>_ 灰度发布使用的服务器 IP
    - `[label]` _\<string>_ Apollo 灰度发布使用的 label

  - 返回：_Promise\<PropertiesConfig>_ 默认 `namespace` 为 `application`

- configService.getConfig( namespaceName, [ ipOrOptions ] )
  - `namespaceName` _\<string>_ Namespace 名称。配置格式由文件扩展名决定；没有扩展名时默认为 `properties`。支持 `.json`、`.properties`、`.xml`、`.yml`、`.yaml`、`.txt`
  - `[ipOrOptions]` _\<string | Object>_ 服务器 IP 字符串，或灰度发布的请求选项
    - `[ip]` _\<string>_ 灰度发布使用的服务器 IP
    - `[label]` _\<string>_ Apollo 灰度发布使用的 label

  - 返回：_Promise\<PropertiesConfig | JSONConfig | PlainConfig>_

- configService.close()

  - 停止长轮询，并清理缓存的配置实例。

  - 返回：_void_

> 初始加载失败时会记录错误日志，但仍会返回配置实例。service 会继续保持长轮询，
> 因此后续 Apollo 成功响应后，仍然可以填充或更新该配置。

---

### Class: PropertiesConfig

- propertiesConfig.getAllConfig()

  - 返回：_Map\<string, string>_ 当前配置的一份副本。

- propertiesConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ 要获取的配置 key
  - `[defaultValue]` _\<string>_ 当 key 不存在时返回的默认值

  - 返回：_undefined | string_

- propertiesConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<string> ) => void_ 配置变更事件回调

  - 返回：_PropertiesConfig_

---

### Class: JSONConfig

- jsonConfig.getAllConfig()

  - 返回：_JSONValueType_ 当前配置的一份副本。

- jsonConfig.getProperty( key, [ defaultValue ] )
  - `key` _\<string>_ 要获取的配置 key
  - `[defaultValue]` _\<JSONValueType>_ 当 key 不存在时返回的默认值

  - 返回：_undefined | JSONValueType_

  - 使用以点号分隔的 key 进行对象遍历，例如 `mysql.user`。不会遍历数组索引。
    为了向后兼容，无效的 JSON namespace 内容会作为普通字符串返回。

- jsonConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<JSONValueType> ) => void_ 配置变更事件回调

  - 返回：_JSONConfig_

---

### Class: PlainConfig

- plainConfig.getAllConfig()

  - 返回：_string_

- plainConfig.getProperty( key, [ defaultValue ] )
  - `[key]` _\<string>_ 用于兼容其他配置类型。任意 key 都会返回完整配置文本
  - `[defaultValue]` _\<string>_ 当配置不存在时返回的默认值

  - 返回：_undefined | string_

- plainConfig.addChangeListener( handle )
  - `handle` _( changeEvent: ConfigChangeEvent\<string> ) => void_ 配置变更事件回调

  - 返回：_PlainConfig_

---

### Class: ConfigChangeEvent

- configChangeEvent.getNamespace()

  - 返回：_string_

- configChangeEvent.changedKeys()

  - 返回：_string[]_

- configChangeEvent.getChange()

  - 返回：_undefined | ConfigChange\<T>_

---

### Class: ConfigChange\<T>

- configChange.getNamespace()

  - 返回：_string_

- configChange.getPropertyName()

  - 返回：_string_

- configChange.getOldValue()

  - 返回：_undefined | T_

- configChange.getNewValue()

  - 返回：_undefined | T_

- configChange.getChangeType()

  - 返回：_PropertyChangeType_

---

### Enum: PropertyChangeType

- propertyChangeType.ADDED

- propertyChangeType.MODIFIED

- propertyChangeType.DELETED

---

## 参与贡献
欢迎提交贡献！

## 许可证
[MIT](https://github.com/zhangxh1023/apollo-node-client/blob/master/LICENSE)
