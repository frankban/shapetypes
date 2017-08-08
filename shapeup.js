/* Copyright (C) 2017 Francesco Banconi */

/**
  This library provides the shape and reshape customized React property types.
  The ability to declare a frozen shape is also provided.

  Note that in most of the property wrappers the "...rest" parameter is used.
  This is required to avoid warnings about calling prop-types validators
  directly.
  See <https://facebook.github.io/react/warnings/dont-call-proptypes.html
  #fixing-the-false-positive-in-third-party-proptypes>.
*/

'use strict';

const PropTypes = require('prop-types');

/**
  Declare a property type as the given shape.
  This works like PropTypes.shape, except the provided property must only
  include the fields declared in the shape.
  This property type supports two variations:
    - isRequired: as usual, declare that the property is required;
    - frozen: declare that the provided property must be a deeply frozen
      object. It is possible to use the "shapeup.deepFreeze" helper to achieve
      that goal. Alternatively, the object prepared and returned by
      "shapeup.fromShape" is deeply frozen by default.

  @param {Object} obj The object defining the shape.
  @returns {Function} The shape property type.
*/
function shape(obj) {
  const wrappedValidator = PropTypes.shape(obj);
  const shapeFields = Object.keys(obj);

  const propType = (props, propName, componentName, ...rest) => {
    const propValue = props[propName];
    if (!propValue) {
      return null;
    }
    // Check that the object has the declared shape.
    const err = wrappedValidator(props, propName, componentName, ...rest);
    if (err) {
      return err;
    }
    // Check that no extraneous fields are present.
    const fields = Object.getOwnPropertyNames(propValue).filter(field => {
      return shapeFields.indexOf(field) === -1;
    });
    if (fields.length) {
      return new Error(
        `invalid property "${propName}" provided to component ` +
        `"${componentName}": the provided object includes properties that ` +
        `are not declared in the shape: ${fields.join(', ')}`
      );
    }
    return null;
  };

  propType[SHAPE] = new Declaration(obj);
  propType.frozen = frozenWrapper(propType);
  propType.isRequired = isRequiredWrapper(propType);
  propType.frozen.isRequired = isRequiredWrapper(propType.frozen);
  return propType;
}

/**
  Build a property from the given object and shape property type.
  The resulting property is a deeply frozen object, with initially unbound
  methods bound to the provided object.
  All fields in the provided object that are not declared in the shape are not
  included in the returned object.
  If the shape property type includes the special field "shapeup.reshape",
  then a reshape method is included in that field of the returned object,
  providing the ability to reshape from the object itself using a new shape
  property type.

  @param {Object} obj The object from which to build the shape. This object is
    assumed to include all properties declared in the shape, except for the
    optionally declared "shapeup.reshape" property.
  @param {Function} propType The property type with the declared shape
    (built using "shapeup.shape").
  @param {Object} options Additional optional parameters, including:
    - mutable: whether to skip deeply freezing of the resulting object.
  @returns {Object} The resulting property, as a deeply frozen object.
*/
function fromShape(obj, propType, options=null) {
  const declaration = propType[SHAPE];
  if (!(declaration instanceof Declaration)) {
    throw new Error('from shape called with a non-shape property type');
  }
  const shape = declaration.shape;
  const instance = {};
  const checker = {};
  Object.keys(shape).forEach(key => {
    const type = shape[key];
    if (type[SHAPE] instanceof Reshape) {
      // Add the reshape function to the resulting instance.
      instance[key] = fromShape.bind(null, instance);
      return;
    }
    let value = obj[key];
    if (value === undefined) {
      // The object does not have the declared shape.
      // An error will be returned by PropTypes.shape.
      return;
    }
    if (type[SHAPE] instanceof Declaration) {
      // This is a nested shape type.
      instance[key] = fromShape(value, type);
      return;
    }
    if (checker.toString.call(value) === '[object Function]') {
      // This can be an unbound method: try to bind it.
      value = value.bind(obj);
    }
    instance[key] = value;
  });
  options = options || {};
  if (options.mutable) {
    return instance;
  }
  return deepFreeze(instance);
}

/**
  Return the isRequired wrapper for the given propType validator.

  @param {Function} propType A shape or frozen validator.
  @return {Function} The isRequired validator.
*/
function isRequiredWrapper(propType) {
  const isRequired = (props, propName, componentName, ...rest) => {
    if (!props[propName]) {
      return new Error(
        `the property "${propName}" is marked as required for the component ` +
        `"${componentName}" but "${props[propName]}" has been provided`
      );
    }
    return propType(props, propName, componentName, ...rest);
  };
  isRequired[SHAPE] = propType[SHAPE];
  return isRequired;
}

/**
  Return a frozen wrapper for the given propType validator.
  The resulting validator checks that the provided property is deeply frozen.

  @param {Function} propType A shape validator.
  @return {Function} The frozen validator.
*/
function frozenWrapper(propType) {
  const checkFrozen = (obj, propName, componentName) => {
    if (!Object.isFrozen(obj)) {
      throw new Error(
        `the property "${propName}" provided to component ` +
        `"${componentName}" is not frozen`
      );
    }
    Object.getOwnPropertyNames(obj).forEach(name => {
      const prop = obj[name];
      const type = typeof obj;
      if (prop !== null && (type === 'object' || type === 'function')) {
        checkFrozen(prop, `${propName}.${name}`, componentName);
      }
    });
  };

  const frozen = (props, propName, componentName, ...rest) => {
    const propValue = props[propName];
    if (!propValue) {
      return null;
    }
    try {
      checkFrozen(propValue, propName, componentName);
    } catch (err) {
      return err;
    }
    return propType(props, propName, componentName, ...rest);
  };
  frozen[SHAPE] = propType[SHAPE];
  return frozen;
}

/**
  Deep freeze the given object and all its properties.

  @param {Object} obj The object to freeze.
  @returns {Object} The resulting deeply frozen object.
*/
function deepFreeze(obj) {
  Object.getOwnPropertyNames(obj).forEach(name => {
    const prop = obj[name];
    const type = typeof obj;
    if (prop !== null && (type === 'object' || type === 'function')) {
      deepFreeze(prop);
    }
  });
  return Object.freeze(obj);
}

// Define the property name for the shape information.
const SHAPE = '__shape__';

/**
  Wrapper for the shape declaration, used for identifying a shape property.
*/
const Declaration = class Declaration {
  constructor(shape) {
    this.shape = shape;
  }
};

/**
  Identifier for the reshape property.
*/
const Reshape = class Reshape {};

/**
  A dummy property type only used as a placeholder for the reshape function.
*/
const reshapeFunc = () => null;
reshapeFunc[SHAPE] = new Reshape();

module.exports = {
  deepFreeze: deepFreeze,
  fromShape: fromShape,
  reshapeFunc: reshapeFunc,
  shape: shape
};
