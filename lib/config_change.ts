import { PropertyChangeType } from '../enums/property_change_types';
import { JSONValueType } from '../types/jsonType';

export class ConfigChange {
  constructor(
    private readonly namespaceName: string,
    private readonly propertyName: string,
    private readonly oldValue: void| string | JSONValueType,
    private readonly newValue: void | string | JSONValueType,
    private readonly changeType: PropertyChangeType,
  ) {
    this.namespaceName = namespaceName;
    this.propertyName = propertyName;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.changeType = changeType;
  }

  public getNamespace(): string {
    return this.namespaceName;
  }

  public getPropertyName(): string {
    return this.propertyName;
  }

  public getOldValue(): void | string | JSONValueType {
    return this.oldValue;
  }

  public getNewValue(): void | string | JSONValueType {
    return this.newValue;
  }

  public getChangeType(): PropertyChangeType {
    return this.changeType;
  }

}
