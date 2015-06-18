/**
 * Created by remelpugh on 9/3/2014.
 */
/// <reference path="../typings/tsd.d.ts" />
import HttpMethod = require("./HttpMethod");

module Utilities {
    /**
     * Replaces each format item in a specified string with the text equivalent of a corresponding object's value.
     * @param format The string to be formatted.
     * @param params The array of replacement values.
     * @returns {string}
     */
    export var formatString = (format: string, ...params: any[]): string => {
        var formatted: string = format;
        var index: number;
        var length: number;
        var regexp: RegExp;

        length = params.length;

        for (index = 0; index < length; index += 1) {
            var value: string = params[index];

            regexp = new RegExp("\\{(\\s)?" + index + "(\\s)?\\}", "gi");
            formatted = formatted.replace(regexp, value);
        }

        return formatted;
    };

    /**
     * Converts a JSON object into a url encoded string.
     * @param data The object to be converted.
     * @returns {string}
     */
    export var serialize = (data: any): string => {
        if (!_.isObject(data)) {
            return data;
        }

        if (_.isNull(data) || _.isUndefined(data)) {
            return "";
        }

        var parameters: string[] = [];

        _.each(data, (value: string, key: string) => {
            if (!_.isUndefined(value)) {
                var parameter = encodeURIComponent(key) + "=";

                parameter += encodeURIComponent((_.isObject(value)) ? JSON.stringify(value) : value);

                parameters.push(parameter);
            }
        });

        return parameters.join("&");
    };
}

export = Utilities;