(function (allex, module, namespace) {
  'use strict';

  var lib = allex.lib,
    SimpleDestroyable = lib.SimpleDestroyable,
    ChangeableListenable = lib.ChangeableListenable,
    Configurable = lib.Configurable,
    acomponent = allex.WEB_COMPONENT;
  //Let's start with basics: BasicDataSource should be a ground zero for any other DataSource

  function BasicDataSource (config) {
    SimpleDestroyable.call(this);
    ChangeableListenable.call(this);
    Configurable.call(this, config);
    this.data = null;

    //if (this.getConfigVal('auto_read')) this.readData(); //diskutabilno ...
    //this.readData();
  }
  lib.inherit(BasicDataSource, SimpleDestroyable);
  ChangeableListenable.addMethods(BasicDataSource);
  Configurable.addMethods(BasicDataSource);

  BasicDataSource.prototype.__cleanUp = function () {
    this.data = null;
    Configurable.prototype.__cleanUp.call(this);
    ChangeableListenable.prototype.__cleanUp.call(this);
    SimpleDestroyable.prototype.__cleanUp.call(this);
  };

  BasicDataSource.prototype.set_data = function (data) {
    this.data = data;
  };

  BasicDataSource.prototype.readData = function () {
    //within your read data procedure, you HAVE to call set_data method ...
    throw new lib.Error('NOT_IMPLEMENTED', 'readData was not implemented');
  };

  BasicDataSource.prototype.changeFilter = function (filter) {
    this.config.filter = filter;
    if (this.getConfigVal('auto_read')) this.readData();
  };

  namespace.BasicDataSource = BasicDataSource;
})(ALLEX, angular.module('allex_angular.datarenderercomponent'),ALLEX.web_components['allex_angular.datarenderercomponent']);
