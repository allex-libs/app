function createFormMixin (lib) {
  'use strict';

  function possiblyBuildRegExp (obj, val, name) {
    if (name === 'regex') {
      if (lib.isString(val)) {
        obj[name] = new RegExp(val);
      }
      if (val && 'object' === typeof val && 'string' in val && 'flags' in val && lib.isString(val.string)) {
        obj[name] = new RegExp(val.string, val.flags);
      }
    }
  }

  function possiblyBuildRegExps1 (val, name) {
    if ('object' !== typeof val) {
      return;
    }
    lib.traverseShallow(val, possiblyBuildRegExp.bind(null, val));
    val = null;
  }

  function possiblyBuildRegExps (obj) {
    if (!obj) {
      return;
    }
    lib.traverseShallow(obj, possiblyBuildRegExps1);
    obj = null;
  }

  function FormMixin (id, options) {
    this.$form = null;
    this.change = new lib.HookCollection();
    this.submit = new lib.HookCollection();
    this.partialSubmit = new lib.HookCollection();
    this.valid = null;
    this.validfields = {}; 
    this.initial = options ? options.initial : null;
    this.ftion_status = null;
    this.progress = null;
    this.array_keys = options ? options.array_keys : null;
    this._default_values = {};
    possiblyBuildRegExps(this.getConfigVal('validation'));
  }
  FormMixin.prototype.destroy = function () {
    this._default_values = null;
    this.array_keys = null;
    this.progress = null;
    this.ftion_status = null;
    this.initial = null;
    this.validfields = null;
    this.valid = false;
    if (this.partialSubmit) {
      this.partialSubmit.destroy();
    }
    this.partialSubmit = null;
    if (this.submit) {
      this.submit.destroy();
    }
    this.submit = null;
    if (this.change) {
      this.change.destroy();
    }
    this.change = null;
    this.$form = null;
  };
  FormMixin.prototype._setInitial = function (ext) {
    this.set('data', lib.extend ({}, this.initial, ext));
    for (var i in this.initial) {
      this.change.fire(i, this.initial[i]);
    }
  };
  FormMixin.prototype._onChanged = function (data, field, name) {
    this.changed.fire('data', data);
    this.change.fire(field, name);
  };
  FormMixin.prototype.resetElement = function (ext) {
    BasicAngularElement.prototype.resetElement.call(this, ext);
    this.resetForm(ext);
  };
  FormMixin.prototype.resetForm = function (ext) {
    this._setInitial(ext);
  };
  FormMixin.prototype.set_valid = function (val) {
    if (this.valid === val) return false;
    this.valid = val;
    return true;
  };

  FormMixin.prototype.set_ftion_status = function (val) {
    var was_active = false, closeOnSuccess;
    if (val) {
      if (this.ftion_status) {
        was_active = this.ftion_status.working && val.result;
      }else{
        if (val.result){
          was_active = true;
        }
      }
    }
    this.ftion_status = val;
    closeOnSuccess = this.getConfigVal('closeOnSuccess');
    //console.log('was active?', was_active, closeOnSuccess);

    if (/*this.isScopeReady() &&*/ was_active) {
      if (true === closeOnSuccess || lib.isNumber(closeOnSuccess)){
        this.doCloseOnSuccess(closeOnSuccess);
      }
      if (this.getConfigVal('clearOnSuccess')){
        this.set('data', null);
      }
    }
    return true;
  };
  FormMixin.prototype.doCloseOnSuccess = function (val) {
    if (true === val) val = 0;
    lib.runNext (this.set.bind(this, 'actual', false), val);
  };
  FormMixin.prototype.set_progress = function (val) {
    this.progress = val;
    return true;
  };
  FormMixin.prototype.set_actual = function (val) {
    //reset ftion_status and progress on any change of actual
    this.set('ftion_status', null);
    this.set('progress', null);
  };
  FormMixin.prototype.initialize = function () {
    this.$form = this.$element.is('form') ? this.$element : this.$element.find('form');

    this.$form.attr({
      'name': this.get('id'), ///add a name to form, to make angular validation work ....
      'novalidate': ''     ///prevent browser validation ...
    });
    this.$form.removeAttr ('action'); //in order to avoid some refresh or so ...
    this.$form.on('submit', this.fireSubmit.bind(this));
    this.$form.find('[name]').toArray().forEach (this._prepareField.bind(this));
    this.appendHiddenFields(this.getConfigVal('hidden_fields'));
  };
  FormMixin.prototype.empty = function () {
    this.set('data', {});
  };
  FormMixin.prototype.appendHiddenFields = function (fields) {
    if (!fields || !fields.length) return;
    fields.forEach (this._appendHiddenField.bind(this));
  };
  FormMixin.prototype._appendHiddenField = function (fieldname_or_record) {
    var name = lib.isString(fieldname_or_record) ? fieldname_or_record : fieldname_or_record.name,
      attrs = {
        name: name,
        type: 'hidden',
      },
      is_hash = !lib.isString(fieldname_or_record);

    if (is_hash){
      attrs.required = fieldname_or_record.required ? '' : undefined;
      if ('value' in fieldname_or_record) {
        this._default_values[name] = fieldname_or_record.value;
      }
    }

    this.findByFieldName(name).remove(); ///remove existing elements whatever they are ...
    var $el = $('<input>').attr(attrs);
    this._prepareField($el);
    this.$form.append ($el);
    //this.$form.append($('<span> {{_ctrl.data.'+name+' | json}}</span>'));
  };
  FormMixin.prototype._prepareField = function (fieldel) {
  };
  FormMixin.prototype.findByFieldName = function (name) {
    return this.$form.find ('[name="'+name+'"]');
  };
  FormMixin.prototype.toArray = function (keys) {
    return lib.hashToArray(keys, this.get('data'));
  };
  FormMixin.prototype.fireSubmit = function () {
    this.submit.fire(this.dataForFireSubmit());
  };
  FormMixin.prototype.dataForFireSubmit = function () {
    return this.array_keys ? this.toArray(this.array_keys) : this.get('data');
  };
  FormMixin.prototype.firePartialSubmit = function (field) {
    if (!this.isFieldValid(field)) return;
    this.partialSubmit.fire (field, this.data ? this.data[field] : null);
  };
  FormMixin.prototype.isFieldValid = function (field) {
    return true;
  };
  FormMixin.prototype.isFormValid = function () {
    for (var i in this.validfields) {
      if (!this.isFieldValid(i)) return false;
    }
    return true;
  };
  FormMixin.prototype.setInputEnabled = function (fieldname, enabled) {
    var $el = this.$form.find('[name="'+fieldname+'"]');
    if (enabled) {
      $el.removeAttr('disabled');
    }else{
      $el.attr('disabled', 'disabled');
    }
    return $el;
  };
  FormMixin.prototype.disableInput = function (fieldname) {
    this.setInputEnabled(fieldname, false);
  };
  FormMixin.prototype.enableInput = function (fieldname) {
    this.setInputEnabled(fieldname, true);
  };


  function setDefaultVals (data, value, key) {
    if (key in data) return;
    data[key] = value;
  }
  FormMixin.prototype.fillObjectWithDefaultValues = function (obj) {
    var _o = obj;
    lib.traverseShallow (this._default_values, setDefaultVals.bind(null, _o));
    _o = null;
  };


  FormMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, FormMixin
      ,'_setInitial'
      ,'_onChanged'
      ,'resetElement'
      ,'resetForm'
      ,'set_valid'
      ,'set_ftion_status'
      ,'doCloseOnSuccess'
      ,'set_progress'
      ,'empty'
      ,'appendHiddenFields'
      ,'_appendHiddenField'
      ,'_prepareField'
      ,'findByFieldName'
      ,'toArray'
      ,'fireSubmit'
      ,'dataForFireSubmit'
      ,'firePartialSubmit'
      ,'isFieldValid'
      ,'isFormValid'
      ,'setInputEnabled'
      ,'disableInput'
      ,'enableInput'
    );
    // methods that need to be called directly, no inherit:
    // set_actual
    // set_progress
    // initialize
    // fillObjectWithDefaultValues
  };

  return FormMixin;
}
module.exports = createFormMixin;
