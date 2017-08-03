/* Copyright (C) 2017 Francesco Banconi */

const shapeup = require('./shapeup.js');
const test = require('tape');

// Define the property name for the shape information.
const SHAPE = '__shape__';

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
    const checkFrozen = obj => t.ok(Object.isFrozen(obj), JSON.stringify(obj));
    checkFrozen(obj);
    checkFrozen(obj.array);
    checkFrozen(obj.obj);
    checkFrozen(obj.obj.array);
    checkFrozen(obj.obj.func);
    checkFrozen(obj.obj);
    checkFrozen(obj.func);
    checkFrozen(obj.map);
    checkFrozen(obj.str);
    checkFrozen(obj.number);
    t.end();
  });
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
