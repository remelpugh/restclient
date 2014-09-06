!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.RestClient=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var HttpMethod = require("./HttpMethod");

var utils = require("./Utilities");
var OptionsNotSuppliedException = require("./OptionsNotSuppliedException");

var RestClient = (function () {
    function RestClient(clientOptions) {
        this.cache = window.localStorage;
        var options = clientOptions;

        if (_.isUndefined(clientOptions)) {
            throw new OptionsNotSuppliedException();
        }

        this.config = options.config;
        this.schema = options.schema || {};
        this.headers = options.headers || [];
        this.parseSchema();
    }
    RestClient.prototype.ajax = function (url, httpMethod, options) {
        var _this = this;
        if (typeof options === "undefined") { options = {}; }
        var cacheData = this.config.cacheData;
        var cacheKey;
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

            headers = options.headers.concat(_this.headers);
            options.headers = _.uniq(headers, "name");

            if (cacheData) {
                try  {
                    resolve(parseData(_this.cache.getItem(cacheKey)));

                    return;
                } catch (e) {
                }
            }

            RestClient.ajax(url, httpMethod, options).then(function (response) {
                try  {
                    if (_this.config.cacheData && httpMethod === 1 /* Get */) {
                        _this.cache.setItem(cacheKey, response);
                    }

                    resolve(parseData(response));
                } catch (ex) {
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
        if (typeof options === "undefined") { options = {}; }
        return this.ajax(this.getUri(url), 1 /* Get */, options);
    };

    RestClient.prototype.post = function (url, data, options) {
        if (typeof options === "undefined") { options = {}; }
        var settings;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), 2 /* Post */, settings);
    };

    RestClient.prototype.put = function (url, data, options) {
        if (typeof options === "undefined") { options = {}; }
        var settings;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), 3 /* Put */, settings);
    };

    RestClient.prototype.remove = function (url, data, options) {
        if (typeof options === "undefined") { options = {}; }
        var settings;

        settings = {
            data: JSON.stringify(data)
        };

        _.defaults(options, settings);

        return this.ajax(this.getUri(url), 0 /* Delete */, options);
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

    RestClient.ajax = function (url, httpMethod, options) {
        if (typeof options === "undefined") { options = {}; }
        var method;

        _.defaults(options, RestClient.defaults.AjaxOptions);

        if (!_.isEmpty(options.data) && httpMethod === 1 /* Get */) {
            var query = utils.serialize(options.data);

            url = url + ((url.indexOf("?") >= 0) ? "" : "?") + query;
        }

        switch (httpMethod) {
            case 0 /* Delete */:
                method = "DELETE";
                break;
            case 1 /* Get */:
                method = "GET";
                break;
            case 2 /* Post */:
                method = "POST";
                break;
            case 3 /* Put */:
                method = "PUT";
                break;
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
                        try  {
                            errorResponse = JSON.parse(request.responseText);
                        } catch (e) {
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

            request.send(httpMethod === 1 /* Get */ ? null : options.data);
        });
    };

    RestClient.createXmlHttpRequest = function (method, url) {
        var xhr = new XMLHttpRequest();

        if (_.has(xhr, "withCredentials")) {
            xhr.open(method, url, true);
        } else if (!_.isUndefined(XDomainRequest)) {
            xhr = new XDomainRequest();
            xhr.open(method, url, true);
        } else {
            xhr = null;
        }

        return xhr;
    };

    RestClient.get = function (url, options) {
        if (typeof options === "undefined") { options = {}; }
        return RestClient.ajax(url, 1 /* Get */, options);
    };

    RestClient.post = function (url, options) {
        if (typeof options === "undefined") { options = {}; }
        return RestClient.ajax(url, 2 /* Post */, options);
    };

    RestClient.put = function (url, options) {
        if (typeof options === "undefined") { options = {}; }
        return RestClient.ajax(url, 3 /* Put */, options);
    };

    RestClient.remove = function (url, options) {
        if (typeof options === "undefined") { options = {}; }
        return RestClient.ajax(url, 0 /* Delete */, options);
    };

    RestClient.formatString = function (format) {
        var params = [];
        for (var _i = 0; _i < (arguments.length - 1); _i++) {
            params[_i] = arguments[_i + 1];
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
            var method = definition.method || 1 /* Get */;
            var script = [];
            var url = _this.getUri(definition);

            if (args.length === 0) {
                var getScript;

                script.push("var url = \"" + url + "\";\n");
                script.push("var options = {\n");
                script.push("\t\"data\": arguments[1],\n");
                script.push("\t\"schemaDefinition\": \"" + key + "\"\n");
                script.push("};\n");

                script.push("if (id) {\n");
                script.push("\turl += \"/\" + id;\n");
                script.push("}\n");

                getScript = script.slice(0);
                getScript.push("return this.ajax(url, " + method + ", options);\n");

                if (_.has(_this, key)) {
                    delete _this[key];
                }
                _this[key] = new Function("id", getScript.join(""));

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

                    deleteScript.push("return this.ajax(url, " + 0 /* Delete */ + ", options);\n");
                    postScript.push("return this.ajax(url, " + 2 /* Post */ + ", options);\n");
                    putScript.push("return this.ajax(url, " + 3 /* Put */ + ", options);\n");

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
                    _this["post" + newKey] = new Function("id, data", postScript.join(""));
                    _this["put" + newKey] = new Function("id, data", putScript.join(""));
                }
            } else {
                var argsFiltered;

                var filteredArgs = [];

                var match = url.match(/\{\d\}/g);
                var matchCount = (match) ? match.length : 0;
                var parameters = "";
                var regexp = new RegExp("\\{\\d\\}");

                if (matchCount < args.length) {
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

                script.push("var url = \"" + url + "\";\n");
                script.push("var options = {\n");

                if (args.length > 0) {
                    var json = [];

                    script.push("\t\"data\": {\n");

                    _.each(args, function (arg, i) {
                        var index = (argsFiltered) ? i + matchCount : i;
                        var name = arg;

                        if (json.length > 0) {
                            json.push(",\n");
                        }
                        json.push("\t\t\"" + name + "\": arguments[" + index + "]");
                    });

                    script.push(json.join(""));
                    script.push("\t\n},");
                    script.push("\n");
                }

                script.push("\t\"schemaDefinition\": \"" + key + "\"");
                script.push("\n};\n");

                if (regexp.test(url)) {
                    script.push("var args = [url];\n");
                    script.push("var passedArgs = Array.prototype.slice.call(arguments);\n");
                    script.push("var filteredArgs = [];\n");
                    script.push("for (var i = 0; i < " + matchCount + "; i += 1) {\n");
                    script.push("\tfilteredArgs.push(passedArgs.shift());\n");
                    script.push("}\n");
                    script.push("args = args.concat(filteredArgs);\n");
                    script.push("url = RestClient.formatString.apply(this, args);\n");
                }

                script.push("return this.ajax(url, " + method + ", options);\n");

                if (_.has(_this, key)) {
                    delete _this[key];
                }
                _this[key] = new Function(parameters, script.join(""));
            }
        });
    };
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
    HttpMethod[HttpMethod["Delete"] = 0] = "Delete";

    HttpMethod[HttpMethod["Get"] = 1] = "Get";

    HttpMethod[HttpMethod["Post"] = 2] = "Post";

    HttpMethod[HttpMethod["Put"] = 3] = "Put";
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
                parameters.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            }
        });

        return parameters.join("&");
    };
})(Utilities || (Utilities = {}));

