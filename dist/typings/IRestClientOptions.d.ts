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
