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
