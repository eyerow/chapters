// utils.ts

type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
interface JSONObject {
  [key: string]: JSONValue;
}
interface JSONArray extends Array<JSONValue> {}

export const flattenJSON = (
  obj: JSONObject,
  parent = "",
  res: Record<string, JSONValue> = {}
): Record<string, JSONValue> => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = parent ? `${parent}.${key}` : key;
      const value = obj[key];

      if (value && typeof value === "object" && !Array.isArray(value)) {
        flattenJSON(value as JSONObject, propName, res);
      } else {
        res[propName] = value;
      }
    }
  }
  return res;
};
