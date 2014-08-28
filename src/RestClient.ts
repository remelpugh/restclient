/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/vow/vow.d.ts" />
import IAjaxOptions = require("IAjaxOptions");
import IErrorResponse = require("IErrorResponse");
import ISchemaDefinition = require("ISchemaDefinition");
import ISortOrder = require("ISortOrder");
import HeaderNameValue = require("HeaderNameValue");
import HttpMethod = require("HttpMethod");
import RestClientConfig = require("RestClientConfig");
import RestClientOptions = require("RestClientOptions");
import Schema = require("Schema");

// third party libraries
import _ = require("lodash");
import vow = require("vow");

class RestClient {
    cache: Storage = window.localStorage;
    config: RestClientConfig;
    defaultAjaxOptions: IAjaxOptions;
    defaultHeaders: HeaderNameValue[];
    headers: HeaderNameValue[];
    schema: Schema;

    constructor(clientOptions: RestClientOptions) {
        var options: RestClientOptions = clientOptions;

        this.config = options.config;
        this.schema = options.schema;
        this.headers = options.headers;

        this.defaultHeaders = [
            {
                name: "Accept-Encoding",
                value: "gzip"
            }
        ];
        _.defaults(this.headers, this.defaultHeaders);

        this.defaultAjaxOptions = {
            contentType: "application/json",
            headers: this.headers
        };
        this.parseSchema();
    }

    ajax(url: string, httpMethod: HttpMethod, options: IAjaxOptions = {}): vow.Promise {
        var cacheData: boolean = this.config.cacheData;
        var cacheKey: string;
        var method: string;
        var schemaDefinition: ISchemaDefinition;

        _.defaults(options, this.defaultAjaxOptions);

        if (!_.isEmpty(options.data) && httpMethod === HttpMethod.Get) {
            var query: string = RestClient.serialize(options.data);

            url = url + '?' + query;
        }

        if (cacheData) {
            cacheKey = "RestClient_" + url;
        }

        if (!_.isEmpty(options.schemaDefinition)) {
            schemaDefinition = this.schema[options.schemaDefinition];
        }

        switch (httpMethod) {
            case HttpMethod.Delete:
                method = "DELETE";
                break;
            case HttpMethod.Get:
                method = "GET";
                break;
            case HttpMethod.Post:
                method = "POST";
                break;
            case HttpMethod.Put:
                method = "PUT";
                break;
        }

        var parseData = (data: string): any => {
            var isSchemaDefined: boolean = !_.isUndefined(schemaDefinition);
            var parsed: any = JSON.parse(data);

            if (isSchemaDefined) {
                if (_.isFunction(schemaDefinition.parse)) {
                    parsed = schemaDefinition.parse(parsed);
                }
                if (!_.isUndefined(schemaDefinition.sort) && _.isArray(parsed)) {
                    var sort: any = schemaDefinition.sort;

                    if (!_.isArray(sort)) {
                        sort = [sort];
                    }

                    _.each(sort, (order: ISortOrder) => {
                        parsed.sort((a: any, b: any) => {
                            var dir: number = (order.direction.toLowerCase() === "asc") ? 1 : -1;
                            var field = order.field;

                            if (a[field] < b[field]) {
                                return dir * -1;
                            }
                            if (a[field] > b[field]) {
                                return dir;
                            }

                            return 0;
                        });
                    });
                }
            }

            return parsed;
        };

        return new vow.Promise((resolve, reject, notify) => {
            var errorResponse: IErrorResponse;

            if (cacheData) {
                // attempt to retrieve data from cache
                try {
                    resolve(parseData(this.cache.getItem(cacheKey)));

                    return;
                }
                catch (e) {
                    // swallow error and continue to retrieve from server
                    notify("Failed to retrieve data from cache, contacting server");
                }
            }

            var request = RestClient.createXmlHttpRequest(method, url);

            if (_.isNull(request)) {
                reject(new Error("Failed to create a connection to the server."));

                return;
            }

            request.onerror = () => {
                errorResponse = {
                    errors: ["Unable to send request to " + url]
                };

                reject(errorResponse);
            };

            request.onload = () => {
                var status: number = request.status;

                switch (status) {
                    case 500:
                        errorResponse = {
                            errors: ["Unexpected error."]
                        };
                        break;
                    case 404:
                        errorResponse = {
                            errors: ["Data not found"]
                        };
                        break;
                    case 400:
                        errorResponse = JSON.parse(request.responseText);
                        break;
                    default:
                        // status 200 OK, 201 CREATED, 20* ALL OK
                        if ((status >= 200 && status <= 299) || status === 304) {
                            try {
                                if (this.config.cacheData && httpMethod === HttpMethod.Get) {
                                    this.cache.setItem(cacheKey, request.responseText);
                                }

                                resolve(parseData(request.responseText));
                            }
                            catch (ex) {
                                errorResponse = {
                                    errors: ["Invalid JSON"]
                                };

                                reject(errorResponse);
                            }
                        }
                        break;
                }
                //// status 200 OK, 201 CREATED, 20* ALL OK
                //if ((status >= 200 && status <= 299) || status === 304) {
                //    try {
                //        if (this.config.cacheData && httpMethod === HttpMethod.Get) {
                //            this.cache.setItem(cacheKey, request.responseText);
                //        }

                //        resolve(parseData(request.responseText));
                //    }
                //    catch (ex) {
                //        reject(new Error("Invalid JSON\n" + ex));
                //    }
                //}
                //else if (status === 404) {
                //    reject(new Error("Unable to find the endpoint: " + url));
                //}
                //else {
                //    reject(new Error("Request failed with status code " + status + "\n" + request.statusText));
                //}
            };

            if (!_.isEmpty(options.contentType)) {
                request.setRequestHeader("content-type", options.contentType);
            }

            if (!_.isEmpty(options.headers)) {
                var headers: HeaderNameValue[] = options.headers;

                headers = headers || [];

                _.each(headers, (header: HeaderNameValue) => {
                    request.setRequestHeader(header.name, header.value);
                });
            }

            request.send(httpMethod === HttpMethod.Get ? null : options.data);
        });
    }

