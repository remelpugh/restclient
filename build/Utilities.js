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
