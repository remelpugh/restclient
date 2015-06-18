/// <reference path="../typings/tsd.d.ts" />
import IAjaxOptions = require("./IAjaxOptions");
import IHeaderNameValue = require("./IHeaderNameValue");
import IRestClientConfig = require("./IRestClientConfig");
import IRestClientOptions = require("./IRestClientOptions");
import ISchema = require("./ISchema");
declare class RestClient {
    static test: string;
    cache: Storage;
    config: IRestClientConfig;
    headers: IHeaderNameValue[];
    queryString: any;
    schema: ISchema;
    private utils;
    constructor(clientOptions: IRestClientOptions);
    ajax(url: string, method: string, options?: IAjaxOptions): Promise<any>;
    get(url: string, options?: IAjaxOptions): Promise<any>;
    post(url: string, data: any, options?: IAjaxOptions): Promise<any>;
    put(url: string, data: any, options?: IAjaxOptions): Promise<any>;
    remove(url: string, data: any, options?: IAjaxOptions): Promise<any>;
    updateSchema(schema: ISchema): void;
    static ajax(url: string, method: string, options?: IAjaxOptions): Promise<any>;
    static createXmlHttpRequest(method: string, url: string): XMLHttpRequest;
    static defaults: any;
    static get(url: string, options?: IAjaxOptions): Promise<any>;
    static post(url: string, options?: IAjaxOptions): Promise<any>;
    static put(url: string, options?: IAjaxOptions): Promise<any>;
    static remove(url: string, options?: IAjaxOptions): Promise<any>;
    private getUri(uri);
    private parseSchema();
}
export = RestClient;