    get(url: string, options: IAjaxOptions = {}): vow.Promise {
        return this.ajax(this.getUri(url), HttpMethod.Get, options);
    }

    post(url: string, data: any, options: IAjaxOptions = {}): vow.Promise {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Post, settings);
    }

    put(url: string, data: any, options: IAjaxOptions = {}): vow.Promise {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Put, settings);
    }

    remove(url: string, data: any, options: IAjaxOptions = {}): vow.Promise {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Delete, options);
    }

    updateSchema(schema: Schema) {
        var currentKeys: string[] = _.keys(this.schema);
        var newKeys: string[] = _.keys(schema);
        var remove: string[] = _.difference(currentKeys, newKeys);

        _.each(remove, (key: string) => {
            delete this[key];
        });

        this.schema = schema;
        this.parseSchema();
    }

    static createXmlHttpRequest(method: string, url: string): XMLHttpRequest {
        var xhr: any = new XMLHttpRequest();

        if ("withCredentials" in xhr) {
            // Check if the XMLHttpRequest object has a "withCredentials" property. "withCredentials" only exists
            // on XMLHTTPRequest2 objects.
            xhr.open(method, url, true);
        }
        else if (typeof XDomainRequest != "undefined") {
            // Otherwise, check if XDomainRequest. XDomainRequest only exists in IE, and is IE's way of making
            // CORS requests.
            xhr = new XDomainRequest();
            xhr.open(method, url, true);
        }
        else {
            // Otherwise, CORS is not supported by the browser.
            xhr = null;
        }

        return xhr;
    }

    static serialize(data: any): string {
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
    }

    private static formatString(format: string, ...params: string[]): string {
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
    }

    private getUri(uri: any): string {
        if (_.isString(uri)) {
            if (uri.indexOf("/") === 0) {
                return this.config.baseApiUri + uri;
            }

            return uri;
        }

        if (_.isObject(uri)) {
            return this.config.baseApiUri + uri.url;
        }

        return this.config.baseApiUri;
    }

    private parseSchema() {
        var schema: Schema = this.schema;

        if (schema === undefined || schema === null) {
            return;
        }

        _.each(schema, (definition: any, key: string) => {
            var args: string[] = definition.args || [];
            var method: HttpMethod = definition.method || HttpMethod.Get;
            var script: string[] = [];
            var url = this.getUri(definition);
            var i: number;
            var length: number;

            if (args.length === 0) {
                var getScript: string[];

                // a default route in the form of /{route}/{id:int}
                script.push("var url = \"" + url + "\";\n");
                script.push("var options = {\n");
                script.push("\t\"data\": arguments[1],\n");
                script.push("\t\"schemaDefinition\": \"" + key + "\"\n");
                script.push("};\n");

                script.push("if (id) {\n");
                script.push("\turl += \"/\" + id;\n");
                script.push("}\n");

                getScript = script.slice(0);
                getScript.push("return this.ajax(url, " + method + ", options);\n");

                if (_.has(this, key)) {
                    delete this[key];
                }
                this[key] = new Function("id", getScript.join(""));

                if (definition.autoGenerateCrud === true) {
                    var newKey = key.charAt(0).toUpperCase() + key.substring(1);
                    var deleteKey: string = "delete" + newKey;
                    var deleteScript: string[];
                    var postKey: string = "post" + newKey;
                    var postScript: string[];
                    var putKey: string = "put" + newKey;
                    var putScript: string[];

                    deleteScript = script.slice(0);
                    postScript = script.slice(0);
                    putScript = script.slice(0);

                    deleteScript.push("return this.ajax(url, " + HttpMethod.Delete + ", options);\n");
                    postScript.push("return this.ajax(url, " + HttpMethod.Post + ", options);\n");
                    putScript.push("return this.ajax(url, " + HttpMethod.Put + ", options);\n");

                    if (_.has(this, deleteKey)) {
                        delete this[deleteKey];
                    }
                    if (_.has(this, postKey)) {
                        delete this[postKey];
                    }
                    if (_.has(this, putKey)) {
                        delete this[putKey];
                    }

                    this["delete" + newKey] = new Function("id", deleteScript.join(""));
                    this["post" + newKey] = new Function("id, data", postScript.join(""));
                    this["put" + newKey] = new Function("id, data", putScript.join(""));
                }
            }
            else {
                // a route with custom query string parameters
                var argsFiltered: boolean;
                var filteredArgs: string[] = [];
                var match: string[] = url.match(/\{\d\}/g);
                var matchCount: number = (match) ? match.length : 0;
                var parameters: string = "";
                var regexp: RegExp = new RegExp("\\{\\d\\}");

                if (matchCount < args.length) {
                    for (i = 0; i < matchCount; i += 1) {
                        filteredArgs.push(args.shift());
                    }
                }

                _.each(args, (arg: any) => {
                    if (parameters.length > 0) {
                        parameters += ", ";
                    }
                    parameters += arg;
                });

                argsFiltered = filteredArgs.length > 0;

                script.push("var url = \"" + url + "\";\n");
                script.push("var options = {\n");

                if (args.length > 0) {
                    // build data object containing query string pairs
                    var json: string[] = [];

                    script.push("\t\"data\": {\n");

                    for (i = 0,
                             length = args.length; i < length; i += 1) {
                        var index: number = (argsFiltered) ? i + matchCount : i;
                        var name: string = args[i];

                        if (json.length > 0) {
                            json.push(",\n");
                        }
                        json.push("\t\t\"" + name + "\": arguments[" + index + "]");
                    }

                    script.push(json.join(""));
                    script.push("\t\n},");
                    script.push("\n");
                }

                script.push("\t\"schemaDefinition\": \"" + key + "\"");
                script.push("\n};\n");

                if (regexp.test(url)) {
                    script.push("var args = [url];\n");
                    script.push("var passedArgs = Array.prototype.slice.call(arguments);\n");
                    script.push("var filteredArgs = [];\n");
                    script.push("for (var i = 0; i < " + matchCount + "; i += 1) {\n");
                    script.push("\tfilteredArgs.push(passedArgs.shift());\n");
                    script.push("}\n");
                    script.push("args = args.concat(filteredArgs);\n");
                    script.push("url = this.formatString.apply(this, args);\n");
                }

                script.push("return this.ajax(url, " + method + ", options);\n");

                if (_.has(this, key)) {
                    delete this[key];
                }
                this[key] = new Function(parameters, script.join(""));
            }
        });
    }
}

export = RestClient;