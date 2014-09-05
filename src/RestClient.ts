/// <reference path="../typings/tsd.d.ts" />
import IAjaxOptions = require("./IAjaxOptions");
import IErrorResponse = require("./IErrorResponse");
import ISchemaDefinition = require("./ISchemaDefinition");
import ISortOrder = require("./ISortOrder");
import IHeaderNameValue = require("./IHeaderNameValue");
import HttpMethod = require("./HttpMethod");
import IRestClientConfig = require("./IRestClientConfig");
import IRestClientOptions = require("./IRestClientOptions");
import Schema = require("./ISchema");
import utils = require("./Utilities");

/**
 * A RESTful HTTP client for JavaScript.
 */
class RestClient {
    cache: Storage = window.localStorage;
    config: IRestClientConfig;
    defaultAjaxOptions: IAjaxOptions;
    defaultHeaders: IHeaderNameValue[];
    headers: IHeaderNameValue[];
    schema: Schema;

    constructor(clientOptions: IRestClientOptions) {
        var options: IRestClientOptions = clientOptions;

        this.config = options.config;
        this.schema = options.schema;
        this.headers = options.headers;

        this.defaultHeaders = [
            {
                name: "Accept-Encoding",
                value: "gzip"
            }
        ];
        utils.merge(this.headers, this.defaultHeaders);

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

        utils.merge(options, this.defaultAjaxOptions);

        if (!utils.isEmpty(options.data) && httpMethod === HttpMethod.Get) {
            var query: string = RestClient.serialize(options.data);

            url = url + "?" + query;
        }

        if (cacheData) {
            cacheKey = "RestClient_" + url;
        }

        if (!utils.isEmpty(options.schemaDefinition)) {
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
            var isSchemaDefined: boolean = !utils.isUndefined(schemaDefinition);
            var parsed: any = JSON.parse(data);

            if (isSchemaDefined) {
                if (typeof schemaDefinition.parse === "function") {
                    parsed = schemaDefinition.parse(parsed);
                }
                if (typeof schemaDefinition.sort !== "undefined" && utils.isArray(parsed)) {
                    var sort: any = schemaDefinition.sort;

                    if (!utils.isArray(sort)) {
                        sort = [sort];
                    }

                    for (var i: number = 0, length: number = sort.length; i < length; i += 1) {
                        var order: ISortOrder = sort[i];

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
                    }
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

            if (utils.isNull(request)) {
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

                        reject(errorResponse);
                        break;
                    case 404:
                        errorResponse = {
                            errors: ["Endpoint not found: " + url]
                        };

                        reject(errorResponse);
                        break;
                    case 400:
                        try {
                            errorResponse = JSON.parse(request.responseText);
                        }
                        catch (e) {
                            errorResponse = {
                                errors: ["Unexpected error."]
                            };
                        }

                        reject(errorResponse);
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
            };

            if (!utils.isEmpty(options.contentType)) {
                request.setRequestHeader("content-type", options.contentType);
            }

            if (!utils.isEmpty(options.headers)) {
                var headers: IHeaderNameValue[] = options.headers;

                headers = headers || [];

                utils.each(headers, (header: IHeaderNameValue) => {
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

        utils.merge(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Post, settings);
    }

    put(url: string, data: any, options: IAjaxOptions = {}): vow.Promise {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        utils.merge(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Put, settings);
    }

    remove(url: string, data: any, options: IAjaxOptions = {}): vow.Promise {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        utils.merge(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Delete, options);
    }

    updateSchema(schema: Schema) {
        var currentKeys: string[] = utils.keys(this.schema);
        var newKeys: string[] = utils.keys(schema);
        var remove: string[] = utils.difference(currentKeys, newKeys);

        utils.each(remove, (key: string) => {
            delete this[key];
        });

        this.schema = schema;
        this.parseSchema();
    }

    static createXmlHttpRequest(method: string, url: string): XMLHttpRequest {
        var xhr: any = new XMLHttpRequest();

        if (utils.hasProperty(xhr, "withCredentials")) {
            xhr.open(method, url, true);
        }
        else if (!utils.isUndefined(XDomainRequest)) {
            xhr = new XDomainRequest();
            xhr.open(method, url, true);
        }
        else {
            // Otherwise, CORS is not supported by the browser.
            xhr = null;
        }

        return xhr;
    }

    static formatString(format: string, ...params: string[]): string {
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

    static serialize(data: any): string {
        if (!utils.isObject(data)) {
            return data;
        }

        if (utils.isNull(data) || utils.isUndefined(data)) {
            return "";
        }

        var parameters: string[] = [];

        utils.each(data, (value: string, key: string) => {
            if (!utils.isUndefined(value)) {
                parameters.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }
        });

        return parameters.join("&");
    }

    private getUri(uri: any): string {
        if (utils.isString(uri)) {
            if (uri.indexOf("/") === 0) {
                return this.config.baseApiUri + uri;
            }

            return uri;
        }

        if (utils.isObject(uri)) {
            return this.config.baseApiUri + uri.url;
        }

        return this.config.baseApiUri;
    }

    private parseSchema() {
        var schema: Schema = this.schema;

        if (schema === undefined || schema === null) {
            return;
        }

        utils.each(schema, (definition: any, key: string) => {
            var args: string[] = definition.args || [];
            var method: HttpMethod = definition.method || HttpMethod.Get;
            var script: string[] = [];
            var url = this.getUri(definition);

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

                if (utils.hasProperty(this, key)) {
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

                    if (utils.hasProperty(this, deleteKey)) {
                        delete this[deleteKey];
                    }
                    if (utils.hasProperty(this, postKey)) {
                        delete this[postKey];
                    }
                    if (utils.hasProperty(this, putKey)) {
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
                //noinspection JSMismatchedCollectionQueryUpdate
                var filteredArgs: string[] = [];
                //noinspection JSMismatchedCollectionQueryUpdate
                var match: string[] = url.match(/\{\d\}/g);
                var matchCount: number = (match) ? match.length : 0;
                var parameters: string = "";
                var regexp: RegExp = new RegExp("\\{\\d\\}");

                if (matchCount < args.length) {
                    for (var i: number = 0; i < matchCount; i += 1) {
                        filteredArgs.push(args.shift());
                    }
                }

                utils.each(args, (arg: any) => {
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

                    utils.each(args, (arg: any, i: number) => {
                        var index: number = (argsFiltered) ? i + matchCount : i;
                        var name: string = arg;

                        if (json.length > 0) {
                            json.push(",\n");
                        }
                        json.push("\t\t\"" + name + "\": arguments[" + index + "]");
                    });

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
                    script.push("url = RestClient.formatString.apply(this, args);\n");
                }

                script.push("return this.ajax(url, " + method + ", options);\n");

                if (utils.hasProperty(this, key)) {
                    delete this[key];
                }
                this[key] = new Function(parameters, script.join(""));
            }
        });
    }
}

export = RestClient;