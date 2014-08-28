import HeaderNameValue = require("HeaderNameValue");
import RestClientConfig = require("RestClientConfig");
import Schema = require("Schema");

class RestClientOptions {
    config: RestClientConfig
    headers: HeaderNameValue[]
    schema: Schema
}

export = RestClientOptions;