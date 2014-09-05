/**
 * Created by remelpugh on 9/3/2014.
 */
module Utilities {
    var hasOwnProperty: (v: string) => boolean = Object.prototype.hasOwnProperty;
    var nativeIsArray: (arg: any) => boolean = Array.isArray;
    var nativeKeys: (arg: any) => string[] = Object.keys;
    var toString: () => string = Object.prototype.toString;

    var createCallback = (func: Function, context: any): Function => {
        if (isUndefined(func)) {
            return func;
        }

        return function (value, index, collection) {
            return func.call(context, value, index, collection);
        };
    };

    /**
     * Check if an array contains an the given element.
     * @param array The array to be checked.
     * @param element The item to check if the array.
     * @returns True if the array contains the item, otherwise false.
     */
    export var contains = (array: any[], element: any): boolean => {
        return array.indexOf(element) >= 0;
    };

    /**
     * Returns the values from array that are not present in the other array.
     * @param source The source array.
     * @param check The array to check for differences
     * @returns An array containing the different elements.
     */
    export var difference = (source: any[], check: any[]): any[] => {
        return filter(source, (item: any) => {
            return !contains(check, item);
        });
    };

    /**
     * Loops through an array or array like object.
     * @param obj The object to be iterated over.
     * @param iterator
     * @param context
     */
    export var each = (obj: any, iterator: any, context?: any): void => {
        if (isNull(obj)) {
            return;
        }

        var i: number;
        var length: number = obj.length;
        var callback = createCallback(iterator, context);

        if (length === +length) {
            for (i = 0; i < length; i++) {
                callback(obj[i], i, obj);
            }
        }
        else {
            var properties = keys(obj);

            for (i = 0, length = properties.length; i < length; i++) {
                callback(obj[properties[i]], properties[i], obj);
            }
        }
    };

    /**
     * Creates a new array with all elements that pass the test implemented by the provided function.
     * @param array The array to be filtered.
     * @param predicate Function to test each element of the array.
     * @returns The new array containing the elements matching the test.
     */
    export var filter = (array: any[], predicate: (item: any) => boolean): any[] => {
        if (isArray(array)) {
            var filtered: any[] = [];

            for (var i: number = 0, length: number = array.length; i < length; i++) {
                var item: any = array[i];

                if (predicate(item) === true) {
                    filtered.push(item);
                }
            }

            return filtered;
        }

        return [];
    };

    /**
     * Check if a given object contains the specified property.
     *
     * @param obj The object to be checked.
     * @param key The property to be located.
     * @returns True if the property is found, otherwise false.
     */
    export var hasProperty = (obj: any, key: string): boolean => {
        return (obj !== null) && hasOwnProperty.call(obj, key);
    };

    /**
     * Check if a given object is an array.
     * @param obj The object to be checked.
     * @returns True if the object is an array, otherwise false.
     */
    export var isArray = (obj: any): boolean => {
        return (nativeIsArray) ? nativeIsArray(obj) : toString.call(obj) === "[object Array]";
    };

    /**
     * Check if a given array, string, or object is empty.
     * @param obj
     */
    export var isEmpty = (obj: any): boolean => {
        if (obj === null) {
            return true;
        }

        if (isArray(obj) || (typeof obj === "string")) {
            return obj.length === 0;
        }

        for (var key in obj) {
            //noinspection JSUnfilteredForInLoop
            if (hasProperty(obj, key)) {
                return false;
            }
        }

        return true;
    };

    /**
     * Check if a given object is a function.
     * @param obj The object to be checked.
     * @returns True if the object is a function, otherwise false.
     */
    export var isFunction = (obj: any): boolean => {
        return typeof obj === "function";
    };

    /**
     * Check if a given object is null.
     * @param obj The object to be checked.
     * @returns True if the object is null, otherwise false.
     */
    export var isNull = (obj: any): boolean => {
        return obj === null;
    };

    /**
     * Check if a given variable is an object.
     * @param obj The variable to be checked.
     * @returns True if the variable is an object, otherwise false.
     */
    export var isObject = (obj: any): boolean => {
        return typeof obj === "function" || typeof obj === "object";
    };

    /**
     * Check if a given object is a string.
     * @param obj The object to be checked.
     * @returns True if the object is a string, otherwise false.
     */
    export var isString = (obj: any): boolean => {
        return typeof obj === "string";
    };

    /**
     * Check if a given object is undefined.
     * @param obj The object to be checked.
     * @returns True if the object is undefined, otherwise false.
     */
    export var isUndefined = (obj: any): boolean => {
        return (typeof obj === "undefined");
    };

    /**
     * Retrieves all properties of a given object.
     * @param obj The objects whose properties will be returned.
     * @returns An array of property names.
     */
    export var keys = (obj: any): string[] => {
        if (!isObject(obj)) {
            return [];
        }

        return nativeKeys(obj);
    };

    /**
     * Merges the properties of the 
     * @param obj The object that the properties will merged into.
     * @param merging An array of objects whose properties will be merged into the original object.
     * @returns The newly modified object.
     */
    export var merge = (obj: any, ...merging: any[]): any => {
        if (!isObject(obj)) {
            return obj;
        }

        for (var i = 0, length = merging.length; i < length; i++) {
            var source: any = merging[i];

            for (var key in source) {
                //noinspection JSUnfilteredForInLoop
                if (hasOwnProperty.call(source, key)) {
                    try {
                        //noinspection JSUnfilteredForInLoop
                        if (typeof source[key].constructor === "object") {
                            //noinspection JSUnfilteredForInLoop
                            obj[key] = merge(obj[key], source[key]);
                        }
                        else {
                            //noinspection JSUnfilteredForInLoop
                            obj[key] = source[key];
                        }
                    }
                    catch (e) {
                        //noinspection JSUnfilteredForInLoop
                        obj[key] = source[key];
                    }
                }
            }
        }
    };
}

export = Utilities;