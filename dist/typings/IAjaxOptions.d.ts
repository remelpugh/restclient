import IHeaderNameValue = require("IHeaderNameValue");
interface IAjaxOptions {
    contentType?: string;
    data?: Object;
    headers?: IHeaderNameValue[];
    queryString?: any;
    schemaDefinition?: string;
}
export = IAjaxOptions;
