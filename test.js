/* Copyright (C) 2017 Francesco Banconi */

const PropTypes = require('prop-types');
const shapeup = require('./shapeup.js');
const test = require('tape');

test('addReshape', t => {
  const shape = shapeup.shape({
    field1: PropTypes.number,
  });

  t.test('adds the reshape function to an arbitrary object', t => {
    let obj = {
      field1: 42,
      field2: 'these are the voyages'
    };
    const newObj = shapeup.addReshape(obj);
    // The returned object is the input object itself.
    t.equal(newObj, obj);
    // The reshape function is included, and can be used to reshape the object.
    t.ok(obj.reshape);
    obj = obj.reshape(shape);
    t.deepEqual(obj, {field1: 42});
    t.end();
  });

  t.test('can use a customized key for the reshape function', t => {
    let obj = {
      field1: 42,
    };
    shapeup.addReshape(obj, 'shapeAgain');
    t.ok(obj.shapeAgain);
    obj = obj.shapeAgain(shapeup.shape({}));
    t.deepEqual(obj, {});
    t.end();
  });

  t.test('freezes the resulting object if the input is frozen', t => {
    let obj = {
      field1: 47,
      field2: 'these are the voyages'
    };
    shapeup.addReshape(obj);
    Object.freeze(obj);
    obj = obj.reshape(shape);
    checkFrozen(t, obj);
    t.end();
  });

  t.test('does not freeze the resulting object if the input is mutable', t => {
    let obj = {
      field1: 47,
      field2: 'these are the voyages'
    };
    shapeup.addReshape(obj);
    obj = obj.reshape(shape);
    t.notOk(Object.isFrozen(obj));
    t.end();
  });
});

test('deepFreeze', t => {
  t.test('deeply freezes objects', t => {
    const obj = {
      array: [1, 2, 3],
      obj: {array: [], func: () => {}},
      func: () => {},
      map: new Map(),
      str: 'exterminate!',
      number: 42
    };
    const frozen = shapeup.deepFreeze(obj);
    checkFrozen(t, frozen);
    checkFrozen(t, frozen.array);
    checkFrozen(t, frozen.obj);
    checkFrozen(t, frozen.obj.array);
    checkFrozen(t, frozen.obj.func);
    checkFrozen(t, frozen.obj);
    checkFrozen(t, frozen.func);
    checkFrozen(t, frozen.map);
    checkFrozen(t, frozen.str);
    checkFrozen(t, frozen.number);
    t.end();
  });

  t.test('deeply freezes recursive objects', t => {
    const obj = {answer: 42};
    obj.recursive = obj;
    const frozen = shapeup.deepFreeze(obj);
    checkFrozen(t, frozen);
    checkFrozen(t, frozen.answer);
    checkFrozen(t, frozen.recursive);
    t.end();
  });

  t.test('ignores non-accessible properties', t => {
    const obj = {answer: 42};
    Object.defineProperty(obj, 'badWolf', {
      get: () => {
        throw new Error('bad wolf');
      }
    });
    t.doesNotThrow(() => {
      const frozen = shapeup.deepFreeze(obj);
      checkFrozen(t, frozen);
      checkFrozen(t, frozen.answer);
    });
    t.end();
  });
});

