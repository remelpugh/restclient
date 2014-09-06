/// <reference path="../typings/tsd.d.ts" />
import IAjaxOptions = require("./IAjaxOptions");
import IErrorResponse = require("./IErrorResponse");
import ISchemaDefinition = require("./ISchemaDefinition");
import ISortOrder = require("./ISortOrder");
import IHeaderNameValue = require("./IHeaderNameValue");
import HttpMethod = require("./HttpMethod");
import IRestClientConfig = require("./IRestClientConfig");
import IRestClientOptions = require("./IRestClientOptions");
import ISchema = require("./ISchema");
import utils = require("./Utilities");
import OptionsNotSuppliedException = require("./OptionsNotSuppliedException");

/**
 * A REST-ful HTTP client for JavaScript.
 */
class RestClient {
    cache: Storage = window.localStorage;
    config: IRestClientConfig;
    headers: IHeaderNameValue[];
    schema: ISchema;

    /**
     * Default initializer.
     * @param clientOptions The {IRestClientOptions} used to initialize this instance of {RestClient}.
     */
    constructor(clientOptions: IRestClientOptions) {
        var options: IRestClientOptions = clientOptions;

        if (_.isUndefined(clientOptions)) {
            throw new OptionsNotSuppliedException();
        }

        this.config = options.config;
        this.schema = options.schema || {};
        this.headers = options.headers || [];
        this.parseSchema();
    }

    /**
     * Performs a AJAX call to the specified endpoint, based on the supplied {IRestClientOptions} supplied
     * in initialization.
     * @param url The url to be used.
     * @param httpMethod The HTTP method for the request.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    ajax(url: string, httpMethod: HttpMethod, options: IAjaxOptions = {}): Promise<any> {
        var cacheData: boolean = this.config.cacheData;
        var cacheKey: string;
        var schemaDefinition: ISchemaDefinition;

        if (cacheData) {
            cacheKey = "RestClient_" + url;
        }

        if (!_.isEmpty(options.schemaDefinition)) {
            schemaDefinition = this.schema[options.schemaDefinition];
        }

        if (_.isUndefined(options.headers)) {
            options.headers = [];
        }

        var parseData = (data: string): any => {
            var isSchemaDefined: boolean = !_.isUndefined(schemaDefinition);
            var parsed: any = JSON.parse(data);

            if (isSchemaDefined) {
                if (typeof schemaDefinition.parse === "function") {
                    parsed = schemaDefinition.parse(parsed);
                }
                if (typeof schemaDefinition.sort !== "undefined" && _.isArray(parsed)) {
                    var sortOrder: any = schemaDefinition.sort;

                    if (!_.isArray(sortOrder)) {
                        sortOrder = [sortOrder];
                    }
                    _.each(sortOrder, (order: ISortOrder) => {
                        parsed.sort((a: any, b: any) => {
                            var dir: number = (order.direction.toLowerCase() === "asc") ? 1 : -1;
                            var fields: string[] = order.field.split(".");
                            var fieldValue = (obj: any, property: string): string => {
                                return obj[property];
                            };

                            _.each(fields, (field: string) => {
                                a = fieldValue(a, field);
                                b = fieldValue(b, field);
                            });

                            if (a < b) {
                                return dir * -1;
                            }
                            if (a > b) {
                                return dir;
                            }

                            return 0;
                        });
                    });
                }
            }

            return parsed;
        };

        return new Promise((resolve, reject) => {
            var headers: IHeaderNameValue[];

            headers = options.headers.concat(this.headers);
            options.headers = _.uniq(headers, "name");

            if (cacheData) {
                // attempt to retrieve data from cache
                try {
                    resolve(parseData(this.cache.getItem(cacheKey)));

                    return;
                }
                catch (e) {
                    // swallow error and continue to retrieve from server
                    //notify("Failed to retrieve data from cache, contacting server");
                }
            }

            RestClient.ajax(url, httpMethod, options).then((response: string) => {
                try {
                    if (this.config.cacheData && httpMethod === HttpMethod.Get) {
                        this.cache.setItem(cacheKey, response);
                    }

                    resolve(parseData(response));
                }
                catch (ex) {
                    reject({
                        errors: ["Invalid JSON: " + ex.message]
                    });
                }
            }).error((error: any) => {
                reject(error);
            });
        });
    }

    /**
     * Convenience method wrapper around ajax to perform a GET request.
     * @param url The url to be used.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    get(url: string, options: IAjaxOptions = {}): Promise<any> {
        return this.ajax(this.getUri(url), HttpMethod.Get, options);
    }

    /**
     * Convenience method wrapper around ajax to perform a POST request.
     * @param url The url to be used.
     * @param data The data to be added.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    post(url: string, data: any, options: IAjaxOptions = {}): Promise<any> {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Post, settings);
    }

    /**
     * Convenience method wrapper around ajax to perform a PUT request.
     * @param url The url to be used.
     * @param data The data to be updated.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    put(url: string, data: any, options: IAjaxOptions = {}): Promise<any> {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Put, settings);
    }

    /**
     * Convenience method wrapper around ajax to perform a DELETE request.
     * @param url The url to be used.
     * @param data The data to be deleted.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    remove(url: string, data: any, options: IAjaxOptions = {}): Promise<any> {
        var settings: IAjaxOptions;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), HttpMethod.Delete, options);
    }

    /**
     * Update the {ISchema} of the client after the object has been instantiated.
     * @param schema The new API schema definition.
     */
    updateSchema(schema: ISchema) {
        var currentKeys: string[] = _.keys(this.schema);
        var newKeys: string[] = _.keys(schema);
        var remove: string[] = _.difference(currentKeys, newKeys);

        _.each(remove, (key: string) => {
            delete this[key];
        });

        this.schema = schema;
        this.parseSchema();
    }

