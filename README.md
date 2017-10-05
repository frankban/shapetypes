[![Build Status](https://travis-ci.org/frankban/shapeup.svg?branch=master)](https://travis-ci.org/frankban/shapeup)

# shapeup

The React `shape` [property type](https://www.npmjs.com/package/prop-types) is
useful for declaring how objects provided to components should look like. By
stating that a property has a given shape, we are establishing a contract that
must be fulfilled when instantiating the component. However, prop-types' shapes
are more a minimum requirement than an external interface declaration:
providing an object that has a superset of the declared properties is not
considered an error, and therefore components can end up relying on fields that
are not part of the contract.

The shapeup library fixes this by forcing the provided properties to only have
the declared set of fields. When using shapeup, passing in an object with
extraneous fields would result in an error. This way we ensure that what is
declared in the contract exactly matches what is actually used by the
components.

## Getting started

To start using shapeup's own implementation of "shape", just replace
`PropTypes.shape` entries with [`shapeup.shape`](#shape) ones, for instance:
```javascript
MyComponent.propTypes = {
  api: shapeup.shape({
    getById: PropTypes.func.isRequired,
    getAll: PropTypes.func.isRequired
  }).isRequired
};
```
The code above declares that `MyComponent` requires an `api` property as an
object with exactly two fields: `getById` and `getAll`. Those two fields must
be functions, but any other property type can be provided, including other
[`shapeup.shape`](#shape)s.

## Building shapes

It's not difficult to implement the above contract by defining a new object
with the required fields, for instance:
```javascript
<MyComponent
  api={{
    getById: someobj.getById.bind(someobj),
    getAll: someobj.getAll.bind(someobj)
  }}
/>
```
In cases like this, in which there is `someobj` which already implements the
shape, it is possible to use [`shapeup.fromShape`](#fromShape), which automates
the process of creating a new object based on an existing one and on a shape
declaration, including methods binding as required, for example:
```javascript
<MyComponent
  api={shapeup.fromShape(someobj, MyComponent.propTypes.api)}
/>
```
The original object is provided as first argument, the
[`shapeup.shape`](#shape) declaration as second. The resulting object only
includes the fields in the shape, already bound to the original object if they
are methods. The resulting object is also deeply frozen to avoid side effects
due to unwanted mutations. A third argument `{mutable: true}` can be provided
to avoid freezing: this ability is not generally recommended, but can be useful
for corner cases in which speed degradations are encountered.

## Subcomponents handling

Many times, when defining multi-level component trees, properties must be
propagated to nested components. As projects become big and complex, having to
update all components in the tree (including their tests) just because a new
property is required by a deeply nested subcomponent is suboptimal, repetitive
and error-prone. Shapes can help solve this, as they allow grouping properties
together and propagating them based on the shape declarations of the
subcomponents. For instance, rather than the following:
```javascript
// In parent-component.js.
class ParentComponent extends React.Component {
  ...
  <SubComponent
    removeEntity={this.props.removeEntity}
  />
  ...
}
ParentComponent.propTypes = {
  addEntity: PropTypes.func.isRequired,
  removeEntity: PropTypes.func.isRequired
};

// In subcomponent.js.
SubComponent.propTypes = {
  removeEntity: PropTypes.func.isRequired
};
```
we could use a shape on both components and reshape the provided properties for
propagating it to the child:
```javascript
// In parent-component.js.
class ParentComponent extends React.Component {
  ...
  <SubComponent
    api={shapeup.fromShape(this.props.api, SubComponent.propTypes.api)}
  />
  ...
}
ParentComponent.propTypes = {
  api: shapeup.shape({
    addEntity: PropTypes.func.isRequired,
    removeEntity: PropTypes.func.isRequired
  }).isRequired
};

// In subcomponent.js.
SubComponent.propTypes = {
  api: shapeup.shape({
    removeEntity: PropTypes.func.isRequired
  }).isRequired
};
```
If `SubComponent` will require `addEntity` in the future, all we need to do is
declaring the new dependency in its `SubComponent.propTypes`, without having to
change the actual component code (and tests!). Note that is totally reasonable
and encouraged to declare shapes with only one field.

A shortcut is also available when reshaping is required for propagating
properties to subcomponents. The parent component can declare that it requires
a [`shapeup.reshapeFunc`](#reshapeFunc) property as part of the shape, which
can then be used to reshape the object implementing the shape itself. So, the
example above can be rewritten as:

```javascript
// In parent-component.js.
class ParentComponent extends React.Component {
  ...
  <SubComponent
    // The api object has a reshape method. Use that to create an object with
    // the shape required by SubComponent starting from this.props.api.
    api={this.props.api.reshape(SubComponent.propTypes.api)}
  />
  ...
}
ParentComponent.propTypes = {
  api: shapeup.shape({
    addEntity: PropTypes.func.isRequired,
    removeEntity: PropTypes.func.isRequired,
    reshape: shapeup.reshapeFunc
  }).isRequired
};

// In subcomponent.js.
SubComponent.propTypes = {
  api: shapeup.shape({
    removeEntity: PropTypes.func.isRequired
  }).isRequired
};
```
The name of the reshape field is not important, the value is, as it declares
that field to be the placeholder for the reshape function. But how is this
function provided? It can be provided in two ways:
- by using [`shapeup.fromShape`](#fromShape) as described above: when building
  the object, [`shapeup.fromShape`](#fromShape) includes a proper
  implementation of the reshape function if the given shape requires it;
- by wrapping the object provided as shape with
  [`shapeup.addReshape`](#addReshape), in case
  [`shapeup.fromShape`](#fromShape) is not used, and the object implementing
  the shape is manually built. For instance:
```javascript
<MyComponent
  api={shapeup.addReshape({
    getById: someobj.getById.bind(someobj),
    getAll: someobj.getAll.bind(someobj)
  })}
/>
```

Reshaping is the preferred way of propagating properties in deeply nested
component trees when using shapeup, as it allows extending the properties by
only updating the initial object and the `propTypes` declaration of components,
rather than updating how every single component in the tree is instantiated.

## Frozen shapes

As with the traditional prop-types, it is possible to chain
[`shapeup.shape`](#shape) with `isRequired`, in order to make that property
required. It is also possible to chain the declaration with `frozen` in order
to ensure that the provided property is deeply frozen. This is useful when
providing a shape and wanting to avoid the usual problems of object mutation,
such as unwanted side effects, bugs that are difficult to track down,
unrequired React reconciliations. In this example, all we need to do to ensure
the provided API is deeply frozen is adding `frozen` to the chain:
```javascript
MyComponent.propTypes = {
  api: shapeup.shape({
    getById: PropTypes.func.isRequired,
    getAll: PropTypes.func.isRequired
  }).frozen.isRequired
};
```
As mentioned, [`shapeup.fromShape`](#fromShape) already creates deeply frozen
objects by default, and therefore it makes really easy to provide a properly
frozen object implementing the shape. Alternatively, for manual implementation,
the library provides the [`shapeup.deepFreeze`](#deepFreeze) helper:
```javascript
<MyComponent
  api={shapeup.deepFreeze({
    getById: someobj.getById.bind(someobj),
    getAll: someobj.getAll.bind(someobj)
  })}
/>
```

## Reference

<a name="shape"></a>
#### shape(obj) ⇒ `function`

Declare a property type as the given shape.
  This works like PropTypes.shape, except the provided property must only
  include the fields declared in the shape.
  This property type supports two variations:
    - isRequired: as usual, declare that the property is required;
    - frozen: declare that the provided property must be a deeply frozen
      object. It is possible to use the "shapeup.deepFreeze" helper to achieve
      that goal. Alternatively, the object prepared and returned by
      "shapeup.fromShape" is deeply frozen by default.

**Kind**: global function
**Returns**: `function` - The shape property type.

| Param | Type | Description |
| --- | --- | --- |
| obj | `Object` | The object defining the shape. |

<a name="fromShape"></a>
#### fromShape(obj, propType, options) ⇒ `Object`

Build a property from the given object and shape property type.
  The resulting property is a deeply frozen object, with initially unbound
  methods bound to the provided object.
  All fields in the provided object that are not declared in the shape are not
  included in the returned object.
  If the shape property type includes the special field "shapeup.reshape",
  then a reshape method is included in that field of the returned object,
  providing the ability to reshape from the object itself using a new shape
  property type.

**Kind**: global function
**Returns**: `Object` - The resulting property, as a deeply frozen object.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| obj | `Object` |  | The object from which to build the shape. This object is     assumed to include all properties declared in the shape, except for the     optionally declared "shapeup.reshape" property. |
| propType | `function` |  | The property type with the declared shape     (built using "shapeup.shape"). |
| options | `Object` | `{}` | Additional optional parameters, including:     - mutable: whether to skip deeply freezing of the resulting object. |

<a name="addReshape"></a>
#### addReshape(instance, key) ⇒ `Object`

Add the reshape function to the given instance (in place).
  The reshape operation will be applied to the instance itself, and will also
  include freezing the resulting object in case the input instance is frozen.

**Kind**: global function
**Returns**: `Object` - The modified instance.

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| instance | `Object` |  | The instance to be modified. |
| key | `String` | `reshape` | The optional key used for the reshape function     (defaulting to "reshape"). |

<a name="deepFreeze"></a>
#### deepFreeze(obj) ⇒ `Object`

Deep freeze the given object and all its properties.

**Kind**: global function
**Returns**: `Object` - The resulting deeply frozen object.

| Param | Type | Description |
| --- | --- | --- |
| obj | `Object` | The object to freeze. |

<a name="reshapeFunc"></a>
#### reshapeFunc()

A required func property type wrapper only used as a placeholder for the
  reshape function.

**Kind**: global function
