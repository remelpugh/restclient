import IHeaderNameValue = require("./IHeaderNameValue");
import ISortOrder = require("./ISortOrder");

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