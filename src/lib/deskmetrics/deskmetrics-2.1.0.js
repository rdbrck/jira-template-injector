(function() {

  var deskMetricsFactory = (function(_window, _XMLHttpRequest) {

    var eventNameMaxLength = 64;
    var eventBodyMaxLength = 8999;
    var eventPropertyNameMaxLength = 255;

    var _options = {
      'baseUrl': 'https://analytics.pingstatsnet.com',
      'propertyKey': 'deskmetrics.properties',
      'landingPageDomain': null,
      'landingPagePropertyKey': 'deskmetrics.properties',
    }

    var _calledStart = false;
    var _propsLoaded = false;
    var _didStart = false;
    var _startCallback = null;

    var _props = {};
    var _sessionProps = {};

    var _eventQueue = [];
    var _sending = false;


    _window = _window || window;
    _XMLHttpRequest = _XMLHttpRequest || XMLHttpRequest;

    var _nullConsole = {
      assert: function() {},
      log: function() {},
      warn: function() {},
      error: function() {},
      debug: function() {},
      info: function() {}
    };
    var _console = _window.console || _nullConsole;

    function enableConsoleOutput(enabled) {
      _console = enabled ? _window.console : _nullConsole;
    }

    function _validateEventName(name) {
      if(!name)
        throw new Error('Empty event names are not allowed');
      if(name.length > eventNameMaxLength)
        throw new Error('Event name is too long: "' + name + '"');
    }

    function _validatePropertyName(key) {
      if(!key)
        throw new Error('Empty keys are not allowed');
      if(key.length > eventPropertyNameMaxLength)
        throw new Error('Property name is too long: "' + key + '"');
      if(key.indexOf('.') >= 0)
        throw new Error('Property names cannot contain dots: "' + key + '"');
    }

    function _validatePropertyNames(data) {
      for(var key in data) {
        if(!data.hasOwnProperty(key))
          continue;
        _validatePropertyName(key);
        if(typeof data[key] === 'object')
          _validatePropertyNames(data[key]);
      }
    }

    function generateClientUid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // Merge the properties of two or more objects
    // Thx go out to http://stackoverflow.com/a/8625261/996197
    function merge() {
      var obj = {},
        i = 0,
        il = arguments.length,
        key;
      for(; i < il; i++) {
        for(key in arguments[i]) {
          if(arguments[i].hasOwnProperty(key))
            obj[key] = arguments[i][key];
        }
      }
      return obj;
    }

    // getTimestamp
    // unix timestamp in milliseconds, retrieved from time endpoint
    // result passed as arg0 to callback: function(time)
    // zero is passed back in failure case.
    function getTimestamp(callback) {
      var timeRequest = new _XMLHttpRequest();
      timeRequest.open('GET', _options.baseUrl + '/time');
      timeRequest.onreadystatechange = function() {
        if(timeRequest.readyState == 4) {
          if(timeRequest.status == 200)
            callback(Math.round(parseInt(timeRequest.responseText) / 1000));
          else
            // An error, relay that by passing 0
            callback(0);
        }
      };
      timeRequest.send();
    }

    // Starts the DeskMetrics sdk.
    // globalProperties: A dictionay of properties to be included with all events.
    function start(options, callback) {

      if(_calledStart || _didStart) {
        _console.error('DeskMetrics is already started.');
        return;
      }
      if(!options || !options.appId) {
        _console.error('appId is a required option.');
        return;
      }

      _calledStart = true;

      _options = merge(_options, options);
      _startCallback = callback;

      // Session props
      _sessionProps['user_agent'] = _window.navigator.userAgent;
      _sessionProps['ua'] = '${is.ua:user_agent}';
      _sessionProps['ip_address'] = '${is.meta:request_ip}';
      _sessionProps['geo'] = '${is.meta:request_geo}';
      _sessionProps['version'] = '';

      if (_isExtension()) {
        _sessionProps['version'] = _window.chrome.runtime.getManifest().version;
      }

      // Props

      // Already loaded (From chrome.runtime.onInstalled)
      if (_propsLoaded) {
        _doStart();
      }

      // Try and load from storage
      else {

        _loadProps(_options.propertyKey, function(result) {

          if (result) {
            if (!_propsLoaded) {
              _props = merge(_props, result);
            }

            _propsLoaded = true;
            _doStart();
          }

          // Let chrome.runtime.onInstalled establish props
          // Fallback if this hasn't happened after 1s
          else if (_isExtension()) {

            _window.setTimeout(function () {

              _propsLoaded = true;
              _doStart();
            }, 1000);
          }

          // Establish client_uid and install_time props
          else {

            getTimestamp(function(ts) {

              var props = {};

              props['client_uid'] = generateClientUid();
              props['install_time'] = ts || Math.floor(Date.now() / 1000);
              props['cohort'] = '${is.cohort:install_time}';

              if (!_propsLoaded) {
                _props = merge(_props, props);
              }

              _propsLoaded = true;
              _doStart();
            });
          }
        });
      }

      // Send a heart_beat event at launch
      send('heart_beat', {});

      // Send a heart_beat event every 12 hours
      _window.setInterval(function() {
        sendEvent('heart_beat', {});
      }, 1000 * 60 * 60 * 12); // 12 hours
    }

    function getProperty(name) {
      return _props[name];
    }

    function setProperty(name, value) {
      try {
        _validatePropertyName(name);
      } catch(error) {
        _console.error('Invalid property name: ' + error);
        return;
      }
      _props[name] = value;
      _saveProps(_options.propertyKey, _props);
    }

    // Sends an analytics event.
    // name: The name of the event (required)
    // data: A json object of additional event properties (optional)
    // requestDone: A function to be called when the xhr request is complete.  Receives the xhr object as a parameter. (optional)
    function send(name, data, requestDone) {
      try {
        _validateEventName(name);
      } catch(error) {
        _console.error('Invalid event name: ' + error);
        return;
      }

      var body = typeof data === 'object' ? data : {};
      var callback = typeof data === 'function' ? data : requestDone
      
      try {
        _validatePropertyNames(body);
      } catch(error) {
        _console.error('Invalid event data:', error);
        return;
      }
      
      _eventQueue.push([name, body, callback]);
      _processEvents();
    }

    // Private methods from here on:

    function _isExtension() {
      return (typeof(_window.chrome) == 'object' && typeof(_window.chrome.runtime) == 'object' && typeof(_window.chrome.runtime.getManifest) == 'function' && typeof(_window.chrome.runtime.getManifest()) == 'object');
    }

    // Takes the next item from the queue and send it.
    function _processEvents() {
      if(!_didStart || !_options.appId || _sending || _eventQueue.length === 0)
        return;

      _sending = true;
      var item = _eventQueue.shift();

      _sendImmediate(item[0], item[1], function(xhr) {
        if(item[2])
          item[2](xhr);
        _sending = false;
        _window.setTimeout(_processEvents, 0);
      });
    }

    // The actual send function
    function _sendImmediate(name, data, requestDone) {
      var r = new _XMLHttpRequest();
      r.open('POST', _options.baseUrl + '/v1/projects/' +
        _options.appId + '/events/' + encodeURIComponent(name) + '/', true);
      r.setRequestHeader('Content-type', 'application/json');
      r.onreadystatechange = function() {
        if(r.readyState == 4) {
          _console.debug('Done sending:', name);
          requestDone(r);
        }
      };
      _console.debug('Sending:', name);
      r.send(JSON.stringify(merge(_sessionProps, _props, data)));
    }

    // Invoke the start callback and start sending events
    function _doStart() {
      
      if(!_calledStart || !_propsLoaded || _didStart) {
        return;
      }

      _didStart = true;

      _saveProps(_options.propertyKey, _props);

      if (_startCallback && typeof(_startCallback) == 'function') {
        _startCallback();
      }

      _processEvents();
      _console.log('DeskMetrics is ready to send events!');
      _console.log(_props);
    }

    // Get cookie utility function
    function _getCookie(cname) {
      var name = cname + '=';
      var ca = _window.document.cookie.split(';');
      for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while(c.charAt(0) === ' ')
          c = c.substring(1);
        if(c.indexOf(name) === 0)
          return c.substring(name.length, c.length);
      }
      return '';
    }

    // Set cookie utility function
    function _setCookie(cname, cvalue, exdays) {
      var d = new Date();
      d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
      var expires = 'expires=' + d.toUTCString();
      _window.document.cookie = cname + '=' + cvalue + '; ' + expires;
    }

    // Load properties
    function _loadProps(key, callback) {
      callback = callback || function() {};
      try {

        var props = null;

        // document.cookie
        try {
          var s = _getCookie(key);
          if (s) {
            props = merge(props, JSON.parse(s));
          }
        }
        catch(e) {}

        // localStorage
        try {
          var s = _window.localStorage.getItem(key);
          if (s) {
            props = merge(props, JSON.parse(s));
          }
        }
        catch(e) {}

        // chrome.storage
        if (_isExtension()) {
          
          _window.chrome.storage.local.get(key, function(items) {
            if (items && items[key]) {
              props = merge(props, items[key]);
            }

            callback(props);
          });
        }
        else {
          callback(props);
        }
      }
      catch (e) {
        callback();
      }
    }

    // Save properties
    function _saveProps(key, props, callback) {
      callback = callback || function() {};
      try {

        var s = JSON.stringify(props);

        // document.cookie
        _setCookie(key, s, 1000);

        // localstorage
        _window.localStorage.setItem(key, s);
        
        // chrome.storage
        if (_isExtension()) {
          var obj = {};
          obj[key] = props;
          _window.chrome.storage.local.set(obj, callback);
        }
        else {
          callback();
        }
      }
      catch (e) {
        callback();
      }
    }

    // Chrome extension - load properties from LocalStorage on the given domain
    function _loadPropsLocalStorageEx(domain, key, callback) {
      callback = callback || function() {};
      try {
        _window.chrome.tabs.query({ url: "*://*." + domain + "/*" }, function (tabs) {
          if (tabs.length > 0) {
            var remaining = tabs.length;
            var props = {};
            for (var i = tabs.length; i > 0; i--) {
              _window.chrome.tabs.executeScript(
                tabs[i - 1].id,
                { code: 'localStorage.getItem("' + key + '");' },
                function(results) {
                  for (var j = 0; j < results.length; j++) {
                    props = merge(props, JSON.parse(results[j]));
                    _console.log('Got ' + key + ' properties from ' + domain + ' _window.localStorage.');
                  }
                  --remaining;
                  if (remaining <= 0) {
                    callback(props);  
                  }
                });
            }
          }
          else {
            callback();
          }
        });
      }
      catch(e) {
        _console.error('Error: failed to get ' + key + ' properties from ' + domain + ' _window.localStorage.', e);
        callback();
      }
    }

    // Chrome extension - load properties from Cookie on the given domain
    function _loadPropsCookieEx(domain, key, callback) {
      callback = callback || function() {};
      try {
        _window.chrome.cookies.getAll({ "domain": domain, "name": key }, function (cookieArray) {
          var props = {}
          for (var i = 0; i < cookieArray.length; i++) {
            props = merge(props, JSON.parse(cookieArray[i].value));
            _console.log('Got ' + key + ' properties from ' + domain + ' cookie.');
          }
          callback(props);
        });
      }
      catch (e) {
        _console.error('Error: failed to get ' + key + ' properties from ' + domain + ' cookie.', e);
        callback();
      }
    }

    // Chrome runtime.onInstalled
    if (_isExtension()) {
      _window.chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason == 'install') {

          getTimestamp(function(ts) {

            var props = {};

            props['client_uid'] = generateClientUid();
            props['install_time'] = ts || Math.floor(Date.now() / 1000);
            props['cohort'] = '${is.cohort:install_time}';

            // Get inline install props
            if(_options.landingPageDomain) {
              _loadPropsCookieEx(_options.landingPageDomain, _options.landingPagePropertyKey, function(result) {
                if (result) {
                  props = merge(props, result);
                }
                _loadPropsLocalStorageEx(_options.landingPageDomain, _options.landingPagePropertyKey, function(result) {
                  if (result) {
                    props = merge(props, result);
                  }

                  if (!_propsLoaded) {
                    _props = merge(_props, props);
                  }

                  _propsLoaded = true;
                  _doStart();
                });
              });
            } else {
              _propsLoaded = true;
              _doStart();
            }
          });

          // Send install
          send('install', { 'state': 'succeeded' });
        }
        else if (details.reason == 'update') {
          // Send update
          send('update', {});
        }
      });
    }

    return {
      enableConsoleOutput: enableConsoleOutput,
      generateClientUid: generateClientUid,
      merge: merge,
      getTimestamp: getTimestamp,
      start: start,
      getProperty: getProperty,
      setProperty: setProperty,
      send: send
    };
  });

  if(typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = deskMetricsFactory;
  } else if(typeof define === 'function' && define.amd) {
    define([], function() {
      return deskMetricsFactory(window, XMLHttpRequest);
    });
  } else {
    window.$dm = deskMetricsFactory(window, XMLHttpRequest);
  }

})();
