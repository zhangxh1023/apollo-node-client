import { PropertyChangeType } from './constants';


export class ConfigChange<T> {
  constructor(
    private readonly namespaceName: string,
    private readonly propertyName: string,
    private readonly oldValue: undefined | T,
    private readonly newValue: undefined | T,
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

  public getOldValue(): undefined | T {
    return this.oldValue;
  }

  public getNewValue(): undefined | T {
    return this.newValue;
  }

  public getChangeType(): PropertyChangeType {
    return this.changeType;
  }

}
