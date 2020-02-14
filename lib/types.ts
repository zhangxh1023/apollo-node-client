export type JSONBaseType = string | number | boolean | null;

export type JSONArrayType = JSONBaseType[];

export type JSONType = {
  [key: string]: JSONBaseType | JSONArrayType | JSONType;
}

export type JSONValueType = JSONBaseType | JSONArrayType | JSONType;
