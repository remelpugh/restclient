(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RestClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Exception = (function () {
    function Exception(message) {
        this.message = message;
    }
    Exception.prototype.toString = function () {
        return this.message;
    };
    return Exception;
})();
module.exports = Exception;

},{}],2:[function(require,module,exports){
var HttpMethod;
(function (HttpMethod) {
    HttpMethod[HttpMethod["DELETE"] = 0] = "DELETE";
    HttpMethod[HttpMethod["GET"] = 1] = "GET";
    HttpMethod[HttpMethod["POST"] = 2] = "POST";
    HttpMethod[HttpMethod["PUT"] = 3] = "PUT";
})(HttpMethod || (HttpMethod = {}));
module.exports = HttpMethod;

},{}],3:[function(require,module,exports){
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Exception = require("./Exception");
var OptionsNotSuppliedException = (function (_super) {
    __extends(OptionsNotSuppliedException, _super);
    function OptionsNotSuppliedException() {
        _super.call(this, "Options must be supplied.");
    }
    return OptionsNotSuppliedException;
})(Exception);
module.exports = OptionsNotSuppliedException;

},{"./Exception":1}],4:[function(require,module,exports){
var HttpMethod = require("./HttpMethod");
var utils = require("./Utilities");
var OptionsNotSuppliedException = require("./OptionsNotSuppliedException");
var RestClient = (function () {
    function RestClient(clientOptions) {
        this.cache = window.localStorage;
        this.utils = utils;
        var options = clientOptions;
        if (_.isUndefined(clientOptions)) {
            throw new OptionsNotSuppliedException();
        }
        this.config = options.config;
        this.headers = options.headers || [];
        this.queryString = options.queryString || {};
        this.schema = options.schema || {};
        this.parseSchema();
    }
    RestClient.prototype.ajax = function (url, method, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var cacheData = this.config.cacheData;
        var cacheKey;
        var httpMethod = HttpMethod[method.toUpperCase()];
        var schemaDefinition;
        if (cacheData) {
            cacheKey = "RestClient_" + url;
        }
        if (!_.isEmpty(options.schemaDefinition)) {
            schemaDefinition = this.schema[options.schemaDefinition];
        }
        if (_.isUndefined(options.headers)) {
            options.headers = [];
        }
        var parseData = function (data) {
            var isSchemaDefined = !_.isUndefined(schemaDefinition);
            var parsed = JSON.parse(data);
            if (isSchemaDefined) {
                if (typeof schemaDefinition.parse === "function") {
                    parsed = schemaDefinition.parse(parsed);
                }
                if (typeof schemaDefinition.sort !== "undefined" && _.isArray(parsed)) {
                    var sortOrder = schemaDefinition.sort;
                    if (!_.isArray(sortOrder)) {
                        sortOrder = [sortOrder];
                    }
                    _.each(sortOrder, function (order) {
                        parsed.sort(function (a, b) {
                            var dir = (order.direction.toLowerCase() === "asc") ? 1 : -1;
                            var fields = order.field.split(".");
                            var fieldValue = function (obj, property) {
                                return obj[property];
                            };
                            _.each(fields, function (field) {
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
        return new Promise(function (resolve, reject) {
            var headers;
            var query = {};
            headers = options.headers.concat(_this.headers).concat(schemaDefinition.headers || []);
            _.defaults(query, _this.queryString);
            _.defaults(query, schemaDefinition.queryString);
            _.defaults(query, options.queryString);
            options.headers = _.uniq(headers, "name");
            options.queryString = query;
            if (cacheData) {
                try {
                    resolve(parseData(_this.cache.getItem(cacheKey)));
                    return;
                }
                catch (e) {
                }
            }
            RestClient.ajax(url, method, options).then(function (response) {
                try {
                    if (_this.config.cacheData && httpMethod === HttpMethod.GET) {
                        _this.cache.setItem(cacheKey, response);
                    }
                    resolve(parseData(response));
                }
                catch (ex) {
                    reject({
                        errors: ["Invalid JSON: " + ex.message]
                    });
                }
            }).error(function (error) {
                reject(error);
            });
        });
    };
    RestClient.prototype.get = function (url, options) {
        if (options === void 0) { options = {}; }
        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.GET], options);
    };
    RestClient.prototype.post = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.POST], options);
    };
    RestClient.prototype.put = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.PUT], options);
    };
    RestClient.prototype.remove = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[HttpMethod.DELETE], options);
    };
    RestClient.prototype.updateSchema = function (schema) {
        var _this = this;
        var currentKeys = _.keys(this.schema);
        var newKeys = _.keys(schema);
        var remove = _.difference(currentKeys, newKeys);
        _.each(remove, function (key) {
            delete _this[key];
        });
        this.schema = schema;
        this.parseSchema();
    };
    RestClient.ajax = function (url, method, options) {
        if (options === void 0) { options = {}; }
        var httpMethod = HttpMethod[method.toUpperCase()];
        var query;
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
        return new Promise(function (resolve, reject) {
            var errorResponse;
            var request = RestClient.createXmlHttpRequest(method, url);
            if (_.isNull(request)) {
                reject(new Error("Failed to create a connection to the server."));
                return;
            }
            request.onerror = function () {
                errorResponse = {
                    errors: ["Unable to send request to " + url]
                };
                reject(errorResponse);
            };
            request.onload = function () {
                var status = request.status;
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
                        if ((status >= 200 && status <= 299) || status === 304) {
                            resolve(request.response);
                        }
                        break;
                }
            };
            if (!_.isEmpty(options.contentType)) {
                request.setRequestHeader("content-type", options.contentType);
            }
            var headers = options.headers;
            if (!_.isEmpty(headers)) {
                _.each(headers, function (header) {
                    request.setRequestHeader(header.name, header.value);
                });
            }
            request.send((httpMethod === HttpMethod.GET ? null : options.data));
        });
    };
    RestClient.createXmlHttpRequest = function (method, url) {
        var xhr = new XMLHttpRequest();
        if (_.has(xhr, "withCredentials")) {
            xhr.open(method, url, true);
        }
        else {
            xhr = null;
        }
        return xhr;
    };
    RestClient.get = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[HttpMethod.GET], options);
    };
    RestClient.post = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[HttpMethod.POST], options);
    };
    RestClient.put = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[HttpMethod.PUT], options);
    };
    RestClient.remove = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[HttpMethod.DELETE], options);
    };
    RestClient.prototype.getUri = function (uri) {
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
    };
    RestClient.prototype.parseSchema = function () {
        var _this = this;
        var schema = this.schema;
        if (schema === undefined || schema === null) {
            return;
        }
        _.each(schema, function (definition, key) {
            var args = definition.args || [];
            var httpMethod;
            var method = definition.method || "GET";
            var script = [];
            var idScript = [];
            var url = _this.getUri(definition);
            httpMethod = HttpMethod[method.toUpperCase()];
            if (args.length === 0) {
                var executeScript;
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
                if (_.has(_this, key)) {
                    delete _this[key];
                }
                _this[key] = new Function("id", executeScript.join(""));
                if (definition.autoGenerateCrud === true) {
                    var newKey = key.charAt(0).toUpperCase() + key.substring(1);
                    var deleteKey = "delete" + newKey;
                    var deleteScript;
                    var postKey = "post" + newKey;
                    var postScript;
                    var putKey = "put" + newKey;
                    var putScript;
                    deleteScript = script.slice(0);
                    postScript = script.slice(0);
                    putScript = script.slice(0);
                    deleteScript.push(idScript.join(""));
                    deleteScript.push("return this.remove(url, data, options);\n");
                    postScript.push("return this.post(url, data, options);\n");
                    putScript.push(idScript.join(""));
                    putScript.push("return this.put(url, data, options);\n");
                    if (_.has(_this, deleteKey)) {
                        delete _this[deleteKey];
                    }
                    if (_.has(_this, postKey)) {
                        delete _this[postKey];
                    }
                    if (_.has(_this, putKey)) {
                        delete _this[putKey];
                    }
                    _this["delete" + newKey] = new Function("id", deleteScript.join(""));
                    _this["post" + newKey] = new Function("data", postScript.join(""));
                    _this["put" + newKey] = new Function("id, data", putScript.join(""));
                }
            }
            else {
                var argsFiltered;
                var filteredArgs = [];
                var match = url.match(/\{\d\}/g);
                var matchCount = (match) ? match.length : 0;
                var parameters = "";
                var regexp = new RegExp("\\{\\d\\}");
                if (matchCount <= args.length) {
                    for (var i = 0; i < matchCount; i += 1) {
                        filteredArgs.push(args.shift());
                    }
                }
                _.each(args, function (arg) {
                    if (parameters.length > 0) {
                        parameters += ", ";
                    }
                    parameters += arg;
                });
                argsFiltered = filteredArgs.length > 0;
                script.push("\tvar url = \"" + url + "\";\n");
                script.push("\tvar options = {\n");
                if (args.length > 0) {
                    var json = [];
                    script.push("\t\t\"data\": {\n");
                    _.each(args, function (arg, i) {
                        var index = (argsFiltered) ? i + matchCount : i;
                        var name = arg;
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
                if (_.has(_this, key)) {
                    delete _this[key];
                }
                _this[key] = new Function(parameters, script.join(""));
            }
        });
    };
    RestClient.test = "TEST";
    RestClient.defaults = {
        AjaxOptions: {
            contentType: "application/json"
        }
    };
    return RestClient;
})();
module.exports = RestClient;

},{"./HttpMethod":2,"./OptionsNotSuppliedException":3,"./Utilities":5}],5:[function(require,module,exports){
var Utilities;
(function (Utilities) {
    Utilities.formatString = function (format) {
        var params = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            params[_i - 1] = arguments[_i];
        }
        var formatted = format;
        var index;
        var length;
        var regexp;
        length = params.length;
        for (index = 0; index < length; index += 1) {
            var value = params[index];
            regexp = new RegExp("\\{(\\s)?" + index + "(\\s)?\\}", "gi");
            formatted = formatted.replace(regexp, value);
        }
        return formatted;
    };
    Utilities.serialize = function (data) {
        if (!_.isObject(data)) {
            return data;
        }
        if (_.isNull(data) || _.isUndefined(data)) {
            return "";
        }
        var parameters = [];
        _.each(data, function (value, key) {
            if (!_.isUndefined(value)) {
                var parameter = encodeURIComponent(key) + "=";
                parameter += encodeURIComponent((_.isObject(value)) ? JSON.stringify(value) : value);
                parameters.push(parameter);
            }
        });
        return parameters.join("&");
    };
})(Utilities || (Utilities = {}));
module.exports = Utilities;

},{}]},{},[4])(4)
});

