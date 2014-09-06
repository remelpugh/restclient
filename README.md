RestClient
==========

A REST-ful HTTP client for JavaScript. Your API can be easily described using simple JSON. Also provides convenient
wrapper methods to make easy GET, POST, PUT, and DELETE HTTP calls.

##### Browser

Download the latest [RestClient.js](https://raw.githubusercontent.com/remelpugh/restclient/master/dist/RestClient.js) file. 
Minified [here](https://raw.githubusercontent.com/remelpugh/restclient/master/dist/RestClient.min.js)

##### Dependencies:

* [lodash](http://lodash.com/): ~2.4.1
* [bluebird](https://github.com/petkaantonov/bluebird): ~2.3.2

##### Browser Support:

* IE9+
* Chrome 23+
* Firefox 21+

### Setup
Create a new RestClient passing in the schema description of your API.

```javascript
var client = new RestClient({
        config: {
                baseApiUrl: "http://localhost/api",    // required
                cacheData: true                        // OPTIONAL: indicate if data should be cached to localStorage
        },
        schema: {
                country: {
                        autoGenerateCrud: true         // OPTIONAL: if true add, updating, deleting countries will be created
                        url: "/country"                 // required
                },
                countryPaged: {
                        args: ["page", "size", "q"],   // OPTIONAL: arguments that can be passed to function
                        parse: function(data) {        // OPTIONAL: a callback to provide extra data parsing
                                return data.Results    // data.Results would contain the actual list of countries
                        },
                        sort: {                        // OPTIONAL: can also be an array of sort options
                                direction: "desc",     // valid options "asc", "desc"
                                field: "States.length" // a property of the data return dot notation is possible 
                        }
                        url: "/country"                 // required
                },
                statesByCountry: {
                        args: ["id", "page", "size"],   // OPTIONAL: arguments that can be passed to function
                        url: "/country/{0}/states"      // required, when using the .NET string format notation arguments
                                                        // passed in will become part of the url, in this example on the
                                                        // "id" parameter will be part of the url the rest will be query
                                                        // string paraemters
                }
        }
});

// get all countries
client.country().then(function(data) {
        // JSON array of countries
}).catch(function(e) {
        // catch any possible unhandled exceptions
}).error(function(error) {
        // will reach here if the API returns a status code that isn't a 200
});

// add new country
client.postCountry({
        name: "NEW COUNTRY"
}).then(function(data) {
        // add was successful
}).catch(function(e) {
        // catch any possible unhandled exceptions
}).error(function(error) {
        // will reach here if the API returns a status code that isn't a 200
});

// get country by id
client.country(1).then(function(data) {
        // JSON country
}).catch(function(e) {
        // catch any possible unhandled exceptions
}).error(function(error) {
        // will reach here if the API returns a status code that isn't a 200
});

client.statesByCountry(1, 0, 5).then(data) {
        // JSON array of states
}).catch(function(e) {
        // catch any possible unhandled exceptions
}).error(function(error) {
        // will reach here if the API returns a status code that isn't a 200
});
```

##### Generic Examples:

```javascript
// GET
RestClient.get("API URL", {
        data: {
            "JSON": "CONVERTED TO QUERYSTRING PARAMETERS"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// POST
RestClient.post("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// PUT
RestClient.put("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
    
// DELETE
RestClient.remove("API URL", {
        data: {
            "JSON": "SENT IN BODY"
        }
    }).then(function (data) {
        // data is the raw response from the server
    });
```
