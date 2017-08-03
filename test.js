/* Copyright (C) 2017 Francesco Banconi */

const shapeup = require('./shapeup.js');
const test = require('tape');

// Define the property name for the shape information.
const SHAPE = '__shape__';

test('reshapeFunc', t => {

  t.test('returns null', st => {
    t.equal(shapeup.reshapeFunc(), null);
    t.end();
  });

  t.test('can be identified', t => {
    const reshape = shapeup.reshapeFunc[SHAPE];
    t.equal(reshape.constructor.name, 'Reshape');
    t.end();
  });

});
