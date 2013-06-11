var async = async || {};
var $ = $ || async;

async.Deferred = function () {

    var states = {
        "PENDING"  : "pending",
        "RESOLVED" : "resolved",
        "REJECTED" : "rejected"
    };

    function Deferred() {
        this.state  = states.PENDING;
        this.result = null;
        this.callbacks = [];
        return this;
    }

    Deferred.prototype.addCallback = function (resolved, rejected, progress) {
        this.callbacks.push({
            "resolved" : resolved,
            "rejected" : rejected,
            "progress" : progress
        });
        this.fire();
        return this;
    };

    Deferred.prototype.fire = function () {
        if (this.state === states.PENDING) {
            return this;
        }

        var callbacks = this.callbacks;
        this.callbacks = [];

        for (var i = 0 ; i < callbacks.length ; ++i) {
            if (callbacks[i][this.state] && typeof(callbacks[i][this.state]) === 'function') {
                callbacks[i][this.state](this.result);
            }
        }
        return this;
    };


    Deferred.prototype.resolve = function (result) {
        if (this.state !== states.PENDING) {
            throw new Error('Deferred is already ' + (this.state === states.RESOLVED ? 'RESOLVED' : 'REJECTED'));
        }
        this.state  = states.RESOLVED;
        this.result = result;
        this.fire();
        return this;
    };

    Deferred.prototype.reject = function (result) {
        if (this.state !== states.PENDING) {
            throw new Error('Deferred is already ' + (this.state === states.RESOLVED ? 'RESOLVED' : 'REJECTED'));
        }
        this.state  = states.REJECTED;
        this.result = result;
        this.fire();
        return this;
    };

    Deferred.prototype.always = function (callback) {
        this.addCallback(callback, callback);
        this.fire();
        return this;
    };
    Deferred.prototype.done = function (resolved) {
        this.addCallback(resolved);
        this.fire();
        return this;
    };
    Deferred.prototype.fail = function (rejected) {
        this.addCallback(null, rejected);
        this.fire();
        return this;
    };

    Deferred.prototype.then = function (resolved, rejected, progress) {
        this.addCallback(resolved, rejected, progress);
        this.fire();
        return this;
    };

    Deferred.prototype.promise = function () {
        return new Promise(this);
    }

    ////////////////////////////////// PROMISE ////////////////////////////////

    function Promise(deferred) {
        this.deferred = deferred;
        return this;
    }

    Promise.prototype.always = function () {
        this.deferred.always.apply(this.deferred, arguments);
        return this;
    };
    Promise.prototype.done = function () {
        this.deferred.done.apply(this.deferred, arguments);
        return this;
    };
    Promise.prototype.fail = function () {
        this.deferred.fail.apply(this.deferred, arguments);
        return this;
    };

    Promise.prototype.then = function () {
        this.deferred.then.apply(this.deferred, arguments);
        return this;
    };

    Promise.prototype.isRejected = function () {
        return (this.dererred.state === states.REJECTED);
    };

    Promise.prototype.isResolved = function () {
        return (this.dererred.state === states.RESOLVED);
    };


    return Deferred;
}();

async.ajax = function () {

    function Ajax(options) {
        options      = options || {};
        this.debug   = options.debug || true;
        this.xmlhttp = new XMLHttpRequest();
        return this;
    }

    Ajax.prototype.sendRequest = function (options) {
        var $this       = this,
            deferred    = new async.Deferred(),
            defaultOpts = {
                "url"         : null,
                "type"        : "GET",
                "data"        : null,
                "dataType"    : "json", // What we are expecting from the server
                "contentType" : "application/json; charset=utf-8", // the body of this request
                "beforeSend"  : null   // function (request) { request.setRequestHeader("api_key", header.nvc.nmaid); }
            };

        // setRequestHeader("Content-type","application/x-www-form-urlencoded");

        var opts = {};
        for (var key in defaultOpts) {
            opts[key] = options[key] ? options[key] : defaultOpts[key];
        }
        if ($this.debug) console.log('DEBUG|Ajax|',opts);
        this.xmlhttp.onreadystatechange = function () {
            console.log('INFO|onreadystatechange|readyState:',$this.xmlhttp.readyState);
            switch ($this.xmlhttp.readyState) {
                case 0: // request not initialized
                    if ($this.debug) console.log('DEBUG|Ajax|readyState:0|Request not initialized yet');
                    break;
                case 1: // server connection established
                    if ($this.debug) console.log('DEBUG|Ajax|readyState=1|Server connection established');
                    break;
                case 2: // request received
                    if ($this.debug) console.log('DEBUG|Ajax|readyState=2|Request received');
                    break;
                case 3: // processing request
                    if ($this.debug) console.log('DEBUG|Ajax|readyState=3|Processing request');
                    break;
                case 4: // request finished and response is ready
                    if ($this.debug) console.log('DEBUG|Ajax|readyState=4|Request finished and response is ready');
                    if ($this.xmlhttp.status >= 200 && $this.xmlhttp.status < 300) {
                        var json;
                        try {
                            json = JSON.parse($this.xmlhttp.responseText);
                            deferred.resolve(json);
                        } catch (e) {
                            deferred.reject('INVALID JSON');
                        }
                    } else {
                        deferred.reject($this.xmlhttp.status);
                    }
                    break;
                default:
                    console.log('ERROR|Ajax|readyState:' + this.xmlhttp.readyState + '|expected=0,1,2,3,4');
                    break;
            }
        }

        this.xmlhttp.open(opts.type, opts.url, true);
        if (opts.contentType) {
            this.setRequestHeader('Content-type', opts.contentType);
        }
        if (opts.beforeSend && typeof(opts.beforeSend) === 'function') {
            opts.beforeSend($this);
        }
        if (opts.data)
            this.xmlhttp.send(opts.data);
        else
            this.xmlhttp.send();
        if ($this.debug) console.log('DEBUG|Ajax|request-sent');
        return deferred.promise();
    }


    Ajax.prototype.get = function(url) {
        return this.request('GET', url);
    };

    Ajax.prototype.post = function(url) {
        return this.request('POST', url);
    };

    Ajax.prototype.put = function(url) {
        return this.request('PUT', url);
    };

    Ajax.prototype.delete = function(url) {
        return this.request('DELETE', url);
    };

    Ajax.prototype.setRequestHeader = function (key, value) {
        this.xmlhttp.setRequestHeader(key, value);
        return this;
    };

    return function (options) {
        var ajax = new Ajax(options);
        console.log('DEBUG|Ajax|sendRequest:', options);
        return ajax.sendRequest(options);
    };

}();



