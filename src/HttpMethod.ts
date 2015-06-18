/**
 * Enumeration containing the supported HTTP protocol methods.
 */
enum HttpMethod {
    /**
     * Represents an HTTP DELETE protocol method.
     */
    DELETE,
    /**
     * Represents an HTTP GET protocol method.
     */
    GET,
    /**
     * Represents an HTTP POST protocol method that is used to post a new entity as an addition to a URI.
     */
    POST,
    /**
     * Represents an HTTP PUT protocol method that is used to replace an entity identified by a URI.
     */
    PUT
}

export = HttpMethod;