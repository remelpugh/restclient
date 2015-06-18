import IHeaderNameValue = require("./IHeaderNameValue");
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
