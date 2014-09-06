/**
 * Created by remelpugh on 9/3/2014.
 */
/// <reference path="../typings/tsd.d.ts" />

module Utilities {
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
                parameters.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }
        });

        return parameters.join("&");
    };
}

export = Utilities;