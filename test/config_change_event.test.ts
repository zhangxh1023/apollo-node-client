import { ConfigChangeEvent } from '../lib/config_change_event';
import { ConfigChange } from '../lib/config_change';
import { PropertyChangeType } from '../lib/property_change_types';

const configChanges: Map<string, ConfigChange<string>> = new Map();
configChanges.set('key', new ConfigChange('application', 'key', 'oldValue', 'newValue', PropertyChangeType.MODIFIED));

const changeEvent = new ConfigChangeEvent('application', configChanges);

it('should return the correct namespaceName', () => {
  expect(changeEvent.getNamespace()).toBe('application');
});

it('should get the correct changedKeys', () => {
  expect(changeEvent.changedKeys().sort()).toEqual(['key'].sort());
});

it('should return configChange', () => {
  expect(changeEvent.getChange('key') instanceof ConfigChange).toBeTruthy();
});