    /**
     * Execute any arbitrary AJAX call to the specified URI.
     * @param url The URI to be called.
     * @param httpMethod The http method to be used to access the URI.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static ajax(url: string, httpMethod: HttpMethod, options: IAjaxOptions = {}): Promise<any> {
        var method: string;

        _.defaults(options, RestClient.defaults.AjaxOptions);

        if (!_.isEmpty(options.data) && httpMethod === HttpMethod.Get) {
            var query: string = utils.serialize(options.data);

            url = url + ((url.indexOf("?") >= 0) ? "" : "?") + query;
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

        //noinspection JSUnusedLocalSymbols
        return new Promise((resolve, reject) => {
            var errorResponse: IErrorResponse;

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
                            resolve(request.response);
                        }
                        break;
                }
            };

            if (!_.isEmpty(options.contentType)) {
                request.setRequestHeader("content-type", options.contentType);
            }

            var headers: IHeaderNameValue[] = options.headers;

            if (!_.isEmpty(headers)) {
                _.each(headers, (header: IHeaderNameValue) => {
                    request.setRequestHeader(header.name, header.value);
                });
            }

            request.send(httpMethod === HttpMethod.Get ? null : options.data);
        });
    }

    /**
     * Create a {XMLHttpRequest} object.
     * @param method The http method used by the request.
     * @param url The url to be requested.
     * @returns The created request if browser supports CORS, otherwise null.
     */
    static createXmlHttpRequest(method: string, url: string): XMLHttpRequest {
        var xhr: any = new XMLHttpRequest();

        if (_.has(xhr, "withCredentials")) {
            xhr.open(method, url, true);
        }
        else if (!_.isUndefined(XDomainRequest)) {
            xhr = new XDomainRequest();
            xhr.open(method, url, true);
        }
        else {
            // Otherwise, CORS is not supported by the browser.
            xhr = null;
        }

        return xhr;
    }

    static defaults: any = {
        AjaxOptions: {
            contentType: "application/json"
        }
    };

    /**
     * Convenience method wrapper around RestClient.ajax to perform a GET request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static get(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod.Get, options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a POST request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static post(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod.Post, options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a PUT request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static put(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod.Put, options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a DELETE request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static remove(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod.Delete, options);
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
        var schema: ISchema = this.schema;

        if (schema === undefined || schema === null) {
            return;
        }

        _.each(schema, (definition: any, key: string) => {
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

                    _.each(args, (arg: any, i: number) => {
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

                if (_.has(this, key)) {
                    delete this[key];
                }
                this[key] = new Function(parameters, script.join(""));
            }
        });
    }
}

export = RestClient;