test('fromShape', t => {
  t.test('fails for non-shape types', t => {
    const nonShapeType = () => {};
    t.throws(() => {
      shapeup.fromShape({}, nonShapeType);
    }, /fromShape called with a non-shape property type/);
    t.end();
  });

  t.test('adds the reshape function to the resulting object', t => {
    let shape = shapeup.shape({
      field1: PropTypes.number,
      field2: PropTypes.string,
      reshape: shapeup.reshapeFunc
    });
    let obj = shapeup.fromShape({
      field1: 42,
      field2: 'these are the voyages'
    }, shape);
    // The reshape function is included, and can be used to reshape the object.
    t.ok(obj.reshape);
    shape = shapeup.shape({
      field1: PropTypes.number,
    });
    obj = obj.reshape(shape);
    t.deepEqual(obj, {field1: 42});
    // As the input instance is frozen, the reshaped object is frozen as well.
    checkFrozen(t, obj);
    t.end();
  });

  t.test('adds the reshape function multiple times', t => {
    let shape = shapeup.shape({
      field1: PropTypes.number,
      field2: PropTypes.string,
      field3: PropTypes.bool,
      shapeAgain: shapeup.reshapeFunc
    });
    let obj = shapeup.fromShape({
      field1: 47,
      field2: 'these are the voyages',
      field3: true
    }, shape);
    // The reshape function is included, and can be used to reshape the object.
    t.ok(obj.shapeAgain);
    shape = shapeup.shape({
      field1: PropTypes.number,
      field3: PropTypes.bool,
      finalShape: shapeup.reshapeFunc
    });
    obj = obj.shapeAgain(shape);
    // We can go further and reshape again.
    t.ok(obj.finalShape);
    shape = shapeup.shape({
      field3: PropTypes.bool,
    });
    obj = obj.finalShape(shape);
    t.deepEqual(obj, {field3: true});
    t.end();
  });

  t.test('relies on React checking in the case a property is not found', t => {
    const shape = shapeup.shape({
      field1: PropTypes.number.isRequired,
      field2: PropTypes.string.isRequired
    });
    const obj = shapeup.fromShape({
      field1: 42,
      field3: false
    }, shape);
    t.deepEqual(obj, {field1: 42});
    t.end();
  });

  t.test('creates an object with the given shape', t => {
    const shape = shapeup.shape({
      field1: PropTypes.number.isRequired,
      field2: PropTypes.string.isRequired,
      field3: PropTypes.object.isRequired
    });
    const obj = shapeup.fromShape({
      field0: 'extraneous',
      field1: 47,
      field2: 'these are the voyages',
      field3: {whoami: 'who'},
      field4: 'another extraneous field'
    }, shape);
    t.deepEqual(obj, {
      field1: 47,
      field2: 'these are the voyages',
      field3: {whoami: 'who'}
    });
    t.end();
  });

  t.test('binds the methods', t => {
    const shape = shapeup.shape({
      fullName: PropTypes.func.isRequired,
      isAuthenticated: PropTypes.func.isRequired,
    });
    const original = {
      firstName: 'doctor',
      lastName: 'who',
      fullName: function() {
        return `${this.firstName} ${this.lastName}`;
      },
      isAnonymus: function() {
        return this.fullName() === 'anonymous';
      },
      isAuthenticated: function() {
        return !this.isAnonymus();
      }
    };
    const obj = shapeup.fromShape(original, shape);
    t.equal(obj.fullName(), 'doctor who');
    t.equal(obj.isAuthenticated(), true);
    t.end();
  });

  t.test('handles sub-shapes', t => {
    const shape = shapeup.shape({
      field1: PropTypes.number.isRequired,
      field2: shapeup.shape({
        subfield1: PropTypes.array.isRequired,
        subfield2: shapeup.shape({
          leaf: PropTypes.string
        }),
      }).isRequired,
      field3: PropTypes.object.isRequired
    });
    const obj = shapeup.fromShape({
      field0: 'extraneous',
      field1: 42,
      field2: {
        subfield0: () => 'bad wolf',
        subfield1: ['these', 'are', 'the', 'voyages'],
        subfield2: {
          invalid: 'bad wolf',
          leaf: 'tardis'
        },
        subfield3: ['bad', 'wolf']
      },
      field3: {whoami: 'who'},
      field4: 'another extraneous field'
    }, shape);
    t.deepEqual(obj, {
      field1: 42,
      field2: {
        subfield1: ['these', 'are', 'the', 'voyages'],
        subfield2: {
          leaf: 'tardis'
        },
      },
      field3: {whoami: 'who'}
    });
    t.end();
  });

  t.test('deeply freeze the resulting object', t => {
    const shape = shapeup.shape({
      field1: PropTypes.array.isRequired,
      field2: PropTypes.string.isRequired,
      field3: PropTypes.object.isRequired
    });
    const obj = shapeup.fromShape({
      field1: [],
      field2: 'these are the voyages',
      field3: {answers: [42, 47], empty: {}}
    }, shape);
    checkFrozen(t, obj);
    checkFrozen(t, obj.field1);
    checkFrozen(t, obj.field3);
    checkFrozen(t, obj.field3.answers);
    checkFrozen(t, obj.field3.empty);
    t.end();
  });

  t.test('can optionally avoid deeply freezing the resulting object', t => {
    const shape = shapeup.shape({
      field1: PropTypes.array.isRequired,
    });
    const obj = shapeup.fromShape({
      field1: [],
    }, shape, {mutable: true});
    t.notOk(Object.isFrozen(obj));
    t.notOk(Object.isFrozen(obj.field1));
    t.end();
  });
});

