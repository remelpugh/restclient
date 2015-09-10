declare module '/IHeaderNameValue' {
	 class IHeaderNameValue {
	    name: string;
	    value: string;
	}
	export = IHeaderNameValue;

}
declare module '/IAjaxOptions' {
	import IHeaderNameValue = require("IHeaderNameValue");
	interface IAjaxOptions {
	    contentType?: string;
	    data?: Object;
	    headers?: IHeaderNameValue[];
	    queryString?: any;
	    schemaDefinition?: string;
	}
	export = IAjaxOptions;

}
declare module '/IErrorResponse' {
	interface IErrorResponse {
	    errors: string[];
	}
	export = IErrorResponse;

}
declare module '/ISortOrder' {
	interface ISortOrder {
	    direction: string;
	    field: string;
	}
	export = ISortOrder;

}
declare module '/ISchemaDefinition' {
	import IHeaderNameValue = require('/IHeaderNameValue');
	interface ISchemaDefinition {
	    args?: string[];
	    autoGenerateCrud?: boolean;
	    headers?: IHeaderNameValue[];
	    method?: string;
	    parse(data: string): any;
	    queryString?: any;
	    sort?: any;
	    url: string;
	}
	export = ISchemaDefinition;

}
declare module '/HttpMethod' {
	 enum HttpMethod {
	    /**
	     * Represents an HTTP DELETE protocol method.
	     */
	    DELETE = 0,
	    /**
	     * Represents an HTTP GET protocol method.
	     */
	    GET = 1,
	    /**
	     * Represents an HTTP POST protocol method that is used to post a new entity as an addition to a URI.
	     */
	    POST = 2,
	    /**
	     * Represents an HTTP PUT protocol method that is used to replace an entity identified by a URI.
	     */
	    PUT = 3,
	}
	export = HttpMethod;

}
declare module '/IRestClientConfig' {
	interface IRestClientConfig {
	    baseApiUri: string;
	    cacheData?: boolean;
	}
	export = IRestClientConfig;

}
declare module '/ISchema' {
	interface ISchema {
	}
	export = ISchema;

}
declare module '/IRestClientOptions' {
	import IHeaderNameValue = require("IHeaderNameValue");
	import IRestClientConfig = require("IRestClientConfig");
	import Schema = require("ISchema");
	interface IRestClientOptions {
	    config: IRestClientConfig;
	    headers?: IHeaderNameValue[];
	    queryString?: any;
	    schema?: Schema;
	}
	export = IRestClientOptions;

}
declare module '/Utilities' {
	 module Utilities {
	    /**
	     * Replaces each format item in a specified string with the text equivalent of a corresponding object's value.
	     * @param format The string to be formatted.
	     * @param params The array of replacement values.
	     * @returns {string}
	     */
	    var formatString: (format: string, ...params: any[]) => string;
	    /**
	     * Converts a JSON object into a url encoded string.
	     * @param data The object to be converted.
	     * @returns {string}
	     */
	    var serialize: (data: any) => string;
	}
	export = Utilities;

}
declare module '/Exception' {
	 class Exception implements Error {
	    name: string;
	    message: string;
	    constructor(message?: string);
	    toString(): string;
	}
	export = Exception;

}
declare module '/OptionsNotSuppliedException' {
	/**
	 * Created by remelpugh on 9/5/2014.
	 */
	import Exception = require('/Exception'); class OptionsNotSuppliedException extends Exception {
	    /**
	     *
	     */
	    constructor();
	}
	export = OptionsNotSuppliedException;

}
declare module '/RestClient' {
	/// <reference path="../typings/tsd.d.ts" />
	import IAjaxOptions = require('/IAjaxOptions');
	import IHeaderNameValue = require('/IHeaderNameValue');
	import IRestClientConfig = require('/IRestClientConfig');
	import IRestClientOptions = require('/IRestClientOptions');
	import ISchema = require('/ISchema'); class RestClient {
	    static test: string;
	    cache: Storage;
	    config: IRestClientConfig;
	    headers: IHeaderNameValue[];
	    queryString: any;
	    schema: ISchema;
	    private utils;
	    /**
	     * Default initializer.
	     * @param clientOptions The {IRestClientOptions} used to initialize this instance of {RestClient}.
	     */
	    constructor(clientOptions: IRestClientOptions);
	    /**
	     * Performs a AJAX call to the specified endpoint, based on the supplied {IRestClientOptions} supplied
	     * in initialization.
	     * @param url The url to be used.
	     * @param method The HTTP method for the request.
	     * @param options The {IAjaxOptions} for customizing the request.
	     * @returns A promise.
	     */
	    ajax(url: string, method: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around ajax to perform a GET request.
	     * @param url The url to be used.
	     * @param options The {IAjaxOptions} for customizing the request.
	     * @returns A promise.
	     */
	    get(url: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around ajax to perform a POST request.
	     * @param url The url to be used.
	     * @param data The data to be added.
	     * @param options The {IAjaxOptions} for customizing the request.
	     * @returns A promise.
	     */
	    post(url: string, data: any, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around ajax to perform a PUT request.
	     * @param url The url to be used.
	     * @param data The data to be updated.
	     * @param options The {IAjaxOptions} for customizing the request.
	     * @returns A promise.
	     */
	    put(url: string, data: any, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around ajax to perform a DELETE request.
	     * @param url The url to be used.
	     * @param data The data to be deleted.
	     * @param options The {IAjaxOptions} for customizing the request.
	     * @returns A promise.
	     */
	    remove(url: string, data: any, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Update the {ISchema} of the client after the object has been instantiated.
	     * @param schema The new API schema definition.
	     */
	    updateSchema(schema: ISchema): void;
	    /**
	     * Execute any arbitrary AJAX call to the specified URI.
	     * @param url The URI to be called.
	     * @param method The http method to be used to access the URI.
	     * @param options The AJAX options to customize the request.
	     * @returns A promise.
	     */
	    static ajax(url: string, method: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Create a {XMLHttpRequest} object.
	     * @param method The http method used by the request.
	     * @param url The url to be requested.
	     * @returns The created request if browser supports CORS, otherwise null.
	     */
	    static createXmlHttpRequest(method: string, url: string): XMLHttpRequest;
	    static defaults: any;
	    /**
	     * Convenience method wrapper around RestClient.ajax to perform a GET request.
	     * @param url The URI to be called.
	     * @param options The AJAX options to customize the request.
	     * @returns A promise.
	     */
	    static get(url: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around RestClient.ajax to perform a POST request.
	     * @param url The URI to be called.
	     * @param options The AJAX options to customize the request.
	     * @returns A promise.
	     */
	    static post(url: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around RestClient.ajax to perform a PUT request.
	     * @param url The URI to be called.
	     * @param options The AJAX options to customize the request.
	     * @returns A promise.
	     */
	    static put(url: string, options?: IAjaxOptions): Promise<any>;
	    /**
	     * Convenience method wrapper around RestClient.ajax to perform a DELETE request.
	     * @param url The URI to be called.
	     * @param options The AJAX options to customize the request.
	     * @returns A promise.
	     */
	    static remove(url: string, options?: IAjaxOptions): Promise<any>;
	    private getUri(uri);
	    private parseSchema();
	}
	export = RestClient;

}