module.exports = Utilities;

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImU6XFx3ZWJcXGphdmFzY3JpcHRcXFJlc3RDbGllbnRcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiLi9SZXN0Q2xpZW50LmpzIiwiZTovd2ViL2phdmFzY3JpcHQvUmVzdENsaWVudC9idWlsZC9FeGNlcHRpb24uanMiLCJlOi93ZWIvamF2YXNjcmlwdC9SZXN0Q2xpZW50L2J1aWxkL0h0dHBNZXRob2QuanMiLCJlOi93ZWIvamF2YXNjcmlwdC9SZXN0Q2xpZW50L2J1aWxkL09wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvbi5qcyIsImU6L3dlYi9qYXZhc2NyaXB0L1Jlc3RDbGllbnQvYnVpbGQvVXRpbGl0aWVzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxZUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIEh0dHBNZXRob2QgPSByZXF1aXJlKFwiLi9IdHRwTWV0aG9kXCIpO1xyXG5cclxudmFyIHV0aWxzID0gcmVxdWlyZShcIi4vVXRpbGl0aWVzXCIpO1xyXG52YXIgT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uID0gcmVxdWlyZShcIi4vT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uXCIpO1xyXG5cclxudmFyIFJlc3RDbGllbnQgPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gUmVzdENsaWVudChjbGllbnRPcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5jYWNoZSA9IHdpbmRvdy5sb2NhbFN0b3JhZ2U7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSBjbGllbnRPcHRpb25zO1xyXG5cclxuICAgICAgICBpZiAoXy5pc1VuZGVmaW5lZChjbGllbnRPcHRpb25zKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNvbmZpZyA9IG9wdGlvbnMuY29uZmlnO1xyXG4gICAgICAgIHRoaXMuc2NoZW1hID0gb3B0aW9ucy5zY2hlbWEgfHwge307XHJcbiAgICAgICAgdGhpcy5oZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzIHx8IFtdO1xyXG4gICAgICAgIHRoaXMucGFyc2VTY2hlbWEoKTtcclxuICAgIH1cclxuICAgIFJlc3RDbGllbnQucHJvdG90eXBlLmFqYXggPSBmdW5jdGlvbiAodXJsLCBodHRwTWV0aG9kLCBvcHRpb25zKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwidW5kZWZpbmVkXCIpIHsgb3B0aW9ucyA9IHt9OyB9XHJcbiAgICAgICAgdmFyIGNhY2hlRGF0YSA9IHRoaXMuY29uZmlnLmNhY2hlRGF0YTtcclxuICAgICAgICB2YXIgY2FjaGVLZXk7XHJcbiAgICAgICAgdmFyIHNjaGVtYURlZmluaXRpb247XHJcblxyXG4gICAgICAgIGlmIChjYWNoZURhdGEpIHtcclxuICAgICAgICAgICAgY2FjaGVLZXkgPSBcIlJlc3RDbGllbnRfXCIgKyB1cmw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoIV8uaXNFbXB0eShvcHRpb25zLnNjaGVtYURlZmluaXRpb24pKSB7XHJcbiAgICAgICAgICAgIHNjaGVtYURlZmluaXRpb24gPSB0aGlzLnNjaGVtYVtvcHRpb25zLnNjaGVtYURlZmluaXRpb25dO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF8uaXNVbmRlZmluZWQob3B0aW9ucy5oZWFkZXJzKSkge1xyXG4gICAgICAgICAgICBvcHRpb25zLmhlYWRlcnMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBwYXJzZURhdGEgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICB2YXIgaXNTY2hlbWFEZWZpbmVkID0gIV8uaXNVbmRlZmluZWQoc2NoZW1hRGVmaW5pdGlvbik7XHJcbiAgICAgICAgICAgIHZhciBwYXJzZWQgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKGlzU2NoZW1hRGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzY2hlbWFEZWZpbml0aW9uLnBhcnNlID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXJzZWQgPSBzY2hlbWFEZWZpbml0aW9uLnBhcnNlKHBhcnNlZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHNjaGVtYURlZmluaXRpb24uc29ydCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBfLmlzQXJyYXkocGFyc2VkKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBzb3J0T3JkZXIgPSBzY2hlbWFEZWZpbml0aW9uLnNvcnQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghXy5pc0FycmF5KHNvcnRPcmRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc29ydE9yZGVyID0gW3NvcnRPcmRlcl07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChzb3J0T3JkZXIsIGZ1bmN0aW9uIChvcmRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJzZWQuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGRpciA9IChvcmRlci5kaXJlY3Rpb24udG9Mb3dlckNhc2UoKSA9PT0gXCJhc2NcIikgPyAxIDogLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZmllbGRzID0gb3JkZXIuZmllbGQuc3BsaXQoXCIuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZpZWxkVmFsdWUgPSBmdW5jdGlvbiAob2JqLCBwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBvYmpbcHJvcGVydHldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmVhY2goZmllbGRzLCBmdW5jdGlvbiAoZmllbGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhID0gZmllbGRWYWx1ZShhLCBmaWVsZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYiA9IGZpZWxkVmFsdWUoYiwgZmllbGQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEgPCBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpciAqIC0xO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGEgPiBiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRpcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZWQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgdmFyIGhlYWRlcnM7XHJcblxyXG4gICAgICAgICAgICBoZWFkZXJzID0gb3B0aW9ucy5oZWFkZXJzLmNvbmNhdChfdGhpcy5oZWFkZXJzKTtcclxuICAgICAgICAgICAgb3B0aW9ucy5oZWFkZXJzID0gXy51bmlxKGhlYWRlcnMsIFwibmFtZVwiKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChjYWNoZURhdGEpIHtcclxuICAgICAgICAgICAgICAgIHRyeSAge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGFyc2VEYXRhKF90aGlzLmNhY2hlLmdldEl0ZW0oY2FjaGVLZXkpKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgUmVzdENsaWVudC5hamF4KHVybCwgaHR0cE1ldGhvZCwgb3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgIHRyeSAge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfdGhpcy5jb25maWcuY2FjaGVEYXRhICYmIGh0dHBNZXRob2QgPT09IDEgLyogR2V0ICovKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLmNhY2hlLnNldEl0ZW0oY2FjaGVLZXksIHJlc3BvbnNlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGFyc2VEYXRhKHJlc3BvbnNlKSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yczogW1wiSW52YWxpZCBKU09OOiBcIiArIGV4Lm1lc3NhZ2VdXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pLmVycm9yKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwidW5kZWZpbmVkXCIpIHsgb3B0aW9ucyA9IHt9OyB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWpheCh0aGlzLmdldFVyaSh1cmwpLCAxIC8qIEdldCAqLywgb3B0aW9ucyk7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQucHJvdG90eXBlLnBvc3QgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBvcHRpb25zKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInVuZGVmaW5lZFwiKSB7IG9wdGlvbnMgPSB7fTsgfVxyXG4gICAgICAgIHZhciBzZXR0aW5ncztcclxuXHJcbiAgICAgICAgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgXy5kZWZhdWx0cyhvcHRpb25zLCBzZXR0aW5ncyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmFqYXgodGhpcy5nZXRVcmkodXJsKSwgMiAvKiBQb3N0ICovLCBzZXR0aW5ncyk7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQucHJvdG90eXBlLnB1dCA9IGZ1bmN0aW9uICh1cmwsIGRhdGEsIG9wdGlvbnMpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwidW5kZWZpbmVkXCIpIHsgb3B0aW9ucyA9IHt9OyB9XHJcbiAgICAgICAgdmFyIHNldHRpbmdzO1xyXG5cclxuICAgICAgICBzZXR0aW5ncyA9IHtcclxuICAgICAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSlcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBfLmRlZmF1bHRzKG9wdGlvbnMsIHNldHRpbmdzKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWpheCh0aGlzLmdldFVyaSh1cmwpLCAzIC8qIFB1dCAqLywgc2V0dGluZ3MpO1xyXG4gICAgfTtcclxuXHJcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAodXJsLCBkYXRhLCBvcHRpb25zKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInVuZGVmaW5lZFwiKSB7IG9wdGlvbnMgPSB7fTsgfVxyXG4gICAgICAgIHZhciBzZXR0aW5ncztcclxuXHJcbiAgICAgICAgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgIGRhdGE6IEpTT04uc3RyaW5naWZ5KGRhdGEpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgXy5kZWZhdWx0cyhvcHRpb25zLCBzZXR0aW5ncyk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLmFqYXgodGhpcy5nZXRVcmkodXJsKSwgMCAvKiBEZWxldGUgKi8sIG9wdGlvbnMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS51cGRhdGVTY2hlbWEgPSBmdW5jdGlvbiAoc2NoZW1hKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YXIgY3VycmVudEtleXMgPSBfLmtleXModGhpcy5zY2hlbWEpO1xyXG4gICAgICAgIHZhciBuZXdLZXlzID0gXy5rZXlzKHNjaGVtYSk7XHJcbiAgICAgICAgdmFyIHJlbW92ZSA9IF8uZGlmZmVyZW5jZShjdXJyZW50S2V5cywgbmV3S2V5cyk7XHJcblxyXG4gICAgICAgIF8uZWFjaChyZW1vdmUsIGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgZGVsZXRlIF90aGlzW2tleV07XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc2NoZW1hID0gc2NoZW1hO1xyXG4gICAgICAgIHRoaXMucGFyc2VTY2hlbWEoKTtcclxuICAgIH07XHJcblxyXG4gICAgUmVzdENsaWVudC5hamF4ID0gZnVuY3Rpb24gKHVybCwgaHR0cE1ldGhvZCwgb3B0aW9ucykge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJ1bmRlZmluZWRcIikgeyBvcHRpb25zID0ge307IH1cclxuICAgICAgICB2YXIgbWV0aG9kO1xyXG5cclxuICAgICAgICBfLmRlZmF1bHRzKG9wdGlvbnMsIFJlc3RDbGllbnQuZGVmYXVsdHMuQWpheE9wdGlvbnMpO1xyXG5cclxuICAgICAgICBpZiAoIV8uaXNFbXB0eShvcHRpb25zLmRhdGEpICYmIGh0dHBNZXRob2QgPT09IDEgLyogR2V0ICovKSB7XHJcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IHV0aWxzLnNlcmlhbGl6ZShvcHRpb25zLmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgdXJsID0gdXJsICsgKCh1cmwuaW5kZXhPZihcIj9cIikgPj0gMCkgPyBcIlwiIDogXCI/XCIpICsgcXVlcnk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2ggKGh0dHBNZXRob2QpIHtcclxuICAgICAgICAgICAgY2FzZSAwIC8qIERlbGV0ZSAqLzpcclxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IFwiREVMRVRFXCI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxIC8qIEdldCAqLzpcclxuICAgICAgICAgICAgICAgIG1ldGhvZCA9IFwiR0VUXCI7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyIC8qIFBvc3QgKi86XHJcbiAgICAgICAgICAgICAgICBtZXRob2QgPSBcIlBPU1RcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDMgLyogUHV0ICovOlxyXG4gICAgICAgICAgICAgICAgbWV0aG9kID0gXCJQVVRcIjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgdmFyIGVycm9yUmVzcG9uc2U7XHJcblxyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdCA9IFJlc3RDbGllbnQuY3JlYXRlWG1sSHR0cFJlcXVlc3QobWV0aG9kLCB1cmwpO1xyXG5cclxuICAgICAgICAgICAgaWYgKF8uaXNOdWxsKHJlcXVlc3QpKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBhIGNvbm5lY3Rpb24gdG8gdGhlIHNlcnZlci5cIikpO1xyXG5cclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3JSZXNwb25zZSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcIlVuYWJsZSB0byBzZW5kIHJlcXVlc3QgdG8gXCIgKyB1cmxdXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgIHJlamVjdChlcnJvclJlc3BvbnNlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHJlcXVlc3Qub25sb2FkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1MDA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcnM6IFtcIlVuZXhwZWN0ZWQgZXJyb3IuXCJdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3JSZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDA0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvclJlc3BvbnNlID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzOiBbXCJFbmRwb2ludCBub3QgZm91bmQ6IFwiICsgdXJsXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQwMDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5ICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvclJlc3BvbnNlID0gSlNPTi5wYXJzZShyZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3JzOiBbXCJVbmV4cGVjdGVkIGVycm9yLlwiXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yUmVzcG9uc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDw9IDI5OSkgfHwgc3RhdHVzID09PSAzMDQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUocmVxdWVzdC5yZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoIV8uaXNFbXB0eShvcHRpb25zLmNvbnRlbnRUeXBlKSkge1xyXG4gICAgICAgICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKFwiY29udGVudC10eXBlXCIsIG9wdGlvbnMuY29udGVudFR5cGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB2YXIgaGVhZGVycyA9IG9wdGlvbnMuaGVhZGVycztcclxuXHJcbiAgICAgICAgICAgIGlmICghXy5pc0VtcHR5KGhlYWRlcnMpKSB7XHJcbiAgICAgICAgICAgICAgICBfLmVhY2goaGVhZGVycywgZnVuY3Rpb24gKGhlYWRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVlc3Quc2V0UmVxdWVzdEhlYWRlcihoZWFkZXIubmFtZSwgaGVhZGVyLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXF1ZXN0LnNlbmQoaHR0cE1ldGhvZCA9PT0gMSAvKiBHZXQgKi8gPyBudWxsIDogb3B0aW9ucy5kYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgUmVzdENsaWVudC5jcmVhdGVYbWxIdHRwUmVxdWVzdCA9IGZ1bmN0aW9uIChtZXRob2QsIHVybCkge1xyXG4gICAgICAgIHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuXHJcbiAgICAgICAgaWYgKF8uaGFzKHhociwgXCJ3aXRoQ3JlZGVudGlhbHNcIikpIHtcclxuICAgICAgICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoIV8uaXNVbmRlZmluZWQoWERvbWFpblJlcXVlc3QpKSB7XHJcbiAgICAgICAgICAgIHhociA9IG5ldyBYRG9tYWluUmVxdWVzdCgpO1xyXG4gICAgICAgICAgICB4aHIub3BlbihtZXRob2QsIHVybCwgdHJ1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgeGhyID0gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB4aHI7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQuZ2V0ID0gZnVuY3Rpb24gKHVybCwgb3B0aW9ucykge1xyXG4gICAgICAgIGlmICh0eXBlb2Ygb3B0aW9ucyA9PT0gXCJ1bmRlZmluZWRcIikgeyBvcHRpb25zID0ge307IH1cclxuICAgICAgICByZXR1cm4gUmVzdENsaWVudC5hamF4KHVybCwgMSAvKiBHZXQgKi8sIG9wdGlvbnMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBSZXN0Q2xpZW50LnBvc3QgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInVuZGVmaW5lZFwiKSB7IG9wdGlvbnMgPSB7fTsgfVxyXG4gICAgICAgIHJldHVybiBSZXN0Q2xpZW50LmFqYXgodXJsLCAyIC8qIFBvc3QgKi8sIG9wdGlvbnMpO1xyXG4gICAgfTtcclxuXHJcbiAgICBSZXN0Q2xpZW50LnB1dCA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcclxuICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwidW5kZWZpbmVkXCIpIHsgb3B0aW9ucyA9IHt9OyB9XHJcbiAgICAgICAgcmV0dXJuIFJlc3RDbGllbnQuYWpheCh1cmwsIDMgLyogUHV0ICovLCBvcHRpb25zKTtcclxuICAgIH07XHJcblxyXG4gICAgUmVzdENsaWVudC5yZW1vdmUgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInVuZGVmaW5lZFwiKSB7IG9wdGlvbnMgPSB7fTsgfVxyXG4gICAgICAgIHJldHVybiBSZXN0Q2xpZW50LmFqYXgodXJsLCAwIC8qIERlbGV0ZSAqLywgb3B0aW9ucyk7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQuZm9ybWF0U3RyaW5nID0gZnVuY3Rpb24gKGZvcm1hdCkge1xyXG4gICAgICAgIHZhciBwYXJhbXMgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgKGFyZ3VtZW50cy5sZW5ndGggLSAxKTsgX2krKykge1xyXG4gICAgICAgICAgICBwYXJhbXNbX2ldID0gYXJndW1lbnRzW19pICsgMV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBmb3JtYXR0ZWQgPSBmb3JtYXQ7XHJcbiAgICAgICAgdmFyIGluZGV4O1xyXG4gICAgICAgIHZhciBsZW5ndGg7XHJcbiAgICAgICAgdmFyIHJlZ2V4cDtcclxuXHJcbiAgICAgICAgbGVuZ3RoID0gcGFyYW1zLmxlbmd0aDtcclxuXHJcbiAgICAgICAgZm9yIChpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCArPSAxKSB7XHJcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IHBhcmFtc1tpbmRleF07XHJcblxyXG4gICAgICAgICAgICByZWdleHAgPSBuZXcgUmVnRXhwKFwiXFxcXHsoXFxcXHMpP1wiICsgaW5kZXggKyBcIihcXFxccyk/XFxcXH1cIiwgXCJnaVwiKTtcclxuICAgICAgICAgICAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UocmVnZXhwLCB2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZm9ybWF0dGVkO1xyXG4gICAgfTtcclxuXHJcbiAgICBSZXN0Q2xpZW50LnByb3RvdHlwZS5nZXRVcmkgPSBmdW5jdGlvbiAodXJpKSB7XHJcbiAgICAgICAgaWYgKF8uaXNTdHJpbmcodXJpKSkge1xyXG4gICAgICAgICAgICBpZiAodXJpLmluZGV4T2YoXCIvXCIpID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb25maWcuYmFzZUFwaVVyaSArIHVyaTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHVyaTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChfLmlzT2JqZWN0KHVyaSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmJhc2VBcGlVcmkgKyB1cmkudXJsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29uZmlnLmJhc2VBcGlVcmk7XHJcbiAgICB9O1xyXG5cclxuICAgIFJlc3RDbGllbnQucHJvdG90eXBlLnBhcnNlU2NoZW1hID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHNjaGVtYSA9IHRoaXMuc2NoZW1hO1xyXG5cclxuICAgICAgICBpZiAoc2NoZW1hID09PSB1bmRlZmluZWQgfHwgc2NoZW1hID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIF8uZWFjaChzY2hlbWEsIGZ1bmN0aW9uIChkZWZpbml0aW9uLCBrZXkpIHtcclxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBkZWZpbml0aW9uLmFyZ3MgfHwgW107XHJcbiAgICAgICAgICAgIHZhciBtZXRob2QgPSBkZWZpbml0aW9uLm1ldGhvZCB8fCAxIC8qIEdldCAqLztcclxuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IFtdO1xyXG4gICAgICAgICAgICB2YXIgdXJsID0gX3RoaXMuZ2V0VXJpKGRlZmluaXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZ2V0U2NyaXB0O1xyXG5cclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwidmFyIHVybCA9IFxcXCJcIiArIHVybCArIFwiXFxcIjtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcInZhciBvcHRpb25zID0ge1xcblwiKTtcclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0XFxcImRhdGFcXFwiOiBhcmd1bWVudHNbMV0sXFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJcXHRcXFwic2NoZW1hRGVmaW5pdGlvblxcXCI6IFxcXCJcIiArIGtleSArIFwiXFxcIlxcblwiKTtcclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwifTtcXG5cIik7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJpZiAoaWQpIHtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdHVybCArPSBcXFwiL1xcXCIgKyBpZDtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIn1cXG5cIik7XHJcblxyXG4gICAgICAgICAgICAgICAgZ2V0U2NyaXB0ID0gc2NyaXB0LnNsaWNlKDApO1xyXG4gICAgICAgICAgICAgICAgZ2V0U2NyaXB0LnB1c2goXCJyZXR1cm4gdGhpcy5hamF4KHVybCwgXCIgKyBtZXRob2QgKyBcIiwgb3B0aW9ucyk7XFxuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChfLmhhcyhfdGhpcywga2V5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1trZXldO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgX3RoaXNba2V5XSA9IG5ldyBGdW5jdGlvbihcImlkXCIsIGdldFNjcmlwdC5qb2luKFwiXCIpKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGVmaW5pdGlvbi5hdXRvR2VuZXJhdGVDcnVkID09PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIG5ld0tleSA9IGtleS5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIGtleS5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGV0ZUtleSA9IFwiZGVsZXRlXCIgKyBuZXdLZXk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRlbGV0ZVNjcmlwdDtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcG9zdEtleSA9IFwicG9zdFwiICsgbmV3S2V5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3N0U2NyaXB0O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwdXRLZXkgPSBcInB1dFwiICsgbmV3S2V5O1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwdXRTY3JpcHQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZVNjcmlwdCA9IHNjcmlwdC5zbGljZSgwKTtcclxuICAgICAgICAgICAgICAgICAgICBwb3N0U2NyaXB0ID0gc2NyaXB0LnNsaWNlKDApO1xyXG4gICAgICAgICAgICAgICAgICAgIHB1dFNjcmlwdCA9IHNjcmlwdC5zbGljZSgwKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlU2NyaXB0LnB1c2goXCJyZXR1cm4gdGhpcy5hamF4KHVybCwgXCIgKyAwIC8qIERlbGV0ZSAqLyArIFwiLCBvcHRpb25zKTtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zdFNjcmlwdC5wdXNoKFwicmV0dXJuIHRoaXMuYWpheCh1cmwsIFwiICsgMiAvKiBQb3N0ICovICsgXCIsIG9wdGlvbnMpO1xcblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBwdXRTY3JpcHQucHVzaChcInJldHVybiB0aGlzLmFqYXgodXJsLCBcIiArIDMgLyogUHV0ICovICsgXCIsIG9wdGlvbnMpO1xcblwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaGFzKF90aGlzLCBkZWxldGVLZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1tkZWxldGVLZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoXy5oYXMoX3RoaXMsIHBvc3RLZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1twb3N0S2V5XTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF8uaGFzKF90aGlzLCBwdXRLZXkpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBfdGhpc1twdXRLZXldO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXNbXCJkZWxldGVcIiArIG5ld0tleV0gPSBuZXcgRnVuY3Rpb24oXCJpZFwiLCBkZWxldGVTY3JpcHQuam9pbihcIlwiKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXNbXCJwb3N0XCIgKyBuZXdLZXldID0gbmV3IEZ1bmN0aW9uKFwiaWQsIGRhdGFcIiwgcG9zdFNjcmlwdC5qb2luKFwiXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICBfdGhpc1tcInB1dFwiICsgbmV3S2V5XSA9IG5ldyBGdW5jdGlvbihcImlkLCBkYXRhXCIsIHB1dFNjcmlwdC5qb2luKFwiXCIpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcmdzRmlsdGVyZWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlcmVkQXJncyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IHVybC5tYXRjaCgvXFx7XFxkXFx9L2cpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1hdGNoQ291bnQgPSAobWF0Y2gpID8gbWF0Y2gubGVuZ3RoIDogMDtcclxuICAgICAgICAgICAgICAgIHZhciBwYXJhbWV0ZXJzID0gXCJcIjtcclxuICAgICAgICAgICAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKFwiXFxcXHtcXFxcZFxcXFx9XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtYXRjaENvdW50IDwgYXJncy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGNoQ291bnQ7IGkgKz0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZEFyZ3MucHVzaChhcmdzLnNoaWZ0KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBfLmVhY2goYXJncywgZnVuY3Rpb24gKGFyZykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXJzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVycyArPSBcIiwgXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmFtZXRlcnMgKz0gYXJnO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgYXJnc0ZpbHRlcmVkID0gZmlsdGVyZWRBcmdzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJ2YXIgdXJsID0gXFxcIlwiICsgdXJsICsgXCJcXFwiO1xcblwiKTtcclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwidmFyIG9wdGlvbnMgPSB7XFxuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIganNvbiA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdFxcXCJkYXRhXFxcIjoge1xcblwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGFyZ3MsIGZ1bmN0aW9uIChhcmcsIGkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGluZGV4ID0gKGFyZ3NGaWx0ZXJlZCkgPyBpICsgbWF0Y2hDb3VudCA6IGk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBuYW1lID0gYXJnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGpzb24ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbi5wdXNoKFwiLFxcblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29uLnB1c2goXCJcXHRcXHRcXFwiXCIgKyBuYW1lICsgXCJcXFwiOiBhcmd1bWVudHNbXCIgKyBpbmRleCArIFwiXVwiKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goanNvbi5qb2luKFwiXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcdFxcbn0sXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0XFxcInNjaGVtYURlZmluaXRpb25cXFwiOiBcXFwiXCIgKyBrZXkgKyBcIlxcXCJcIik7XHJcbiAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcIlxcbn07XFxuXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChyZWdleHAudGVzdCh1cmwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJ2YXIgYXJncyA9IFt1cmxdO1xcblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBzY3JpcHQucHVzaChcInZhciBwYXNzZWRBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJ2YXIgZmlsdGVyZWRBcmdzID0gW107XFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiZm9yICh2YXIgaSA9IDA7IGkgPCBcIiArIG1hdGNoQ291bnQgKyBcIjsgaSArPSAxKSB7XFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiXFx0ZmlsdGVyZWRBcmdzLnB1c2gocGFzc2VkQXJncy5zaGlmdCgpKTtcXG5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgc2NyaXB0LnB1c2goXCJ9XFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwiYXJncyA9IGFyZ3MuY29uY2F0KGZpbHRlcmVkQXJncyk7XFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwidXJsID0gUmVzdENsaWVudC5mb3JtYXRTdHJpbmcuYXBwbHkodGhpcywgYXJncyk7XFxuXCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNjcmlwdC5wdXNoKFwicmV0dXJuIHRoaXMuYWpheCh1cmwsIFwiICsgbWV0aG9kICsgXCIsIG9wdGlvbnMpO1xcblwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoXy5oYXMoX3RoaXMsIGtleSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGUgX3RoaXNba2V5XTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF90aGlzW2tleV0gPSBuZXcgRnVuY3Rpb24ocGFyYW1ldGVycywgc2NyaXB0LmpvaW4oXCJcIikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgUmVzdENsaWVudC5kZWZhdWx0cyA9IHtcclxuICAgICAgICBBamF4T3B0aW9uczoge1xyXG4gICAgICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCJcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIFJlc3RDbGllbnQ7XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFJlc3RDbGllbnQ7XHJcbiIsInZhciBFeGNlcHRpb24gPSAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gRXhjZXB0aW9uKG1lc3NhZ2UpIHtcclxuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG4gICAgfVxyXG4gICAgRXhjZXB0aW9uLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBFeGNlcHRpb247XHJcbn0pKCk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEV4Y2VwdGlvbjtcclxuIiwidmFyIEh0dHBNZXRob2Q7XHJcbihmdW5jdGlvbiAoSHR0cE1ldGhvZCkge1xyXG4gICAgSHR0cE1ldGhvZFtIdHRwTWV0aG9kW1wiRGVsZXRlXCJdID0gMF0gPSBcIkRlbGV0ZVwiO1xyXG5cclxuICAgIEh0dHBNZXRob2RbSHR0cE1ldGhvZFtcIkdldFwiXSA9IDFdID0gXCJHZXRcIjtcclxuXHJcbiAgICBIdHRwTWV0aG9kW0h0dHBNZXRob2RbXCJQb3N0XCJdID0gMl0gPSBcIlBvc3RcIjtcclxuXHJcbiAgICBIdHRwTWV0aG9kW0h0dHBNZXRob2RbXCJQdXRcIl0gPSAzXSA9IFwiUHV0XCI7XHJcbn0pKEh0dHBNZXRob2QgfHwgKEh0dHBNZXRob2QgPSB7fSkpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBIdHRwTWV0aG9kO1xyXG4iLCJ2YXIgX19leHRlbmRzID0gdGhpcy5fX2V4dGVuZHMgfHwgZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xyXG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICBfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZTtcclxuICAgIGQucHJvdG90eXBlID0gbmV3IF9fKCk7XHJcbn07XHJcbnZhciBFeGNlcHRpb24gPSByZXF1aXJlKFwiLi9FeGNlcHRpb25cIik7XHJcblxyXG52YXIgT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcclxuICAgIF9fZXh0ZW5kcyhPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb24sIF9zdXBlcik7XHJcbiAgICBmdW5jdGlvbiBPcHRpb25zTm90U3VwcGxpZWRFeGNlcHRpb24oKSB7XHJcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgXCJPcHRpb25zIG11c3QgYmUgc3VwcGxpZWQuXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIE9wdGlvbnNOb3RTdXBwbGllZEV4Y2VwdGlvbjtcclxufSkoRXhjZXB0aW9uKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT3B0aW9uc05vdFN1cHBsaWVkRXhjZXB0aW9uO1xyXG4iLCJ2YXIgVXRpbGl0aWVzO1xyXG4oZnVuY3Rpb24gKFV0aWxpdGllcykge1xyXG4gICAgVXRpbGl0aWVzLnNlcmlhbGl6ZSA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgaWYgKCFfLmlzT2JqZWN0KGRhdGEpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF8uaXNOdWxsKGRhdGEpIHx8IF8uaXNVbmRlZmluZWQoZGF0YSkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgcGFyYW1ldGVycyA9IFtdO1xyXG5cclxuICAgICAgICBfLmVhY2goZGF0YSwgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcclxuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVycy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICByZXR1cm4gcGFyYW1ldGVycy5qb2luKFwiJlwiKTtcclxuICAgIH07XHJcbn0pKFV0aWxpdGllcyB8fCAoVXRpbGl0aWVzID0ge30pKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gVXRpbGl0aWVzO1xyXG4iXX0=
