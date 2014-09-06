import IHeaderNameValue = require("IHeaderNameValue");
interface IAjaxOptions {
    contentType?: string;
    data?: Object;
    headers?: IHeaderNameValue[];
    schemaDefinition?: string;
}
export = IAjaxOptions;
