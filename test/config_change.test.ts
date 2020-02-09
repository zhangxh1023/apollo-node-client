import { ConfigChange } from '../lib/config_change';
import { PropertyChangeType } from '../enums/property_change_types';

const configChange = new ConfigChange('application', 'key', 'oldValue', 'newValue', PropertyChangeType.MODIFIED);

it('should return the correct namespaceName', () => {
  expect(configChange.getNamespace()).toBe('application');
});

it('should return the correct propertyName', () => {
  expect(configChange.getPropertyName()).toBe('key');
});

it('should return the correct oldValue', () => {
  expect(configChange.getOldValue()).toBe('oldValue');
});

it('should return the correct newValue', () => {
  expect(configChange.getNewValue()).toBe('newValue');
});

it('should return the correct changeType', () => {
  expect(configChange.getChangeType()).toBe(PropertyChangeType.MODIFIED);
});
