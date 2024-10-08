// utils.ts

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject {
  [key: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}

export const flattenJSON = (
  obj: JSONObject | JSONArray,
  parent = "",
  res: Record<string, JSONValue> = {}
): Record<string, JSONValue> => {
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const propName = `${parent}[${index}]`;
      if (item && typeof item === "object") {
        flattenJSON(item as JSONObject, propName, res);
      } else {
        res[propName] = item;
      }
    });
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = parent ? `${parent}.${key}` : key;
        const value = obj[key];

        if (value && typeof value === "object") {
          flattenJSON(value as JSONObject, propName, res);
        } else {
          res[propName] = value;
        }
      }
    }
  }
  return res;
};

export interface NestedTranslation {
  [key: string]: any;
}

export const unflattenJSON = (data: Record<string, any>): NestedTranslation => {
  const result: NestedTranslation = {};

  for (const flatKey in data) {
    const value = data[flatKey];
    const keys = flatKey
      .replace(/\[(\w+)\]/g, ".$1") // Convert [key] to .key
      .split("."); // Split on '.'

    keys.reduce((acc, key, index) => {
      if (!acc[key]) {
        acc[key] =
          index === keys.length - 1
            ? value
            : isNaN(Number(keys[index + 1]))
            ? {}
            : [];
      }
      return acc[key];
    }, result);
  }

  return result;
};
