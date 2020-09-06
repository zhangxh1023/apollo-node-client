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
});
```

### 获取默认 `namespace` 的配置（`application`）
```javascript
const config = await service.getAppConfig();
config.getAllConfig();
```

### 获取 `properties` 格式 `namespace` 的配置
```javascript
const config = await service.getConfig('application');
config.getAllConfig();
```

### 获取 `json` 格式 `namespace` 的配置
```javascript
const config = await service.getConfig('config.json');
config.getAllConfig();
```

### 指定灰度发布的服务 `ip`
```javascript
const config = await service.getConfig('application', '192.168.3.4');
config.getAllConfig();
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
