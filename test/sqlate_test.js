var Sql = require("..").Sql
var sql = require("..")

describe("Sqlate", function() {
	describe("as a template tag", function() {
		it("must return Sql with placeholders and parameters", function() {
			var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`

			s.must.eql(new Sql(
				"SELECT * FROM models WHERE id = ? AND name = ?",
				[42, "John"]
			))
		})

		it("must return Sql by interpolating an empty array", function() {
			var s = sql`SELECT * FROM models WHERE (id, name) IN (${[]})`
			s.must.eql(new Sql("SELECT * FROM models WHERE (id, name) IN ()", []))
		})

		it("must return Sql by interpolating an array with one element",
			function() {
			var s = sql`SELECT * FROM models WHERE (id) = ${[42]}`
			s.must.eql(new Sql("SELECT * FROM models WHERE (id) = ?", [42]))
		})

		it("must return Sql by interpolating an array with many elements",
			function() {
			var s = sql`SELECT * FROM models WHERE (id, name) = (${[42, "John"]})`

			s.must.eql(new Sql(
				"SELECT * FROM models WHERE (id, name) = (?, ?)",
				[42, "John"]
			))
		})

		it("must return Sql by not interpolating a nested array", function() {
			var name = ["John", "Smith"]
			var s = sql`SELECT * FROM models WHERE (id, name) = (${[42, name]})`

			s.must.eql(new Sql(
				"SELECT * FROM models WHERE (id, name) = (?, ?)",
				[42, ["John", "Smith"]]
			))
		})

		it("must return Sql by interpolating another instance of Sql", function() {
			var filter = sql`(id, name) = (${[42, "John"]})`

			sql`SELECT * FROM models WHERE ${filter} AND age > ${9}`.must.eql(new Sql(
				"SELECT * FROM models WHERE (id, name) = (?, ?) AND age > ?",
				[42, "John", 9]
			))
		})

		it("must return Sql by interpolating an array of Sql instances",
			function() {
			var columns = ["name", "age"].map(sql.column)
			var values = [["John", 42], ["Mike", 13]].map(sql.tuple)

			sql`INSERT INTO models (${columns}) VALUES ${values}`.must.eql(new Sql(
				`INSERT INTO models ("name", "age") VALUES (?, ?), (?, ?)`,
				["John", 42, "Mike", 13]
			))
		})

		it("must return Sql by interpolating an escaped table name", function() {
			var s = sql`SELECT * FROM ${sql.table("Models")} WHERE id = ${42}`
			s.must.eql(new Sql(`SELECT * FROM "Models" WHERE id = ?`, [42]))
		})
	})

	describe("Sql", function() {
		describe(".prototype.toString", function() {
			it("must return the SQL", function() {
				var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				String(s).must.equal("SELECT * FROM models WHERE id = ? AND name = ?")
			})
		})

		describe("sql", function() {
			it("must return the SQL", function() {
				var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				s.sql.must.equal("SELECT * FROM models WHERE id = ? AND name = ?")
			})
		})

		describe("text", function() {
			it("must return the SQL", function() {
				var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				s.text.must.equal("SELECT * FROM models WHERE id = ? AND name = ?")
			})

			it("must not be enumerable", function() {
				sql`SELECT * FROM models`.must.not.have.enumerable("text")
			})
		})

		describe("parameters", function() {
			it("must be set to the parameters", function() {
				var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				s.parameters.must.eql([42, "John"])
			})
		})

		describe("values", function() {
			it("must be set to the parameters", function() {
				var s = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				s.values.must.eql([42, "John"])
			})

			it("must not be enumerable", function() {
				sql`SELECT * FROM models`.must.not.have.enumerable("values")
			})
		})
	})

	describe(".new", function() {
		it("must return Sql", function() {
			sql.new("DEFAULT VALUES").must.eql(new Sql("DEFAULT VALUES", []))
		})
	})

	describe(".column", function() {
		it("must return Sql with escaped name", function() {
			var s = sql.column(`petite"Lingerie"Models`)
			s.must.eql(new Sql(`"petite""Lingerie""Models"`, []))
		})
	})

	describe(".table", function() {
		it("must be an alias to .column", function() {
			sql.table.must.equal(sql.column)
		})
	})

	describe(".tuple", function() {
		it("must return Sql with tuples", function() {
			var s = sql.tuple(["John", 42])
			s.must.eql(new Sql(`(?, ?)`, ["John", 42]))
		})

		it("must not interpolate nested arrays", function() {
			var s = sql.tuple(["John", [1, 2]])
			s.must.eql(new Sql(`(?, ?)`, ["John", [1, 2]]))
		})
	})
})