test('reshapeFunc', t => {
  t.test('validates that the value is actually provided', t => {
    const propTypes = {
      reshape: shapeup.reshapeFunc
    };
    const props = {
      reshape: () => {}
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(err, '');
    t.end();
  });

  t.test('fails if the property is not provided', t => {
    const propTypes = {
      reshape: shapeup.reshapeFunc
    };
    const props = {};
    const err = checkPropTypes(propTypes, props);
    t.equal(
      err,
      'Warning: Failed testProp type: The testProp `reshape` is marked as ' +
      'required in `TestComponent`, but its value is `undefined`.');
    t.end();
  });

  t.test('fails if the given property is not a function', t => {
    const propTypes = {
      reshape: shapeup.reshapeFunc
    };
    const props = {
      reshape: 42
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(
      err,
      'Warning: Failed testProp type: Invalid testProp `reshape` of type ' +
      '`number` supplied to `TestComponent`, expected `function`.');
    t.end();
  });

  t.test('can be identified', t => {
    const reshape = shapeup.reshapeFunc[SHAPE];
    t.equal(reshape.constructor.name, 'Reshape');
    t.end();
  });
});

test('shape', t => {
  t.test('validates declared fields and no extraneous fields', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired,
        field2: PropTypes.string.isRequired
      }),
    };
    const props = {
      api: {
        field1: [],
        field2: 'these are the voyages'
      }
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(err, '');
    t.end();
  });

  t.test('fails when a declared property is not found', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired,
        field2: PropTypes.string.isRequired
      }),
    };
    const props = {
      api: {
        field1: []
      }
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(
      err,
      'Warning: Failed testProp type: The testProp `api.field2` is marked ' +
      'as required in `TestComponent`, but its value is `undefined`.');
    t.end();
  });

  t.test('does not fail if a declared field is not required', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array,
        field2: PropTypes.string.isRequired
      }),
    };
    const props = {
      api: {
        field2: 'these are the voyages'
      }
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(err, '');
    t.end();
  });

   t.test('fails when extraneous fields outside the shape are provided', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired,
        field2: PropTypes.string.isRequired
      }),
    };
    const props = {
      api: {
        field0: null,
        field1: [],
        field2: 'these are the voyages',
        field3: 'bad wolf'
      }
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(
      err,
      'Warning: Failed testProp type: invalid property "api" provided to ' +
      'component "TestComponent": the provided object includes properties ' +
      'that are not declared in the shape: field0, field3');
    t.end();
  });

  t.test('validates required fields (success)', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.string.isRequired
      }).isRequired,
    };
    const props = {
      api: {
        field1: 'these are the voyages'
      }
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(err, '');
    t.end();
  });

  t.test('validates required fields (failure)', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.string.isRequired
      }).isRequired,
    };
    const props = {};
    const err = checkPropTypes(propTypes, props);
    t.equal(
      err,
      'Warning: Failed testProp type: the property "api" is marked as ' +
      'required for the component "TestComponent" but "undefined" has been ' +
      'provided');
    t.end();
  });

  t.test('ensures that the property is deeply frozen', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired,
        field2: PropTypes.object.isRequired
      }).frozen,
    };
    const props = {
      api: Object.freeze({
        field1: Object.freeze([42, 47]),
        field2: Object.freeze({who: Object.freeze(new Map())})
      })
    };
    const err = checkPropTypes(propTypes, props);
    t.equal(err, '');
    t.end();
  });

  t.test('ignores non-accessible properties when checking immutability', t => {
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired
      }).frozen,
    };
    const api = {field1: Object.freeze([0, 1, 2])};
    Object.defineProperty(api, 'badWolf', {
      get: () => {
        throw new Error('bad wolf');
      }
    });
    const props = {api: Object.freeze(api)};
    const err = checkPropTypes(propTypes, props);
    // The error is not "bad wolf", meaning we passed the frozen check.
    t.equal(
      err,
      'Warning: Failed testProp type: invalid property "api" provided to ' +
      'component "TestComponent": the provided object includes properties ' +
      'that are not declared in the shape: badWolf');
    t.end();
  });

  t.test('fails when the property is not deeply frozen', t => {
    const tests = [{
      about: 'not frozen',
      input: {
        field1: [42, 47],
        field2: {who: new Map()}
      },
      expected: 'api'
    }, {
      about: 'not internally frozen',
      input: Object.freeze({
        field1: [42, 47],
        field2: {who: new Map()}
      }),
      expected: 'api.field1'
    }, {
      about: 'not internally deeply frozen',
      input: Object.freeze({
        field1: Object.freeze([42, 47]),
        field2: Object.freeze({who: new Map()})
      }),
      expected: 'api.field2.who'
    }];
    const propTypes = {
      api: shapeup.shape({
        field1: PropTypes.array.isRequired,
        field2: PropTypes.object.isRequired
      }).frozen.isRequired,
    };
    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      t.test(test.about, t => {
        const props = {api: test.input};
        const err = checkPropTypes(propTypes, props);
        t.equal(
          err,
          `Warning: Failed testProp type: the property "${test.expected}" ` +
          'provided to component "TestComponent" is not frozen', test.about);
         t.end();
      });
    }
  });
});

// Check that the given object is frozen.
const checkFrozen = (t, obj) => {
  t.notEqual(obj, undefined, 'object is defined');
  t.ok(Object.isFrozen(obj), repr(obj));
};

// Define the property name for the shape information.
const SHAPE = '__shape__';

// Check that the given properties are valid for the given types.
// Return an error string or null if the property is valid.
const checkPropTypes = (propTypes, props) => {
  // Mock the "console.error" function.
  const original = console.error;
  const errors = [];
  console.error = errors.push.bind(errors);
  // Validate the property.
  PropTypes.checkPropTypes(propTypes, props, 'testProp', 'TestComponent');
  // Restore the original "console.error" function.
  console.error = original;
  return errors.join(' | ');
};

// Return a string representation for the given object.
const repr = obj => {
  const seen = new Map();
  return JSON.stringify(obj, (key, value) => {
    if (value === undefined) {
      return '<undefined>';
    }
    const type = typeof value;
    if (type === 'function') {
      return '' + value;
    }
    if (type === 'object' && value !== null) {
      // Handle recursive data structures.
      if (seen.has(value)) {
        return '<recursive>';
      }
      seen.set(value, true);
    }
    return value;
  }, 2);
};
