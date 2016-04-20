/**
 * @license Angular Sails Socket
 * (c) 2015 Bethel Technologies, LLC http://getbethel.com
 * License: MIT
 */
if (typeof io !== 'undefined' && io.sails) {
  io.sails.autoConnect = false;
}

angular.module('bethel.sailsSocket', []).provider('sailsSocket', function() {

  if (typeof io === 'undefined' || !io.sails) throw new Error('Missing required `sails.io.js` dependency.');

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
    transports: ['polling', 'websocket']
  };

  var sailsSocket = this;

  this.$get = ['$http', '$q', '$rootScope', function($http, $q, $rootScope) {

    var socket = (io.sails && io.sails.connect || io.connect)(sailsSocket.url, sailsSocket.config);

    if (this.csrf !== false) {
      $http.get('/csrfToken').success(function(data) {
        if (!data) {
          sailsSocket.csrf = false;
          return;
        }
        sailsSocket.csrf = data._csrf;
      });
    }

    function populateQuery(from, params, many) {
      if (from[0] !== '/') from = '/'.concat(from);
      sailsSocket.outstanding++;
      var result = many ? [] : {};
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

    function findIndexById(arr, id) {
      var found = null;
      angular.forEach(arr, function(value, index) {
        if (value.id === id) found = index;
      });
      return found;
    }

    return {

      io: socket,

      get: function(where) {
        return $q(function(resolve, reject) {
          socket.get(where, function(data, response) {
            return (response.statusCode < 400) ? resolve(data) : reject(data);
          });
        });
      },

      post: function(where, what) {
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.post(where, what, function(data, response) {
            return (response.statusCode < 400) ? resolve(data) : reject(data);
          });
        });
      },

      put: function(where, what) {
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.put(where, what, function(data, response) {
            return (response.statusCode < 400) ? resolve(data) : reject(data);
          });
        });
      },

      delete: function(where, what) {
        what = what || {};
        what._csrf = sailsSocket.csrf;
        return $q(function(resolve, reject) {
          socket.delete(where, what, function(data, response) {
            return (response.statusCode < 400) ? resolve(data) : reject(data);
          });
        });
      },

      editable: function(scope, what, editableFields, cb) {
        cb = cb || function() {};
        scope.$watch(what, function(newValue, oldValue) {
          if (!newValue || !oldValue) return;
          var payload = {};

          for (var i = 0, len = editableFields.length; i < len; i++) {
            var field = editableFields[i];

            if (angular.isUndefined(newValue[field]) || (angular.isDefined(oldValue[field]) && newValue[field].toString() === oldValue[field].toString())) {
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

          for (var field in message.data) {
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

          case 'destroyed':
            var deleteIndex = findIndexById(scope, message.id);
            if (deleteIndex !== null) {
              scope.splice(deleteIndex, 1);
            }
            break;

          case 'updated':
            var updateIndex = findIndexById(scope, message.id);
            if (updateIndex !== null) {
              angular.extend(scope[updateIndex], message.data);
            }
            break;

          default: return console.log('Unhandled socket action: ' + message.verb);

          }
          $rootScope.$apply();
          if (typeof cb === 'function') cb();
        });
      }

    };

  }];

});
