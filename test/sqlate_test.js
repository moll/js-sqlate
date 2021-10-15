var Sql = require("..").Sql
var sql = require("..")

describe("Sqlate", function() {
	describe("as a template tag", function() {
		it("must return Sql when not interpolating", function() {
			var q = sql`SELECT * FROM models WHERE length(name) > 0`
			q.must.be.an.instanceof(Sql)
			String(q).must.equal("SELECT * FROM models WHERE length(name) > 0")
			q.parameters.must.eql([])
		})

		it("must return Sql when interpolating", function() {
			var q = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
			q.must.be.an.instanceof(Sql)
			String(q).must.equal("SELECT * FROM models WHERE id = ? AND name = ?")
			q.parameters.must.eql([42, "John"])
		})

		it("must return Sql when interpolating an empty array", function() {
			var query = sql`SELECT * FROM models WHERE tags = ${[]}`
			query.must.be.an.instanceof(Sql)
			String(query).must.equal("SELECT * FROM models WHERE tags = ?")
			query.parameters.must.eql([[]])
		})

		it("must return Sql when interpolating an array with one element",
			function() {
			var query = sql`SELECT * FROM models WHERE tags = ${["new"]}`
			String(query).must.eql("SELECT * FROM models WHERE tags = ?")
			query.parameters.must.eql([["new"]])
		})

		it("must return Sql when interpolating an array with many elements",
			function() {
			var query = sql`SELECT * FROM models WHERE tags = ${["new", "cheap"]}`
			String(query).must.eql("SELECT * FROM models WHERE tags = ?")
			query.parameters.must.eql([["new", "cheap"]])
		})

		it("must return Sql when interpolating a nested array", function() {
			var query = sql`SELECT * FROM models WHERE tags = ${["new", ["a", "b"]]}`
			String(query).must.eql("SELECT * FROM models WHERE tags = ?")
			query.parameters.must.eql([["new", ["a", "b"]]])
		})

		it("must return Sql when interpolating instance of Sql", function() {
			var filter = sql`(id, name) = (${42}, ${"John"})`
			var query = sql`SELECT * FROM models WHERE ${filter} AND age > ${9}`

			String(query).must.eql(`
				SELECT * FROM models WHERE (id, name) = (?, ?) AND age > ?
			`.trim())

			query.parameters.must.eql([42, "John", 9])
		})

		it("must return Sql when interpolating column names and values",
			function() {
			var columns = sql.tuple(["name", "age"].map(sql.column))
			var values = sql.csv([["John", 42], ["Mike", 13]].map(sql.tuple))
			var query = sql`INSERT INTO models ${columns} VALUES ${values}`

			String(query).must.equal(`
				INSERT INTO models ("name", "age") VALUES (?, ?), (?, ?)
			`.trim())

			query.parameters.must.eql(["John", 42, "Mike", 13])
		})

		it("must return Sql when interpolating table name", function() {
			var query = sql`SELECT * FROM ${sql.table("Models")} WHERE id = ${42}`
			String(query).must.eql(`SELECT * FROM "Models" WHERE id = ?`)
			query.parameters.must.eql([42])
		})
	})

	describe("Sql", function() {
		describe(".prototype.toString", function() {
			describe("given undefined", function() {
				it("must return the SQL with ? placeholders", function() {
					String(sql`
						SELECT * FROM models WHERE id = ${42} AND name = ${"John"}
					`).must.equal(`
						SELECT * FROM models WHERE id = ? AND name = ?
					`)
				})
			})

			describe("given ?", function() {
				it("must return the SQL with ? placeholders", function() {
					sql`
						SELECT * FROM models WHERE id = ${42} AND name = ${"John"}
					`.toString("?").must.equal(`
						SELECT * FROM models WHERE id = ? AND name = ?
					`)
				})

				it("must return the SQL with ? placeholders given nested tuples",
					function() {
					sql`
						SELECT * FROM models
						WHERE name = ${"John"} AND id IN ${sql.tuple([1, 2, 3])}
						OR name = ${"Mike"}
					`.toString("?").must.equal(`
						SELECT * FROM models
						WHERE name = ? AND id IN (?, ?, ?)
						OR name = ?
					`)
				})
			})

			describe("given $", function() {
				it("must return the SQL with $n placeholders", function() {
					sql`
						SELECT * FROM models WHERE id = ${42} AND name = ${"John"}
					`.toString("$").must.equal(`
						SELECT * FROM models WHERE id = $1 AND name = $2
					`)
				})

				it("must return the SQL with $n placeholders given nested tuples",
					function() {
					sql`
						SELECT * FROM models
						WHERE name = ${"John"} AND id IN ${sql.tuple([1, 2, 3])}
						OR name = ${"Mike"}
					`.toString("$").must.equal(`
						SELECT * FROM models
						WHERE name = $1 AND id IN ($2, $3, $4)
						OR name = $5
					`)
				})
			})
		})

		describe("text", function() {
			it("must return the SQL in PostgreSQL format", function() {
				var q = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				q.text.must.equal("SELECT * FROM models WHERE id = $1 AND name = $2")
			})

			it("must not be enumerable", function() {
				sql`SELECT * FROM models`.must.not.have.enumerable("text")
			})
		})

		describe("parameters", function() {
			it("must be set to the parameters", function() {
				var q = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				q.parameters.must.eql([42, "John"])
			})
		})

		describe("values", function() {
			it("must be set to the parameters", function() {
				var q = sql`SELECT * FROM models WHERE id = ${42} AND name = ${"John"}`
				q.values.must.eql([42, "John"])
			})

			it("must not be enumerable", function() {
				sql`SELECT * FROM models`.must.not.have.enumerable("values")
			})
		})
	})

	describe(".column", function() {
		it("must return Sql with escaped name", function() {
			var q = sql.column(`petite"Lingerie"Models`)
			q.must.eql(new Sql(`"petite""Lingerie""Models"`, []))
		})
	})

	describe(".table", function() {
		it("must be an alias to .column", function() {
			sql.table.must.equal(sql.column)
		})
	})

	describe(".csv", function() {
		it("must return Sql with comma separated values", function() {
			var query = sql.csv(["John", 42])
			String(query).must.equal("?, ?")
			query.parameters.must.eql(["John", 42])
		})

		it("must return Sql given an empty array", function() {
			var query = sql.csv([])
			String(query).must.equal("")
			query.parameters.must.eql([])
		})

		it("must return Sql given embedded SQL", function() {
			var query = sql.csv([
				sql`('John', ${"Smith"})`,
				"Mike",
				sql`('Rob', ${"McBob"})`,
			])

			String(query).must.equal("('John', ?), ?, ('Rob', ?)")
			query.parameters.must.eql(["Smith", "Mike", "McBob"])
		})

		it("must not interpolate nested arrays", function() {
			var query = sql.csv(["John", [1, 2]])
			String(query).must.equal("?, ?")
			query.parameters.must.eql(["John", [1, 2]])
		})
	})

	describe(".tuple", function() {
		it("must return Sql with tuples", function() {
			var query = sql.tuple(["John", 42])
			String(query).must.equal("(?, ?)")
			query.parameters.must.eql(["John", 42])
		})

		it("must return Sql with empty tuple given an empty array", function() {
			var query = sql.tuple([])
			String(query).must.equal("()")
			query.parameters.must.eql([])
		})

		it("must return Sql given embedded SQL", function() {
			var query = sql.tuple([
				sql`('John', ${"Smith"})`,
				"Mike",
				sql`('Rob', ${"McBob"})`,
			])

			String(query).must.equal("(('John', ?), ?, ('Rob', ?))")
			query.parameters.must.eql(["Smith", "Mike", "McBob"])
		})

		it("must not interpolate nested arrays", function() {
			var query = sql.tuple(["John", [1, 2]])
			String(query).must.equal("(?, ?)")
			query.parameters.must.eql(["John", [1, 2]])
		})
	})

	describe(".in", function() {
		it("must return Sql with tuples", function() {
			var query = sql.in(["John", 42])
			String(query).must.equal("(?, ?)")
			query.parameters.must.eql(["John", 42])
		})

		it("must return Sql with null tuple given an empty array", function() {
			var query = sql.in([])
			String(query).must.equal("(NULL)")
			query.parameters.must.eql([])
		})

		it("must return Sql given embedded SQL", function() {
			var query = sql.in([
				sql`('John', ${"Smith"})`,
				"Mike",
				sql`('Rob', ${"McBob"})`,
			])

			String(query).must.equal("(('John', ?), ?, ('Rob', ?))")
			query.parameters.must.eql(["Smith", "Mike", "McBob"])
		})

		it("must not interpolate nested arrays", function() {
			var query = sql.in(["John", [1, 2]])
			String(query).must.equal("(?, ?)")
			query.parameters.must.eql(["John", [1, 2]])
		})
	})

	describe(".concat", function() {
		it("must return empty Sql given empty array", function() {
			var query = sql.concat([])
			query.must.be.an.instanceof(Sql)
			String(query).must.equal("")
			query.parameters.must.eql([])
		})

		it("must return Sql given one element with no parameters", function() {
			var query = sql.concat([new Sql("SELECT 42")])
			query.must.be.an.instanceof(Sql)
			String(query).must.equal("SELECT 42")
			query.parameters.must.eql([])
		})

		it("must return Sql given one element with parameters", function() {
			var query = sql.concat([new Sql("SELECT ", [42])])
			query.must.be.an.instanceof(Sql)
			String(query).must.equal("SELECT ")
			query.parameters.must.eql([42])
		})

		it("must return Sql given elements with no parameters", function() {
			var query = sql.concat([
				sql`SELECT 13`,
				sql`, 37, 42`,
				sql`, 69`
			])

			query.must.be.an.instanceof(Sql)
			String(query).must.equal("SELECT 13, 37, 42, 69")
			query.parameters.must.eql([])
		})

		it("must return Sql given elements with parameters", function() {
			var query = sql.concat([
				sql`SELECT ${13}`,
				sql`, ${37}, ${42}`,
				sql`, ${69}`
			])

			query.must.be.an.instanceof(Sql)
			String(query).must.equal("SELECT ?, ?, ?, ?")
			query.parameters.must.eql([13, 37, 42, 69])
		})
	})
})
