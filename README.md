RestClient
==========

A REST-ful HTTP client for JavaScript. Your API can be easily described using simple JSON. Also provides convenient
wrapper methods to make easy GET, POST, PUT, and DELETE HTTP calls.

##### Dependencies:

* [lodash](http://lodash.com/): ~2.4.1
* [bluebird](https://github.com/petkaantonov/bluebird): ~2.3.2

##### Browser Support:

* IE9+
* Chrome 23+
* Firefox 21+

Examples:

```javascript
// GENERIC GET
RestClient.get("API URL", {
        data: {
            "JSON": "CONVERTED TO QUERYSTRING PARAMETERS"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// GENERIC POST
RestClient.post("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// GENERIC PUT
RestClient.put("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// GENERIC DELETE
RestClient.remove("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
```