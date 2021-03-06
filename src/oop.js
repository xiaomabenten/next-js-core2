(function (nx, global) {

  var classId = 1,
    instanceId = 0;
  var NX_ANONYMOUS = 'nx.Anonymous';
  var arrayProto = Array.prototype;
  var slice = arrayProto.slice;
  var concat = arrayProto.concat;

  /**
   * Private
   * @returns {Array|Array.<T>|*}
   */
  function union() {
    var map = {};
    var result = concat.apply(arrayProto, arguments);
    return result.filter(function (val) {
      return !map[val.__type__] && (map[val.__type__] = true);
    });
  }

  function LifeCycle(inType, inMeta) {
    this.type = inType;
    this.meta = inMeta;
    this.base = inMeta.extends || nx.RootClass;
    this.module = inMeta.module;
    this.$base = this.base.prototype;
    this.__classMeta__ = {};
    this.__Class__ = null;
    this.__constructor__ = null;
  }

  LifeCycle.prototype = {
    constructor: LifeCycle,
    initMetaProcessor: function () {
      var methods = this.meta.methods || {};
      var statics = this.meta.statics || {};
      nx.mix(this.__classMeta__, {
        __type__: this.type,
        __meta__: this.meta,
        __base__: this.base,
        __module__: this.module,
        __classId__: classId++,
        __init__: methods.init || this.base.__init__,
        __static_init__: statics.init || this.base.__static_init__,
        __static_pure__: !this.meta.methods && !!this.meta.statics
      });
    },
    createClassProcessor: function () {
      var self = this;
      this.__Class__ = function () {
        var args = slice.call(arguments);
        this.__id__ = ++instanceId;
        this.__listeners__ = {};
        self.__constructor__.apply(this, args);
      };
    },
    mixinItemsProcessor: function () {
      var base = this.base;
      var mixins = this.meta.mixins || [];
      var classMeta = this.__classMeta__;
      var mixinMixins = [],
        mixinMethods = {},
        mixinProperties = {},
        mixinStatics = {},

        mixItemMixins = [],
        mixinItemMethods = {},
        mixinItemProperties = {},
        mixinItemStatics = {};

      nx.each(mixins, function (index, mixinItem) {
        mixItemMixins = mixinItem.__mixins__;
        mixinItemMethods = mixinItem.__methods__;
        mixinItemProperties = mixinItem.__properties__;
        mixinItemStatics = mixinItem.__statics__;

        mixinMixins = mixinMixins.concat(mixItemMixins);
        nx.mix(mixinMethods, mixinItemMethods);
        nx.mix(mixinProperties, mixinItemProperties);
        nx.mix(mixinStatics, mixinItemStatics);
      });

      classMeta.__mixins__ = union(mixinMixins, base.__mixins__, mixins);
      classMeta.__methods__ = nx.mix(mixinMethods, base.__methods__);
      classMeta.__properties__ = nx.mix(mixinProperties, base.__properties__);
      classMeta.__statics__ = nx.mix(mixinStatics, base.__statics__);
    },
    inheritProcessor: function () {
      var classMeta = this.__classMeta__;
      this.copyAtProps(classMeta);
      this.defineMethods(classMeta);
      this.defineProperties(classMeta);
      this.defineStatics(classMeta);
    },
    copyBaseProto: function () {
      this.__Class__.prototype.$base = this.$base;
    },
    copyAtProps: function (inClassMeta) {
      var prototype = this.$base;
      nx.each(prototype, function (name, prop) {
        if (name.indexOf('@') > -1) {
          this.__Class__.prototype[name] = prop;
        }
      }, this);
    },
    defineMethods: function (inClassMeta) {
      var methods = nx.mix(inClassMeta.__methods__, this.meta.methods);
      nx.defineMembers('method', this.__Class__.prototype, methods, inClassMeta.__mixins__);
    },
    defineProperties: function (inClassMeta) {
      var target = inClassMeta.__static_pure__ ? this.__Class__ : this.__Class__.prototype;
      var properties = nx.mix(inClassMeta.__properties__, this.meta.properties);
      nx.defineMembers('property', target, properties, inClassMeta.__mixins__);
    },
    defineStatics: function (inClassMeta) {
      var statics = nx.mix(inClassMeta.__statics__, this.meta.statics);
      nx.defineMembers('static', this.__Class__, statics, inClassMeta.__mixins__);
    },
    methodsConstructorProcessor: function () {
      var classMeta = this.__classMeta__;
      var mixins = classMeta.__mixins__;
      this.__constructor__ = function () {
        var args = slice.call(arguments);
        nx.each(mixins, function (_, mixItem) {
          mixItem.__init__.call(this);
        }, this);
        classMeta.__init__.apply(this, args);
      };
    },
    staticsConstructorProcessor: function () {
      var classMeta = this.__classMeta__;
      classMeta.__static_init__.call(this.__Class__);
    },
    registerNsProcessor: function () {
      var Class = this.__Class__;
      var type = this.type;
      var classMeta = this.__classMeta__;

      nx.mix(Class.prototype, classMeta, {constructor: Class});
      nx.mix(Class, classMeta);
      if (type !== (NX_ANONYMOUS + classId)) {
        nx.path(global, type, Class);
      }
    }
  };

  nx.declare = function (inType, inMeta) {
    var type = typeof(inType) === 'string' ? inType : (NX_ANONYMOUS + classId);
    var meta = inMeta || inType;
    var lifeCycle = new LifeCycle(type, meta);
    lifeCycle.initMetaProcessor();
    lifeCycle.createClassProcessor();
    lifeCycle.copyBaseProto();
    lifeCycle.mixinItemsProcessor();
    lifeCycle.inheritProcessor();
    lifeCycle.methodsConstructorProcessor();
    lifeCycle.staticsConstructorProcessor();
    lifeCycle.registerNsProcessor();
    return lifeCycle.__Class__;
  };

}(nx, nx.GLOBAL));
