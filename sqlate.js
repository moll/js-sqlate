var isArray = Array.isArray
var slice = Function.call.bind(Array.prototype.slice)
var flatten = Function.apply.bind(Array.prototype.concat, Array.prototype)
var concat = Array.prototype.concat.bind(Array.prototype)
var EMPTY_ARR = Array.prototype
var TYPE_ERR = "SQL should be a string: "
var EMPTY_SQL = new Sql([])
var EMPTY_TUPLE = new Sql(["()"])
var NULL_TUPLE = new Sql(["(NULL)"])
exports = module.exports = sql
exports.Sql = Sql
exports.column = newColumn
exports.table = newColumn
exports.csv = csv
exports.tuple = tuple
exports.in = tupleOrNull
exports.concat = concatSqls

function Sql(sqls, params) {
	if (typeof sqls == "string") sqls = [sqls]
	else if (!isArray(sqls)) throw new TypeError(TYPE_ERR + sqls)
	this.sqls = sqls
	this.parameters = params || EMPTY_ARR
}

Sql.prototype.sqls = EMPTY_ARR
Sql.prototype.parameters = EMPTY_ARR

Sql.prototype.toString = function(fmt) {
	var sqls = this.sqls

	switch (fmt) {
		case undefined:
		case "?": return sqls.join("?")
		case "$": return sqls.reduce(function(a, b, i) { return a + "$" + i + b })
		default: throw new RangeError("Invalid placeholder format: " + fmt)
	}
}

// The "text" and "values" aliases are for Brian Carlson's PostgreSQL library
// and its query-object style: https://node-postgres.com/features/queries
Object.defineProperty(Sql.prototype, "text", {
	get: function() { return this.toString("$") }, configurable: true
})

Object.defineProperty(Sql.prototype, "values", {
	get: function() { return this.parameters }, configurable: true
})

function interpolate(strings, params) {
	var sqls = [strings[0]]

	for (var i = 1; i < strings.length; ++i) {
		var param = params[i - 1]

		if (param instanceof Sql) {
			sqls[sqls.length - 1] += param.sqls[0]
			Array.prototype.push.apply(sqls, param.sqls.slice(1))
			sqls[sqls.length - 1] += strings[i]
		}
		else sqls.push(strings[i])
	}

	return new Sql(sqls, flatten(params.map(toParams)))
}

function concatSqls(sqls) {
  return sqls.reduce(function(sql, el) {
		sql.sqls[sql.sqls.length - 1] += el.sqls[0]
		Array.prototype.push.apply(sql.sqls, el.sqls.slice(1))
    Array.prototype.push.apply(sql.parameters, el.parameters)
    return sql
  }, new Sql("", []))
}

function csv(array) {
	if (!isArray(array)) throw new TypeError("Not an array: " + array)
	if (array.length == 0) return EMPTY_SQL
	return interpolate(concat("", repeat(array.length - 1, ", "), ""), array)
}

function tuple(tuple) {
	if (!isArray(tuple)) throw new TypeError("Not an array: " + tuple)
	if (tuple.length == 0) return EMPTY_TUPLE
	return interpolate(concat("(", repeat(tuple.length - 1, ", "), ")"), tuple)
}

function tupleOrNull(tuple) {
	if (!isArray(tuple)) throw new TypeError("Not an array: " + tuple)
	if (tuple.length == 0) return NULL_TUPLE
	return interpolate(concat("(", repeat(tuple.length - 1, ", "), ")"), tuple)
}

function repeat(n, value) {
	var array = new Array(n)
	for (var i = 0; i < n; ++i) array[i] = value
	return array
}

function sql(strings) { return interpolate(strings, slice(arguments, 1)) }
function quote(name) { return '"' + name.replace(/"/g, '""') + '"'}
function newColumn(name) { return new Sql(quote(name)) }
function toParams(val) { return val instanceof Sql ? val.parameters : [val] }
