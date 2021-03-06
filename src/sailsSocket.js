/**
 * @license Angular Sails Socket
 * (c) 2015 Bethel Technologies, LLC http://getbethel.com
 * License: MIT
 */
if (typeof io !== 'undefined' && io.sails) {
  io.sails.autoConnect = false;
}

angular.module('bethel.sailsSocket', []).provider('sailsSocket', function() {
  if (typeof io === 'undefined' || !io.sails) {
    throw new Error('Missing required `sails.io.js` dependency.');
  }

  // On sites which require a CSRF token, this can be injected in each request.
  // If your site is configured to not use a CSRF token, set this to `false` to
  // prevent automatically fetching the token from the backend.
  this.csrf = undefined;

  // This defaults to the current hostname but can be customized if socket
  // requests are being sent over a different hostname.
  this.url = undefined;

  // Configuration of the socket.io.js library can be customized here.
  // For example, production applications may want to disable polling.
  // @see http://sailsjs.org/documentation/reference/web-sockets/socket-client#?configuring-the-sailsiojs-library
  this.config = {
    environment: 'development',
    transports: ['polling', 'websocket'],
  };

  const sailsSocket = this;

  this.$get = ['$http', '$q', '$rootScope', function($http, $q, $rootScope) {
    const connect = io.sails && io.sails.connect || io.connect;
    const socket = connect(sailsSocket.url, sailsSocket.config);

    if (this.csrf !== false) {
      $http.get('/csrfToken').then(function(response) {
        if (!response.data) {
          sailsSocket.csrf = false;
          return;
        }
        sailsSocket.csrf = response.data._csrf;
      });
    }

    /**
     * Helper function to populate a socket request to either an array or an
     * object depending on whether one or multiple items are requested.
     * @param {string} from - The URL to request over sockets.
     * @param {object} params - The payload to include with the request.
     * @param {Boolean} many - If `true`, request expected to return an array.
     * @return {Object|Array} - An empty object or array that becomes populated
     * as the socket request is fulfilled.
     */
    function populateQuery(from, params, many) {
      if (from[0] !== '/') from = '/'.concat(from);
      sailsSocket.outstanding++;
      let result = many ? [] : {};
      socket.get(from, params, function(data) {
        angular.forEach(data, function(item, index) {
          if (many) {
            result.push(item);
          } else {
            result[index] = item;
          }
        });
        sailsSocket.outstanding--;
        $rootScope.$apply();
      });
      return result;
    }

    /**
     * Search an array to find an object by it's `id` property.
     * @param {Object[]} arr - The array to search.
     * @param {string|number} id - The `id` property to match.
     * @return {number} - The location of the object in the array.
     */
    function findIndexById(arr, id) {
      let found = null;
      angular.forEach(arr, function(value, index) {
        if (value.id === id) found = index;
      });
      return found;
    }

    /**
     * Private helper to broadcast and reject when an error is encountered.
     * Among other things, this can be used to detect `403` responses and
     * display a login screen.
     * @param {Promise.Error} rejectPromise - The reject callback.
     * @param {Object} response - Data received in the response.
     * @param {Object} data - A JSON WebSocket Response object.
     * @return {Promise.Error} - Promise rejected.
     */
    function handleError(rejectPromise, response, data) {
      $rootScope.$broadcast('sailsSocket:error', response, data);
      return rejectPromise(data);
    }

    return {

      io: socket,

      get: function(where) {
        return $q(function(resolve, reject) {
          socket.get(where, function(data, response) {
            return (response.statusCode < 400) ?
              resolve(data) : handleError(reject, response, data);
          });
        });
      },

      post: function(where, what) {
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.post(where, what, function(data, response) {
            return (response.statusCode < 400) ?
              resolve(data) : handleError(reject, response, data);
          });
        });
      },

      put: function(where, what) {
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.put(where, what, function(data, response) {
            return (response.statusCode < 400) ?
              resolve(data) : handleError(reject, response, data);
          });
        });
      },

      delete: function(where, what) {
        what = what || {};
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.delete(where, what, function(data, response) {
            return (response.statusCode < 400) ?
              resolve(data) : handleError(reject, response, data);
          });
        });
      },

      editable: function(scope, what, editableFields, cb) {
        cb = cb || function() {};
        scope.$watch(what, function(newValue, oldValue) {
          if (!newValue || !oldValue) return;
          let payload = {};

          for (let i = 0, len = editableFields.length; i < len; i++) {
            let field = editableFields[i];

            if (angular.isUndefined(newValue[field]) || (
              angular.isDefined(oldValue[field]) &&
              newValue[field].toString() === oldValue[field].toString()
            )) {
              continue;
            }

            payload[field] = newValue[field];
          }

          if (Object.keys(payload).length <= 0) return;
          payload._csrf = sailsSocket.csrf;
          socket.put('/' + what + '/' + scope[what].id, payload, cb);
        }, true);
      },

      populateOne: function(from, params) {
        return populateQuery(from, params);
      },

      populateMany: function(from, params) {
        return populateQuery(from, params, true);
      },

      sync: function(scope, model, cb) {
        if (Array.isArray(scope)) {
          return this.syncMany(scope, model, cb);
        }

        this.syncOne(scope, model, cb);
      },

      syncOne: function(scope, model, cb) {
        socket.on(model, function(message) {
          if (scope.id !== message.id || message.verb !== 'updated')
            return;

          for (let field in message.data) {
            if (message.data.hasOwnProperty(field)) {
              if (field === '_csrf') continue;
              scope[field] = message.data[field];
            }
          }

          $rootScope.$apply();
          if (typeof cb === 'function') cb();
        });
      },

      syncMany: function(scope, model, cb) {
        // Example messages:
        //   {model: "task", verb: "created", data: Object, id: 25}
        //   {model: "task", verb: "updated", data: Object, id: 3}
        //   {model: "task", verb: "destroyed", id: 20}
        socket.on(model, function(message) {
          switch (message.verb) {
            case 'created':
              if (findIndexById(scope, message.id) !== null) return;
              scope.unshift(message.data);
              break;

            case 'destroyed': {
              const deleteIndex = findIndexById(scope, message.id);
              if (deleteIndex !== null) {
                scope.splice(deleteIndex, 1);
              }
              break;
            }

            case 'updated': {
              const updateIndex = findIndexById(scope, message.id);
              if (updateIndex !== null) {
                angular.extend(scope[updateIndex], message.data);
              }
              break;
            }
            default: console.log(`Unhandled socket action: ${message.verb}`);
          }
          $rootScope.$apply();
          if (typeof cb === 'function') cb();
        });
      },

    };
  }];
});
