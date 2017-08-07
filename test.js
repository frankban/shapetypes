/* Copyright (C) 2017 Francesco Banconi */

const shapeup = require('./shapeup.js');
const test = require('tape');

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
    checkFrozen(t, obj);
    checkFrozen(t, obj.array);
    checkFrozen(t, obj.obj);
    checkFrozen(t, obj.obj.array);
    checkFrozen(t, obj.obj.func);
    checkFrozen(t, obj.obj);
    checkFrozen(t, obj.func);
    checkFrozen(t, obj.map);
    checkFrozen(t, obj.str);
    checkFrozen(t, obj.number);
    t.end();
  });
});

test('fromShape', t => {
  t.end();
});

test('reshapeFunc', t => {
  t.test('returns null', t => {
    t.equal(shapeup.reshapeFunc(), null);
    t.end();
  });

  t.test('can be identified', t => {
    const reshape = shapeup.reshapeFunc[SHAPE];
    t.equal(reshape.constructor.name, 'Reshape');
    t.end();
  });
});

test('shape', t => {
  t.end();
});

// Check that the given object is frozen.
const checkFrozen = (t, obj) => t.ok(
  Object.isFrozen(obj), JSON.stringify(obj));

// Define the property name for the shape information.
const SHAPE = '__shape__';
