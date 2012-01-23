var fc = (function () {
  var stage = null;
  var beans = new Object();

  var fc = function (context, propertyName) {
    var that = this;
    if (context.__meta == undefined) {
      context.__meta = {
        postConstructListeners:new Array(),
        dependencies:new Array(),
        eventHandlers:new Object()
      };
    }

    this.context = function (value) {
      if (value == undefined) {
        return context;
      }
      context = value;
      return this;
    };


    this.inject = function (what) {
      context.__meta.dependencies.push({propertyName:propertyName, dependencyName:what});
      return this;
    };

    this.postConstruct = function () {
      context.__meta.postConstructListeners.push(propertyName);
      return this;
    };

    this.eventHandler = function (eventDefinition) {
      if (typeof eventDefinition == 'string') {
        eventDefinition = {event:eventDefinition};
      }
      if (eventDefinition.properties == undefined) {
        eventDefinition.properties = new Array();
      }

      if (context.__meta.eventHandlers[eventDefinition.event] == undefined) {
        context.__meta.eventHandlers[eventDefinition.event] = new Array();
      }
      eventDefinition.propertyName = propertyName;
      context.__meta.eventHandlers[eventDefinition.event].push(eventDefinition);
      return this;
    };

    return this;
  };

  /////////////////////////////////////////Stage
  fc.stage = function (value) {
    if (!value) {
      return stage;
    }
    stage = value;
    stage.__oldDispatchEvent = stage.dispatchEvent;
    stage.dispatchEvent = function (event) {
      stage.__oldDispatchEvent(event);
      fc.dispatchEvent(event);
    };
  };

  /////////////////////////////////////////Beans

  function initBean(bean, name) {
    var i;
    if (!bean.__meta) {
      return;
    }
    for (i in bean.__meta.dependencies) {
      if (!bean.__meta.dependencies.hasOwnProperty(i)) {
        continue;
      }
      var dep = bean.__meta.dependencies[i];
      bean[dep.propertyName] = beans[dep.dependencyName];
    }
    for (i in bean.__meta.postConstructListeners) {
      if (!bean.__meta.postConstructListeners.hasOwnProperty(i)) {
        continue;
      }
      var propName = bean.__meta.postConstructListeners[i];
      bean[propName].call(bean);
    }
    for (var eventName in bean.__meta.eventHandlers) {
      if (!bean.__meta.eventHandlers.hasOwnProperty(eventName)) {
        continue;
      }
      var handlers = bean.__meta.eventHandlers[eventName];
      for (var handlerName in handlers) {
        if (!handlers.hasOwnProperty(handlerName)) {
          continue;
        }
        var eventDefinition = handlers[handlerName];

        fc.on(eventName, (function (eventDefinition) {
          return function (event) {
            var properties = new Array();
            for (var i in eventDefinition.properties) {
              if (!eventDefinition.properties.hasOwnProperty(i)) {
                continue;
              }
              var propertyName = eventDefinition.properties[i];
              properties.push(event[propertyName]);
            }
            bean[eventDefinition.propertyName].apply(bean, properties)
          }

        })(eventDefinition));
      }
    }
  }

  fc.beans = function (value) {
    beans = value;
    for (var i in beans) {
      if (!beans.hasOwnProperty(i)) {
        continue;
      }
      initBean(beans[i], i);
    }
  };

  ////////////////////////Listeners

  var listeners = new Object();

  function getListeners(eventType) {
    if (listeners[eventType] == undefined) {
      listeners[eventType] = new Array();
    }
    return listeners[eventType];
  }

  fc.on = function (eventType, callback) {
    var callbacks = getListeners(eventType);
    callbacks.push(callback);
  };

  fc.dispatchEvent = function (event) {
    var callbacks = getListeners(event.type);
    for (var i in callbacks) {
      if (callbacks.hasOwnProperty(i)) {
        callbacks[i](event);
      }
    }
  };

  fc.on('addedToStage', function (event) {
    initBean(event.target);
  });

  return fc;
})();