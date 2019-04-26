var isArray = Array.isArray
var slice = Function.call.bind(Array.prototype.slice)
var flatten = Function.apply.bind(Array.prototype.concat, Array.prototype)
var EMPTY_ARR = Array.prototype
var TYPE_ERR = "SQL should be a string: "
exports = module.exports = template
exports.Sql = Sql
exports.new = raw
exports.table = quoteSql
exports.column = quoteSql
exports.tuple = tupleSql

function Sql(sql, params) {
	if (typeof sql != "string") throw new TypeError(TYPE_ERR + sql)

	this.sql = sql
	this.parameters = params || EMPTY_ARR
}

Sql.prototype.toString = function() {
	return this.sql
}

// The "text" and "values" aliases are for Brian Carlson's PostgreSQL library
// and its query-object style: https://node-postgres.com/features/queries
Object.defineProperty(Sql.prototype, "text", {
	get: function() { return this.sql }, configurable: true
})

Object.defineProperty(Sql.prototype, "values", {
	get: function() { return this.parameters }, configurable: true
})

function template(sqls) {
	var params = slice(arguments, 1)

	var sql = sqls.reduce(function(left, right, i) {
		return left + toPlaceholder(params[i - 1]) + right
	})

	return new Sql(sql, flatten(params.map(toParameter)))
}

function toPlaceholder(value) {
	// Binding a single level for now. Could be done recursively in the future.
	if (isArray(value)) return value.map(bind).join(", ")
	return bind(value)

	function bind(value) { return value instanceof Sql ? value.sql : "?" }
}

function toParameter(value) {
	return isArray(value) ? flatten(value.map(toValues)) : toValues(value)
}

function tupleSql(tuple) {
	if (!isArray(tuple)) throw new TypeError("Tuple must be an array: " + tuple)
	return new Sql("(" + toPlaceholder(tuple) + ")", flatten(tuple.map(toValues)))
}

function raw(sql, params) { return new Sql(sql, params) }
function quoteSql(name) { return new Sql(quote(name)) }
function quote(name) { return '"' + name.replace(/"/g, '""') + '"'}
function toValues(val) { return val instanceof Sql ? val.parameters : [val] }
