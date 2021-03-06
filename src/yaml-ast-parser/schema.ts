/*eslint-disable max-len*/

import * as common from './common';
import YAMLException from './exception';
import { Type } from './type';

function compileList(schema: Schema, name, result) {
  const exclude = [];

  schema.include.forEach(function(includedSchema) {
    result = compileList(includedSchema, name, result);
  });

  schema[name].forEach(function(currentType) {
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag) {
        exclude.push(previousIndex);
      }
    });

    result.push(currentType);
  });

  return result.filter(function(type, index) {
    return -1 === exclude.indexOf(index);
  });
}

function compileMap(/* lists... */) {
  let result = {},
    index,
    length;

  function collectType(type) {
    result[type.tag] = type;
  }

  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }

  return result;
}

export interface SchemaDefinition {
  include?: Schema[];
  implicit?: Type[];
  explicit?: Type[];
}

export class Schema {
  public static DEFAULT = null;
  public static create = function createSchema(
    ...args: [Schema | Schema[], Type[]] | [Type[]]
  ) {
    let schemas: Schema | Schema[];
    let types: Type[];

    switch (args.length) {
      case 1:
        schemas = Schema.DEFAULT;
        types = args[0];
        break;

      case 2:
        schemas = args[0];
        types = args[1];
        break;

      default:
        throw new YAMLException(
          'Wrong number of arguments for Schema.create function'
        );
    }

    schemas = common.toArray(schemas);
    types = common.toArray(types);

    if (
      !schemas.every(function(schema) {
        return schema instanceof Schema;
      })
    ) {
      throw new YAMLException(
        'Specified list of super schemas (or a single Schema object) contains a non-Schema object.'
      );
    }

    if (
      !types.every(function(type) {
        return type instanceof Type;
      })
    ) {
      throw new YAMLException(
        'Specified list of YAML types (or a single Type object) contains a non-Type object.'
      );
    }

    return new Schema({
      include: schemas,
      explicit: types,
    });
  };

  public include: Schema[];
  public implicit: Type[];
  public explicit: Type[];

  public compiledImplicit: any[];
  public compiledExplicit: any[];
  public compiledTypeMap: any[];
  constructor(definition: SchemaDefinition) {
    this.include = definition.include || [];
    this.implicit = definition.implicit || [];
    this.explicit = definition.explicit || [];

    this.implicit.forEach(function(type) {
      if (type.loadKind && 'scalar' !== type.loadKind) {
        throw new YAMLException(
          'There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.'
        );
      }
    });

    this.compiledImplicit = compileList(this, 'implicit', []);
    this.compiledExplicit = compileList(this, 'explicit', []);
    this.compiledTypeMap = (compileMap as any)(
      this.compiledImplicit,
      this.compiledExplicit
    );
  }
}
