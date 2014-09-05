/**
 * Enumeration containing the supported HTTP protocol methods.
 */
enum HttpMethod {
    /**
     * Represents an HTTP DELETE protocol method.
     */
    Delete,
    /**
     * Represents an HTTP GET protocol method.
     */
    Get,
    /**
     * Represents an HTTP POST protocol method that is used to post a new entity as an addition to a URI.
     */
    Post,
    /**
     * Represents an HTTP PUT protocol method that is used to replace an entity identified by a URI.
     */
    Put
}

export = HttpMethod;