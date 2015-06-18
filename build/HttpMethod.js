var HttpMethod;
(function (HttpMethod) {
    HttpMethod[HttpMethod["DELETE"] = 0] = "DELETE";
    HttpMethod[HttpMethod["GET"] = 1] = "GET";
    HttpMethod[HttpMethod["POST"] = 2] = "POST";
    HttpMethod[HttpMethod["PUT"] = 3] = "PUT";
})(HttpMethod || (HttpMethod = {}));
module.exports = HttpMethod;
