var isArray = Array.isArray
var slice = Function.call.bind(Array.prototype.slice)
var flatten = Function.apply.bind(Array.prototype.concat, Array.prototype)
var EMPTY_ARR = Array.prototype
var TYPE_ERR = "SQL should be a string: "

exports = module.exports = function sql(sqls) {
	var params = slice(arguments, 1)

	var sql = sqls.reduce(function(left, right, i) {
		return left + toPlaceholder(params[i - 1]) + right
	})

	return new Sql(sql, flatten(params.map(toParameter)))
}

exports.Sql = Sql
exports.new = function(sql, params) { return new Sql(sql, params) }
exports.column = newColumn
exports.table = newColumn
exports.csv = csv

exports.tuple = function(tuple) {
	if (!isArray(tuple)) throw new TypeError("Not an array: " + tuple)
	var sql = "(" + tuple.map(toPlaceholder).join(", ") + ")"
	return new Sql(sql, flatten(tuple.map(toParameter)))
}

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

function toPlaceholder(value) {
	return value instanceof Sql ? value.sql : "?"
}

function toParameter(value) {
	return value instanceof Sql ? value.parameters : [value]
}

function csv(array) {
	if (!isArray(array)) throw new TypeError("Not an array: " + array)
	var sql = array.map(toPlaceholder).join(", ")
	return new Sql(sql, flatten(array.map(toParameter)))
}

function quote(name) { return '"' + name.replace(/"/g, '""') + '"'}
function newColumn(name) { return new Sql(quote(name)) }
