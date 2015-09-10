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
    static test = "TEST";

    cache: Storage = window.localStorage;
    config: IRestClientConfig;
    headers: IHeaderNameValue[];
    queryString: any;
    schema: ISchema;

    private utils: any = utils;

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
        this.headers = options.headers || [];
        this.queryString = options.queryString || {};
        this.schema = options.schema || {};
        this.parseSchema();
    }

    /**
     * Performs a AJAX call to the specified endpoint, based on the supplied {IRestClientOptions} supplied
     * in initialization.
     * @param url The url to be used.
     * @param method The HTTP method for the request.
     * @param options The {IAjaxOptions} for customizing the request.
     * @returns A promise.
     */
    ajax(url: string, method: string, options: IAjaxOptions = {}): Promise<any> {
        var cacheData: boolean = this.config.cacheData;
        var cacheKey: string;
        var httpMethod: HttpMethod = HttpMethod[method.toUpperCase()];
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
            var query: any = {};

            headers = options.headers.concat(this.headers).concat(schemaDefinition.headers || []);

            _.defaults(query, this.queryString);
            _.defaults(query, schemaDefinition.queryString);
            _.defaults(query, options.queryString);

            options.headers = _.uniq(headers, "name");
            options.queryString = query;

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

            RestClient.ajax(url, method, options).then((response: string) => {
                try {
                    if (this.config.cacheData && httpMethod === HttpMethod.GET) {
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
        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.GET], options);
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

        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.POST], options);
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

        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.PUT], options);
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

        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.DELETE], options);
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
     * @param method The http method to be used to access the URI.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static ajax(url: string, method: string, options: IAjaxOptions = {}): Promise<any> {
        var httpMethod: HttpMethod = HttpMethod[method.toUpperCase()];
        var query: string;

        _.defaults(options, RestClient.defaults.AjaxOptions);

        if (!_.isEmpty(options.data) && httpMethod === HttpMethod.GET) {
            query = utils.serialize(options.data);

            if (!_.isUndefined(query) && query.length > 0) {
                url = url + ((url.indexOf("?") >= 0) ? "" : "?") + query;
            }
        }

        if (!_.isEmpty(options.queryString)) {
            query = utils.serialize(options.queryString);

            if (!_.isUndefined(query) && query.length > 0) {
                url = url + ((url.indexOf("?") >= 0) ? "&" : "?") + query;
            }
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

            request.send(<Document>(httpMethod === HttpMethod.GET ? null : options.data));
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
        // else if (!_.isUndefined(XDomainRequest)) {
        //     xhr = new XDomainRequest();
        //     xhr.open(method, url, true);
        // }
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
        return RestClient.ajax(url, HttpMethod[HttpMethod.GET], options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a POST request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static post(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod[HttpMethod.POST], options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a PUT request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static put(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod[HttpMethod.PUT], options);
    }

    /**
     * Convenience method wrapper around RestClient.ajax to perform a DELETE request.
     * @param url The URI to be called.
     * @param options The AJAX options to customize the request.
     * @returns A promise.
     */
    static remove(url: string, options: IAjaxOptions = {}): Promise<any> {
        return RestClient.ajax(url, HttpMethod[HttpMethod.DELETE], options);
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

        _.each(schema, (definition: ISchemaDefinition, key: string) => {
            var args: string[] = definition.args || [];
            var httpMethod: HttpMethod;
            var method: string = definition.method || "GET";
            //noinspection JSMismatchedCollectionQueryUpdate
            var script: string[] = [];
            //noinspection JSMismatchedCollectionQueryUpdate
            var idScript: string[] = [];
            var url = this.getUri(definition);

            httpMethod = HttpMethod[method.toUpperCase()];

            if (args.length === 0) {
                var executeScript: string[];

                // a default route in the form of /{route}/{id:int}
                script.push("\tvar url = \"" + url + "\";\n");
                script.push("\tvar options = {\n");
                script.push("\t\t\"schemaDefinition\": \"" + key + "\"\n");
                script.push("\t};\n\n");

                idScript.push("\tif (!_.isUndefined(arguments[0]) && !_.isObject(arguments[0])) {\n");
                idScript.push("\t\toptions.data = arguments[1];\n");
                idScript.push("\t\turl += \"/\" + arguments[0];\n");
                idScript.push("\t}\n");
                idScript.push("\telse if (_.isObject(arguments[0])) {\n");
                idScript.push("\t\toptions.data = arguments[0];\n");
                idScript.push("\t}\n");

                executeScript = script.slice(0);
                executeScript.push(idScript.join(""));

                switch (httpMethod) {
                    case HttpMethod.DELETE:
                        executeScript.push("\n\treturn this.remove(url, options);");
                        break;
                    case HttpMethod.POST:
                        executeScript.push("\n\tvar data = options.data;\n");
                        executeScript.push("\n\tdelete options.data;\n");
                        executeScript.push("\n\treturn this.post(url, data, options);");
                        break;
                    case HttpMethod.PUT:
                        executeScript.push("\n\tvar data = options.data;\n");
                        executeScript.push("\n\tdelete options.data;\n");
                        executeScript.push("\n\treturn this.put(url, data, options);");
                        break;
                    default:
                        executeScript.push("\n\treturn this.get(url, options);");
                        break;
                }

                if (_.has(this, key)) {
                    delete this[key];
                }

                this[key] = new Function("id", executeScript.join(""));

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

                    deleteScript.push(idScript.join(""));
                    deleteScript.push("return this.remove(url, data, options);\n");

                    postScript.push("return this.post(url, data, options);\n");

                    putScript.push(idScript.join(""));
                    putScript.push("return this.put(url, data, options);\n");

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
                    this["post" + newKey] = new Function("data", postScript.join(""));
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

                // remove all arguments that will be used in formatting the url
                if (matchCount <= args.length) {
                    for (var i: number = 0; i < matchCount; i += 1) {
                        filteredArgs.push(args.shift());
                    }
                }

                // create method arguments with the remaining args
                _.each(args, (arg: any) => {
                    if (parameters.length > 0) {
                        parameters += ", ";
                    }
                    parameters += arg;
                });

                argsFiltered = filteredArgs.length > 0;

                script.push("\tvar url = \"" + url + "\";\n");
                script.push("\tvar options = {\n");

                // if there are any remaining args create json data
                if (args.length > 0) {
                    // build data object containing query string pairs
                    //noinspection JSMismatchedCollectionQueryUpdate
                    var json: string[] = [];

                    script.push("\t\t\"data\": {\n");

                    _.each(args, (arg: any, i: number) => {
                        var index: number = (argsFiltered) ? i + matchCount : i;
                        var name: string = arg;

                        if (json.length > 0) {
                            json.push(",\n");
                        }
                        json.push("\t\t\t\"" + name + "\": arguments[" + index + "]");
                    });

                    script.push(json.join(""));
                    script.push("\n\t\t},");
                    script.push("\n");
                }

                script.push("\t\t\"schemaDefinition\": \"" + key + "\"");
                script.push("\n\t};\n");

                if (regexp.test(url)) {
                    script.push("\tvar args = [url];\n");
                    script.push("\tvar filteredArgs = [];\n");
                    script.push("\tvar passedArgs = Array.prototype.slice.call(arguments);\n\n");
                    script.push("\tfor (var i = 0; i < " + matchCount + "; i += 1) {\n");
                    script.push("\t\tfilteredArgs.push(passedArgs.shift());\n");
                    script.push("\t}\n");
                    script.push("\targs = args.concat(filteredArgs);\n");
                    script.push("\turl = utils.formatString.apply(null, args);\n\n");
                }

                script.push("\treturn this.ajax(url, \"" + HttpMethod[httpMethod] + "\", options);");

                if (_.has(this, key)) {
                    delete this[key];
                }
                this[key] = new Function(parameters, script.join(""));
            }
        });
    }
}

export = RestClient;