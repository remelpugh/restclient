(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.RestClient = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
                    if (_this.config.cacheData && httpMethod === 1 /* GET */) {
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
        return this.ajax(this.getUri(url), HttpMethod[1 /* GET */], options);
    };
    RestClient.prototype.post = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[2 /* POST */], options);
    };
    RestClient.prototype.put = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[3 /* PUT */], options);
    };
    RestClient.prototype.remove = function (url, data, options) {
        if (options === void 0) { options = {}; }
        var settings;
        settings = {
            data: JSON.stringify(data)
        };
        _.defaults(options, settings);
        return this.ajax(this.getUri(url), HttpMethod[0 /* DELETE */], options);
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
        if (!_.isEmpty(options.data) && httpMethod === 1 /* GET */) {
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
            request.send((httpMethod === 1 /* GET */ ? null : options.data));
        });
    };
    RestClient.createXmlHttpRequest = function (method, url) {
        var xhr = new XMLHttpRequest();
        if (_.has(xhr, "withCredentials")) {
            xhr.open(method, url, true);
        }
        else if (!_.isUndefined(XDomainRequest)) {
            xhr = new XDomainRequest();
            xhr.open(method, url, true);
        }
        else {
            xhr = null;
        }
        return xhr;
    };
    RestClient.get = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[1 /* GET */], options);
    };
    RestClient.post = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[2 /* POST */], options);
    };
    RestClient.put = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[3 /* PUT */], options);
    };
    RestClient.remove = function (url, options) {
        if (options === void 0) { options = {}; }
        return RestClient.ajax(url, HttpMethod[0 /* DELETE */], options);
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
                    case 0 /* DELETE */:
                        executeScript.push("\n\treturn this.remove(url, options);");
                        break;
                    case 2 /* POST */:
                        executeScript.push("\n\tvar data = options.data;\n");
                        executeScript.push("\n\tdelete options.data;\n");
                        executeScript.push("\n\treturn this.post(url, data, options);");
                        break;
                    case 3 /* PUT */:
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

},{"./HttpMethod":3,"./OptionsNotSuppliedException":4,"./Utilities":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
var HttpMethod;
(function (HttpMethod) {
    HttpMethod[HttpMethod["DELETE"] = 0] = "DELETE";
    HttpMethod[HttpMethod["GET"] = 1] = "GET";
    HttpMethod[HttpMethod["POST"] = 2] = "POST";
    HttpMethod[HttpMethod["PUT"] = 3] = "PUT";
})(HttpMethod || (HttpMethod = {}));
module.exports = HttpMethod;

},{}],4:[function(require,module,exports){
var __extends = this.__extends || function (d, b) {
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

},{"./Exception":2}],5:[function(require,module,exports){
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

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi9SZXN0Q2xpZW50LmpzIiwiRXhjZXB0aW9uLmpzIiwiSHR0cE1ldGhvZC5qcyIsIk9wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvbi5qcyIsIlV0aWxpdGllcy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3haQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEh0dHBNZXRob2QgPSByZXF1aXJlKFwiLi9IdHRwTWV0aG9kXCIpO1xudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vVXRpbGl0aWVzXCIpO1xudmFyIE9wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL09wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvblwiKTtcbnZhciBSZXN0Q2xpZW50ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSZXN0Q2xpZW50KGNsaWVudE9wdGlvbnMpIHtcbiAgICAgICAgdGhpcy5jYWNoZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XG4gICAgICAgIHRoaXMudXRpbHMgPSB1dGlscztcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBjbGllbnRPcHRpb25zO1xuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChjbGllbnRPcHRpb25zKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IE9wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvbigpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuY29uZmlnID0gb3B0aW9ucy5jb25maWc7XG4gICAgICAgIHRoaXMuaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycyB8fCBbXTtcbiAgICAgICAgdGhpcy5xdWVyeVN0cmluZyA9IG9wdGlvbnMucXVlcnlTdHJpbmcgfHwge307XG4gICAgICAgIHRoaXMuc2NoZW1hID0gb3B0aW9ucy5zY2hlbWEgfHwge307XG4gICAgICAgIHRoaXMucGFyc2VTY2hlbWEoKTtcbiAgICB9XG4gICAgUmVzdENsaWVudC5wcm90b3R5cGUuYWpheCA9IGZ1bmN0aW9uICh1cmwsIG1ldGhvZCwgb3B0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICB2YXIgY2FjaGVEYXRhID0gdGhpcy5jb25maWcuY2FjaGVEYXRhO1xuICAgICAgICB2YXIgY2FjaGVLZXk7XG4gICAgICAgIHZhciBodHRwTWV0aG9kID0gSHR0cE1ldGhvZFttZXRob2QudG9VcHBlckNhc2UoKV07XG4gICAgICAgIHZhciBzY2hlbWFEZWZpbml0aW9uO1xuICAgICAgICBpZiAoY2FjaGVEYXRhKSB7XG4gICAgICAgICAgICBjYWNoZUtleSA9IFwiUmVzdENsaWVudF9cIiArIHVybDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNFbXB0eShvcHRpb25zLnNjaGVtYURlZmluaXRpb24pKSB7XG4gICAgICAgICAgICBzY2hlbWFEZWZpbml0aW9uID0gdGhpcy5zY2hlbWFbb3B0aW9ucy5zY2hlbWFEZWZpbml0aW9uXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChvcHRpb25zLmhlYWRlcnMpKSB7XG4gICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSBbXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyc2VEYXRhID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciBpc1NjaGVtYURlZmluZWQgPSAhXy5pc1VuZGVmaW5lZChzY2hlbWFEZWZpbml0aW9uKTtcbiAgICAgICAgICAgIHZhciBwYXJzZWQgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgICAgICAgaWYgKGlzU2NoZW1hRGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc2NoZW1hRGVmaW5pdGlvbi5wYXJzZSA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZCA9IHNjaGVtYURlZmluaXRpb24ucGFyc2UocGFyc2VkKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWFEZWZpbml0aW9uLnNvcnQgIT09IFwidW5kZWZpbmVkXCIgJiYgXy5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNvcnRPcmRlciA9IHNjaGVtYURlZmluaXRpb24uc29ydDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFfLmlzQXJyYXkoc29ydE9yZGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc29ydE9yZGVyID0gW3NvcnRPcmRlcl07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKHNvcnRPcmRlciwgZnVuY3Rpb24gKG9yZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkaXIgPSAob3JkZXIuZGlyZWN0aW9uLnRvTG93ZXJDYXNlKCkgPT09IFwiYXNjXCIpID8gMSA6IC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmaWVsZHMgPSBvcmRlci5maWVsZC5zcGxpdChcIi5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkVmFsdWUgPSBmdW5jdGlvbiAob2JqLCBwcm9wZXJ0eSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gb2JqW3Byb3BlcnR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uZWFjaChmaWVsZHMsIGZ1bmN0aW9uIChmaWVsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhID0gZmllbGRWYWx1ZShhLCBmaWVsZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGIgPSBmaWVsZFZhbHVlKGIsIGZpZWxkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYSA8IGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpciAqIC0xO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYSA+IGIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpcjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBhcnNlZDtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIHZhciBoZWFkZXJzO1xuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0ge307XG4gICAgICAgICAgICBoZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzLmNvbmNhdChfdGhpcy5oZWFkZXJzKS5jb25jYXQoc2NoZW1hRGVmaW5pdGlvbi5oZWFkZXJzIHx8IFtdKTtcbiAgICAgICAgICAgIF8uZGVmYXVsdHMocXVlcnksIF90aGlzLnF1ZXJ5U3RyaW5nKTtcbiAgICAgICAgICAgIF8uZGVmYXVsdHMocXVlcnksIHNjaGVtYURlZmluaXRpb24ucXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgXy5kZWZhdWx0cyhxdWVyeSwgb3B0aW9ucy5xdWVyeVN0cmluZyk7XG4gICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSBfLnVuaXEoaGVhZGVycywgXCJuYW1lXCIpO1xuICAgICAgICAgICAgb3B0aW9ucy5xdWVyeVN0cmluZyA9IHF1ZXJ5O1xuICAgICAgICAgICAgaWYgKGNhY2hlRGF0YSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGFyc2VEYXRhKF90aGlzLmNhY2hlLmdldEl0ZW0oY2FjaGVLZXkpKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBSZXN0Q2xpZW50LmFqYXgodXJsLCBtZXRob2QsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmNvbmZpZy5jYWNoZURhdGEgJiYgaHR0cE1ldGhvZCA9PT0gMSAvKiBHRVQgKi8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmNhY2hlLnNldEl0ZW0oY2FjaGVLZXksIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBhcnNlRGF0YShyZXNwb25zZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogW1wiSW52YWxpZCBKU09OOiBcIiArIGV4Lm1lc3NhZ2VdXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIHJldHVybiB0aGlzLmFqYXgodGhpcy5nZXRVcmkodXJsKSwgSHR0cE1ldGhvZFsxIC8qIEdFVCAqL10sIG9wdGlvbnMpO1xuICAgIH07XG4gICAgUmVzdENsaWVudC5wcm90b3R5cGUucG9zdCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdmFyIHNldHRpbmdzO1xuICAgICAgICBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpXG4gICAgICAgIH07XG4gICAgICAgIF8uZGVmYXVsdHMob3B0aW9ucywgc2V0dGluZ3MpO1xuICAgICAgICByZXR1cm4gdGhpcy5hamF4KHRoaXMuZ2V0VXJpKHVybCksIEh0dHBNZXRob2RbMiAvKiBQT1NUICovXSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIHZhciBzZXR0aW5ncztcbiAgICAgICAgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKVxuICAgICAgICB9O1xuICAgICAgICBfLmRlZmF1bHRzKG9wdGlvbnMsIHNldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWpheCh0aGlzLmdldFVyaSh1cmwpLCBIdHRwTWV0aG9kWzMgLyogUFVUICovXSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIHZhciBzZXR0aW5ncztcbiAgICAgICAgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShkYXRhKVxuICAgICAgICB9O1xuICAgICAgICBfLmRlZmF1bHRzKG9wdGlvbnMsIHNldHRpbmdzKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuYWpheCh0aGlzLmdldFVyaSh1cmwpLCBIdHRwTWV0aG9kWzAgLyogREVMRVRFICovXSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS51cGRhdGVTY2hlbWEgPSBmdW5jdGlvbiAoc2NoZW1hKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBjdXJyZW50S2V5cyA9IF8ua2V5cyh0aGlzLnNjaGVtYSk7XG4gICAgICAgIHZhciBuZXdLZXlzID0gXy5rZXlzKHNjaGVtYSk7XG4gICAgICAgIHZhciByZW1vdmUgPSBfLmRpZmZlcmVuY2UoY3VycmVudEtleXMsIG5ld0tleXMpO1xuICAgICAgICBfLmVhY2gocmVtb3ZlLCBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgICAgICBkZWxldGUgX3RoaXNba2V5XTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xuICAgICAgICB0aGlzLnBhcnNlU2NoZW1hKCk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LmFqYXggPSBmdW5jdGlvbiAodXJsLCBtZXRob2QsIG9wdGlvbnMpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMgPT09IHZvaWQgMCkgeyBvcHRpb25zID0ge307IH1cbiAgICAgICAgdmFyIGh0dHBNZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZC50b1VwcGVyQ2FzZSgpXTtcbiAgICAgICAgdmFyIHF1ZXJ5O1xuICAgICAgICBfLmRlZmF1bHRzKG9wdGlvbnMsIFJlc3RDbGllbnQuZGVmYXVsdHMuQWpheE9wdGlvbnMpO1xuICAgICAgICBpZiAoIV8uaXNFbXB0eShvcHRpb25zLmRhdGEpICYmIGh0dHBNZXRob2QgPT09IDEgLyogR0VUICovKSB7XG4gICAgICAgICAgICBxdWVyeSA9IHV0aWxzLnNlcmlhbGl6ZShvcHRpb25zLmRhdGEpO1xuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHF1ZXJ5KSAmJiBxdWVyeS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdXJsID0gdXJsICsgKCh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIlwiIDogXCI/XCIpICsgcXVlcnk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFfLmlzRW1wdHkob3B0aW9ucy5xdWVyeVN0cmluZykpIHtcbiAgICAgICAgICAgIHF1ZXJ5ID0gdXRpbHMuc2VyaWFsaXplKG9wdGlvbnMucXVlcnlTdHJpbmcpO1xuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHF1ZXJ5KSAmJiBxdWVyeS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdXJsID0gdXJsICsgKCh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIiZcIiA6IFwiP1wiKSArIHF1ZXJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICB2YXIgZXJyb3JSZXNwb25zZTtcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gUmVzdENsaWVudC5jcmVhdGVYbWxIdHRwUmVxdWVzdChtZXRob2QsIHVybCk7XG4gICAgICAgICAgICBpZiAoXy5pc051bGwocmVxdWVzdCkpIHtcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci5cIikpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcXVlc3Qub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlcnJvclJlc3BvbnNlID0ge1xuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcIlVuYWJsZSB0byBzZW5kIHJlcXVlc3QgdG8gXCIgKyB1cmxdXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3JSZXNwb25zZSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVxdWVzdC5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcIlVuZXhwZWN0ZWQgZXJyb3IuXCJdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yUmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA0OlxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JSZXNwb25zZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcIkVuZHBvaW50IG5vdCBmb3VuZDogXCIgKyB1cmxdXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yUmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvclJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yUmVzcG9uc2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogW1wiVW5leHBlY3RlZCBlcnJvci5cIl1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yUmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDw9IDI5OSkgfHwgc3RhdHVzID09PSAzMDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmICghXy5pc0VtcHR5KG9wdGlvbnMuY29udGVudFR5cGUpKSB7XG4gICAgICAgICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKFwiY29udGVudC10eXBlXCIsIG9wdGlvbnMuY29udGVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGhlYWRlcnMgPSBvcHRpb25zLmhlYWRlcnM7XG4gICAgICAgICAgICBpZiAoIV8uaXNFbXB0eShoZWFkZXJzKSkge1xuICAgICAgICAgICAgICAgIF8uZWFjaChoZWFkZXJzLCBmdW5jdGlvbiAoaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIubmFtZSwgaGVhZGVyLnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcXVlc3Quc2VuZCgoaHR0cE1ldGhvZCA9PT0gMSAvKiBHRVQgKi8gPyBudWxsIDogb3B0aW9ucy5kYXRhKSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUmVzdENsaWVudC5jcmVhdGVYbWxIdHRwUmVxdWVzdCA9IGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xuICAgICAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIGlmIChfLmhhcyh4aHIsIFwid2l0aENyZWRlbnRpYWxzXCIpKSB7XG4gICAgICAgICAgICB4aHIub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAoIV8uaXNVbmRlZmluZWQoWERvbWFpblJlcXVlc3QpKSB7XG4gICAgICAgICAgICB4aHIgPSBuZXcgWERvbWFpblJlcXVlc3QoKTtcbiAgICAgICAgICAgIHhoci5vcGVuKG1ldGhvZCwgdXJsLCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHhociA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHhocjtcbiAgICB9O1xuICAgIFJlc3RDbGllbnQuZ2V0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICByZXR1cm4gUmVzdENsaWVudC5hamF4KHVybCwgSHR0cE1ldGhvZFsxIC8qIEdFVCAqL10sIG9wdGlvbnMpO1xuICAgIH07XG4gICAgUmVzdENsaWVudC5wb3N0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICByZXR1cm4gUmVzdENsaWVudC5hamF4KHVybCwgSHR0cE1ldGhvZFsyIC8qIFBPU1QgKi9dLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIFJlc3RDbGllbnQucHV0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xuICAgICAgICBpZiAob3B0aW9ucyA9PT0gdm9pZCAwKSB7IG9wdGlvbnMgPSB7fTsgfVxuICAgICAgICByZXR1cm4gUmVzdENsaWVudC5hamF4KHVybCwgSHR0cE1ldGhvZFszIC8qIFBVVCAqL10sIG9wdGlvbnMpO1xuICAgIH07XG4gICAgUmVzdENsaWVudC5yZW1vdmUgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gICAgICAgIGlmIChvcHRpb25zID09PSB2b2lkIDApIHsgb3B0aW9ucyA9IHt9OyB9XG4gICAgICAgIHJldHVybiBSZXN0Q2xpZW50LmFqYXgodXJsLCBIdHRwTWV0aG9kWzAgLyogREVMRVRFICovXSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5nZXRVcmkgPSBmdW5jdGlvbiAodXJpKSB7XG4gICAgICAgIGlmIChfLmlzU3RyaW5nKHVyaSkpIHtcbiAgICAgICAgICAgIGlmICh1cmkuaW5kZXhPZihcIi9cIikgPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuYmFzZUFwaVVyaSArIHVyaTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB1cmk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uaXNPYmplY3QodXJpKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmJhc2VBcGlVcmkgKyB1cmkudXJsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNvbmZpZy5iYXNlQXBpVXJpO1xuICAgIH07XG4gICAgUmVzdENsaWVudC5wcm90b3R5cGUucGFyc2VTY2hlbWEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBzY2hlbWEgPSB0aGlzLnNjaGVtYTtcbiAgICAgICAgaWYgKHNjaGVtYSA9PT0gdW5kZWZpbmVkIHx8IHNjaGVtYSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIF8uZWFjaChzY2hlbWEsIGZ1bmN0aW9uIChkZWZpbml0aW9uLCBrZXkpIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gZGVmaW5pdGlvbi5hcmdzIHx8IFtdO1xuICAgICAgICAgICAgdmFyIGh0dHBNZXRob2Q7XG4gICAgICAgICAgICB2YXIgbWV0aG9kID0gZGVmaW5pdGlvbi5tZXRob2QgfHwgXCJHRVRcIjtcbiAgICAgICAgICAgIHZhciBzY3JpcHQgPSBbXTtcbiAgICAgICAgICAgIHZhciBpZFNjcmlwdCA9IFtdO1xuICAgICAgICAgICAgdmFyIHVybCA9IF90aGlzLmdldFVyaShkZWZpbml0aW9uKTtcbiAgICAgICAgICAgIGh0dHBNZXRob2QgPSBIdHRwTWV0aG9kW21ldGhvZC50b1VwcGVyQ2FzZSgpXTtcbiAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHZhciBleGVjdXRlU2NyaXB0O1xuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0dmFyIHVybCA9IFxcXCJcIiArIHVybCArIFwiXFxcIjtcXG5cIik7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHR2YXIgb3B0aW9ucyA9IHtcXG5cIik7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHRcXHRcXFwic2NoZW1hRGVmaW5pdGlvblxcXCI6IFxcXCJcIiArIGtleSArIFwiXFxcIlxcblwiKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdH07XFxuXFxuXCIpO1xuICAgICAgICAgICAgICAgIGlkU2NyaXB0LnB1c2goXCJcXHRpZiAoIV8uaXNVbmRlZmluZWQoYXJndW1lbnRzWzBdKSAmJiAhXy5pc09iamVjdChhcmd1bWVudHNbMF0pKSB7XFxuXCIpO1xuICAgICAgICAgICAgICAgIGlkU2NyaXB0LnB1c2goXCJcXHRcXHRvcHRpb25zLmRhdGEgPSBhcmd1bWVudHNbMV07XFxuXCIpO1xuICAgICAgICAgICAgICAgIGlkU2NyaXB0LnB1c2goXCJcXHRcXHR1cmwgKz0gXFxcIi9cXFwiICsgYXJndW1lbnRzWzBdO1xcblwiKTtcbiAgICAgICAgICAgICAgICBpZFNjcmlwdC5wdXNoKFwiXFx0fVxcblwiKTtcbiAgICAgICAgICAgICAgICBpZFNjcmlwdC5wdXNoKFwiXFx0ZWxzZSBpZiAoXy5pc09iamVjdChhcmd1bWVudHNbMF0pKSB7XFxuXCIpO1xuICAgICAgICAgICAgICAgIGlkU2NyaXB0LnB1c2goXCJcXHRcXHRvcHRpb25zLmRhdGEgPSBhcmd1bWVudHNbMF07XFxuXCIpO1xuICAgICAgICAgICAgICAgIGlkU2NyaXB0LnB1c2goXCJcXHR9XFxuXCIpO1xuICAgICAgICAgICAgICAgIGV4ZWN1dGVTY3JpcHQgPSBzY3JpcHQuc2xpY2UoMCk7XG4gICAgICAgICAgICAgICAgZXhlY3V0ZVNjcmlwdC5wdXNoKGlkU2NyaXB0LmpvaW4oXCJcIikpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoaHR0cE1ldGhvZCkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIDAgLyogREVMRVRFICovOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVNjcmlwdC5wdXNoKFwiXFxuXFx0cmV0dXJuIHRoaXMucmVtb3ZlKHVybCwgb3B0aW9ucyk7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMiAvKiBQT1NUICovOlxuICAgICAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVNjcmlwdC5wdXNoKFwiXFxuXFx0dmFyIGRhdGEgPSBvcHRpb25zLmRhdGE7XFxuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVNjcmlwdC5wdXNoKFwiXFxuXFx0ZGVsZXRlIG9wdGlvbnMuZGF0YTtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjdXRlU2NyaXB0LnB1c2goXCJcXG5cXHRyZXR1cm4gdGhpcy5wb3N0KHVybCwgZGF0YSwgb3B0aW9ucyk7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMyAvKiBQVVQgKi86XG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjdXRlU2NyaXB0LnB1c2goXCJcXG5cXHR2YXIgZGF0YSA9IG9wdGlvbnMuZGF0YTtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjdXRlU2NyaXB0LnB1c2goXCJcXG5cXHRkZWxldGUgb3B0aW9ucy5kYXRhO1xcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWN1dGVTY3JpcHQucHVzaChcIlxcblxcdHJldHVybiB0aGlzLnB1dCh1cmwsIGRhdGEsIG9wdGlvbnMpO1wiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgZXhlY3V0ZVNjcmlwdC5wdXNoKFwiXFxuXFx0cmV0dXJuIHRoaXMuZ2V0KHVybCwgb3B0aW9ucyk7XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfLmhhcyhfdGhpcywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgX3RoaXNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX3RoaXNba2V5XSA9IG5ldyBGdW5jdGlvbihcImlkXCIsIGV4ZWN1dGVTY3JpcHQuam9pbihcIlwiKSk7XG4gICAgICAgICAgICAgICAgaWYgKGRlZmluaXRpb24uYXV0b0dlbmVyYXRlQ3J1ZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbmV3S2V5ID0ga2V5LmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsga2V5LnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGV0ZUtleSA9IFwiZGVsZXRlXCIgKyBuZXdLZXk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkZWxldGVTY3JpcHQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3N0S2V5ID0gXCJwb3N0XCIgKyBuZXdLZXk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3N0U2NyaXB0O1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHV0S2V5ID0gXCJwdXRcIiArIG5ld0tleTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHB1dFNjcmlwdDtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlU2NyaXB0ID0gc2NyaXB0LnNsaWNlKDApO1xuICAgICAgICAgICAgICAgICAgICBwb3N0U2NyaXB0ID0gc2NyaXB0LnNsaWNlKDApO1xuICAgICAgICAgICAgICAgICAgICBwdXRTY3JpcHQgPSBzY3JpcHQuc2xpY2UoMCk7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVNjcmlwdC5wdXNoKGlkU2NyaXB0LmpvaW4oXCJcIikpO1xuICAgICAgICAgICAgICAgICAgICBkZWxldGVTY3JpcHQucHVzaChcInJldHVybiB0aGlzLnJlbW92ZSh1cmwsIGRhdGEsIG9wdGlvbnMpO1xcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgcG9zdFNjcmlwdC5wdXNoKFwicmV0dXJuIHRoaXMucG9zdCh1cmwsIGRhdGEsIG9wdGlvbnMpO1xcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgcHV0U2NyaXB0LnB1c2goaWRTY3JpcHQuam9pbihcIlwiKSk7XG4gICAgICAgICAgICAgICAgICAgIHB1dFNjcmlwdC5wdXNoKFwicmV0dXJuIHRoaXMucHV0KHVybCwgZGF0YSwgb3B0aW9ucyk7XFxuXCIpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoXy5oYXMoX3RoaXMsIGRlbGV0ZUtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1tkZWxldGVLZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChfLmhhcyhfdGhpcywgcG9zdEtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1twb3N0S2V5XTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5oYXMoX3RoaXMsIHB1dEtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1twdXRLZXldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF90aGlzW1wiZGVsZXRlXCIgKyBuZXdLZXldID0gbmV3IEZ1bmN0aW9uKFwiaWRcIiwgZGVsZXRlU2NyaXB0LmpvaW4oXCJcIikpO1xuICAgICAgICAgICAgICAgICAgICBfdGhpc1tcInBvc3RcIiArIG5ld0tleV0gPSBuZXcgRnVuY3Rpb24oXCJkYXRhXCIsIHBvc3RTY3JpcHQuam9pbihcIlwiKSk7XG4gICAgICAgICAgICAgICAgICAgIF90aGlzW1wicHV0XCIgKyBuZXdLZXldID0gbmV3IEZ1bmN0aW9uKFwiaWQsIGRhdGFcIiwgcHV0U2NyaXB0LmpvaW4oXCJcIikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBhcmdzRmlsdGVyZWQ7XG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlcmVkQXJncyA9IFtdO1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IHVybC5tYXRjaCgvXFx7XFxkXFx9L2cpO1xuICAgICAgICAgICAgICAgIHZhciBtYXRjaENvdW50ID0gKG1hdGNoKSA/IG1hdGNoLmxlbmd0aCA6IDA7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlcnMgPSBcIlwiO1xuICAgICAgICAgICAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKFwiXFxcXHtcXFxcZFxcXFx9XCIpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaENvdW50IDw9IGFyZ3MubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWF0Y2hDb3VudDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZEFyZ3MucHVzaChhcmdzLnNoaWZ0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIF8uZWFjaChhcmdzLCBmdW5jdGlvbiAoYXJnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMgKz0gXCIsIFwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMgKz0gYXJnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGFyZ3NGaWx0ZXJlZCA9IGZpbHRlcmVkQXJncy5sZW5ndGggPiAwO1xuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0dmFyIHVybCA9IFxcXCJcIiArIHVybCArIFwiXFxcIjtcXG5cIik7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHR2YXIgb3B0aW9ucyA9IHtcXG5cIik7XG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdFxcdFxcXCJkYXRhXFxcIjoge1xcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcmcsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbmRleCA9IChhcmdzRmlsdGVyZWQpID8gaSArIG1hdGNoQ291bnQgOiBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG5hbWUgPSBhcmc7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoanNvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbi5wdXNoKFwiLFxcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb24ucHVzaChcIlxcdFxcdFxcdFxcXCJcIiArIG5hbWUgKyBcIlxcXCI6IGFyZ3VtZW50c1tcIiArIGluZGV4ICsgXCJdXCIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goanNvbi5qb2luKFwiXCIpKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXG5cXHRcXHR9LFwiKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXG5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0XFx0XFxcInNjaGVtYURlZmluaXRpb25cXFwiOiBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXG5cXHR9O1xcblwiKTtcbiAgICAgICAgICAgICAgICBpZiAocmVnZXhwLnRlc3QodXJsKSkge1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdHZhciBhcmdzID0gW3VybF07XFxuXCIpO1xuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdHZhciBmaWx0ZXJlZEFyZ3MgPSBbXTtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0dmFyIHBhc3NlZEFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xcblxcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHRmb3IgKHZhciBpID0gMDsgaSA8IFwiICsgbWF0Y2hDb3VudCArIFwiOyBpICs9IDEpIHtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0XFx0ZmlsdGVyZWRBcmdzLnB1c2gocGFzc2VkQXJncy5zaGlmdCgpKTtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0fVxcblwiKTtcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHRhcmdzID0gYXJncy5jb25jYXQoZmlsdGVyZWRBcmdzKTtcXG5cIik7XG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0dXJsID0gdXRpbHMuZm9ybWF0U3RyaW5nLmFwcGx5KG51bGwsIGFyZ3MpO1xcblxcblwiKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHRyZXR1cm4gdGhpcy5hamF4KHVybCwgXFxcIlwiICsgSHR0cE1ldGhvZFtodHRwTWV0aG9kXSArIFwiXFxcIiwgb3B0aW9ucyk7XCIpO1xuICAgICAgICAgICAgICAgIGlmIChfLmhhcyhfdGhpcywga2V5KSkge1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgX3RoaXNba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgX3RoaXNba2V5XSA9IG5ldyBGdW5jdGlvbihwYXJhbWV0ZXJzLCBzY3JpcHQuam9pbihcIlwiKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUmVzdENsaWVudC50ZXN0ID0gXCJURVNUXCI7XG4gICAgUmVzdENsaWVudC5kZWZhdWx0cyA9IHtcbiAgICAgICAgQWpheE9wdGlvbnM6IHtcbiAgICAgICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIlxuICAgICAgICB9XG4gICAgfTtcbiAgICByZXR1cm4gUmVzdENsaWVudDtcbn0pKCk7XG5tb2R1bGUuZXhwb3J0cyA9IFJlc3RDbGllbnQ7XG4iLCJ2YXIgRXhjZXB0aW9uID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBFeGNlcHRpb24obWVzc2FnZSkge1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIH1cbiAgICBFeGNlcHRpb24ucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xuICAgIH07XG4gICAgcmV0dXJuIEV4Y2VwdGlvbjtcbn0pKCk7XG5tb2R1bGUuZXhwb3J0cyA9IEV4Y2VwdGlvbjtcbiIsInZhciBIdHRwTWV0aG9kO1xuKGZ1bmN0aW9uIChIdHRwTWV0aG9kKSB7XG4gICAgSHR0cE1ldGhvZFtIdHRwTWV0aG9kW1wiREVMRVRFXCJdID0gMF0gPSBcIkRFTEVURVwiO1xuICAgIEh0dHBNZXRob2RbSHR0cE1ldGhvZFtcIkdFVFwiXSA9IDFdID0gXCJHRVRcIjtcbiAgICBIdHRwTWV0aG9kW0h0dHBNZXRob2RbXCJQT1NUXCJdID0gMl0gPSBcIlBPU1RcIjtcbiAgICBIdHRwTWV0aG9kW0h0dHBNZXRob2RbXCJQVVRcIl0gPSAzXSA9IFwiUFVUXCI7XG59KShIdHRwTWV0aG9kIHx8IChIdHRwTWV0aG9kID0ge30pKTtcbm1vZHVsZS5leHBvcnRzID0gSHR0cE1ldGhvZDtcbiIsInZhciBfX2V4dGVuZHMgPSB0aGlzLl9fZXh0ZW5kcyB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIF9fLnByb3RvdHlwZSA9IGIucHJvdG90eXBlO1xuICAgIGQucHJvdG90eXBlID0gbmV3IF9fKCk7XG59O1xudmFyIEV4Y2VwdGlvbiA9IHJlcXVpcmUoXCIuL0V4Y2VwdGlvblwiKTtcbnZhciBPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb24gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb24sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uKCkge1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBcIk9wdGlvbnMgbXVzdCBiZSBzdXBwbGllZC5cIik7XG4gICAgfVxuICAgIHJldHVybiBPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb247XG59KShFeGNlcHRpb24pO1xubW9kdWxlLmV4cG9ydHMgPSBPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb247XG4iLCJ2YXIgVXRpbGl0aWVzO1xuKGZ1bmN0aW9uIChVdGlsaXRpZXMpIHtcbiAgICBVdGlsaXRpZXMuZm9ybWF0U3RyaW5nID0gZnVuY3Rpb24gKGZvcm1hdCkge1xuICAgICAgICB2YXIgcGFyYW1zID0gW107XG4gICAgICAgIGZvciAodmFyIF9pID0gMTsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICBwYXJhbXNbX2kgLSAxXSA9IGFyZ3VtZW50c1tfaV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZvcm1hdHRlZCA9IGZvcm1hdDtcbiAgICAgICAgdmFyIGluZGV4O1xuICAgICAgICB2YXIgbGVuZ3RoO1xuICAgICAgICB2YXIgcmVnZXhwO1xuICAgICAgICBsZW5ndGggPSBwYXJhbXMubGVuZ3RoO1xuICAgICAgICBmb3IgKGluZGV4ID0gMDsgaW5kZXggPCBsZW5ndGg7IGluZGV4ICs9IDEpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtc1tpbmRleF07XG4gICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKFwiXFxcXHsoXFxcXHMpP1wiICsgaW5kZXggKyBcIihcXFxccyk/XFxcXH1cIiwgXCJnaVwiKTtcbiAgICAgICAgICAgIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKHJlZ2V4cCwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb3JtYXR0ZWQ7XG4gICAgfTtcbiAgICBVdGlsaXRpZXMuc2VyaWFsaXplID0gZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGRhdGEpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5pc051bGwoZGF0YSkgfHwgXy5pc1VuZGVmaW5lZChkYXRhKSkge1xuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmFtZXRlcnMgPSBbXTtcbiAgICAgICAgXy5lYWNoKGRhdGEsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmFtZXRlciA9IGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCI7XG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyICs9IGVuY29kZVVSSUNvbXBvbmVudCgoXy5pc09iamVjdCh2YWx1ZSkpID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUpO1xuICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMucHVzaChwYXJhbWV0ZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIHBhcmFtZXRlcnMuam9pbihcIiZcIik7XG4gICAgfTtcbn0pKFV0aWxpdGllcyB8fCAoVXRpbGl0aWVzID0ge30pKTtcbm1vZHVsZS5leHBvcnRzID0gVXRpbGl0aWVzO1xuIl19
