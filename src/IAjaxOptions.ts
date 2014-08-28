import HeaderNameValue = require("HeaderNameValue");

interface IAjaxOptions {
    contentType?: string
    data?: Object
    headers?: HeaderNameValue[]
    schemaDefinition?: string
}

export = IAjaxOptions;