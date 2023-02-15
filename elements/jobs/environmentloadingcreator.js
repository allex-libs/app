function createEnvironmentFunctionality (lib, DescriptorHandler, mylib) {
  'use strict';

  var q = lib.q,
    qlib = lib.qlib,
    SteppedJobOnSteppedInstance = qlib.SteppedJobOnSteppedInstance;

  function LoadEnvironmentJobCore (elem) {
    this.elem = elem;
    this.envLoader = null;
    this.envDesc = null;
  }
  LoadEnvironmentJobCore.prototype.destroy = function () {
    this.envDesc = null;
    this.envLoader = null;
    this.elem = null;
  };
  LoadEnvironmentJobCore.prototype.shouldContinue = function () {
    if (!this.elem) {
      throw new lib.Error('NO_ELEM', this.constructor.name+' needs to have elem');
    }
    if (!this.elem.destroyed) {
      throw new lib.Error('ELEMENT_DESTROYED', 'No Element to load Environment and Elements on');
    }
    if (!lib.isFunction(this.elem[this.environmentDescriptorMethodName])) {
      throw new lib.Error('NO_ENVIRONMENTDESCRIPTOR_METHOD', this.constructor.name+' needs to have a method named '+this.environmentDescriptorMethodName);
    }
  }
  LoadEnvironmentJobCore.prototype.init = function () {
    if (this.elem.createIntegrationEnvironmentDescriptor) {
      console.error(this.elem.constructor.name, 'has to move createIntegrationEnvironmentDescriptor to actualEnvironmentDescriptor')
      throw new lib.Error('IMPLEMENTATION_OBSOLETE', 'createIntegrationEnvironmentDescriptor is obsolete');
    }
    if (this.elem.lateElementDescriptors) {
      console.error(this.elem.constructor.name, 'has to move lateElementDescriptors to actualElementDescriptors')
      throw new lib.Error('IMPLEMENTATION_OBSOLETE', 'lateElementDescriptors is obsolete');
    }
  };
  LoadEnvironmentJobCore.prototype.getEnvironmentDescriptor = function () {
    return this.elem[this.environmentDescriptorMethodName](this.elem.myNameOnMasterEnvironment());
  };
  LoadEnvironmentJobCore.prototype.onEnvironmentDescriptor = function (envdesc) {
    this.envDesc = envdesc ? new DescriptorHandler(envdesc) : null;
  };
  LoadEnvironmentJobCore.prototype.createEnvironment = function () {
    if (!this.envDesc) {
      return null;
    }
    return this.envDesc.load();
  };
  LoadEnvironmentJobCore.prototype.onEnvironment = function (env) {
    this.envLoader = env;
  };
  LoadEnvironmentJobCore.prototype.finalize = function () {
    this.elem.loadedEnvironment[this.loadedEnvironmentPropertyName] = this.envLoader;
  };

  LoadEnvironmentJobCore.prototype.steps = [
    'init',
    'getEnvironmentDescriptor',
    'onEnvironmentDescriptor',
    'createEnvironment',
    'onEnvironment',
    'finalize'
  ];

  function LoadInitialEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadInitialEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadInitialEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'initialEnvironmentDescriptor';
  LoadInitialEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'initial';
  
  function LoadInitialEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadInitialEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadInitialEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadInitialEnvironment = LoadInitialEnvironmentJob;

  function LoadStaticEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadStaticEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadStaticEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'staticEnvironmentDescriptor';
  LoadStaticEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'static';
  
  function LoadStaticEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadStaticEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadStaticEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadStaticEnvironment = LoadStaticEnvironmentJob;

  function LoadActualEnvironmentJobCore (elem) {
    LoadEnvironmentJobCore.call(this, elem);
  }
  lib.inherit(LoadActualEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadActualEnvironmentJobCore.prototype.environmentDescriptorMethodName = 'actualEnvironmentDescriptor';
  LoadActualEnvironmentJobCore.prototype.loadedEnvironmentPropertyName = 'dynamic';

  function LoadActualEnvironmentJob (elem, defer) {
    SteppedJobOnSteppedInstance.call(this, new LoadActualEnvironmentJobCore(elem), defer);
  }
  lib.inherit(LoadActualEnvironmentJob, SteppedJobOnSteppedInstance);
  mylib.LoadActualEnvironment = LoadActualEnvironmentJob;


  function LoadAdHocEnvironmentJobCore (elem, envname) {
    LoadEnvironmentJobCore.call(this, elem);
    this.envname = envname;
    this.environmentDescriptorMethodName = 'environmentDescriptor_for_'+this.envname;
  }
  lib.inherit(LoadAdHocEnvironmentJobCore, LoadEnvironmentJobCore);
  LoadAdHocEnvironmentJobCore.prototype.destroy = function () {
    this.envname = null;
    LoadEnvironmentJobCore.prototype.destroy.call(this);
  };
  LoadAdHocEnvironmentJobCore.prototype.shouldContinue = function () {
    if (!lib.isString(this.envname)) {
      throw new lib.Error('NO_ENVNAME', this.constructor.name+' needs to have envname (String)');
    }
    return LoadEnvironmentJobCore.prototype.shouldContinue.call(this);
  };
  LoadAdHocEnvironmentJobCore.prototype.init = function () {
    var env;
    if (!this.elem.adHocEnvironments) {
      this.elem.adHocEnvironments = new lib.Map();
    }
    env = this.elem.adHocEnvironments.remove(this.envname);
    if (env) {
      env.destroy();
    }
    return LoadEnvironmentJobCore.prototype.init.call(this);
  }
  LoadAdHocEnvironmentJobCore.prototype.finalize = function () {
    this.elem.adHocEnvironments.add(this.envname, this.envLoader);
  };
  mylib.LoadAdHocEnvironmentJobCore = LoadAdHocEnvironmentJobCore;
}
module.exports = createEnvironmentFunctionality;