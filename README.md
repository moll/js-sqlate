Sqlate.js
=========
[![NPM version][npm-badge]](https://www.npmjs.com/package/sqlate)

Sqlate.js is a tiny [tagged template string][template-string] function library for JavaScript that **permits you to write SQL in a template string and get a `Sql` instance out with parameter placeholders**. You can then pass the SQL and parameters safely to [Mapbox's SQLite3][node-sqlite3], [Brian Carlson's PostgreSQL][node-postgresql] or other Node.js database libraries.

[npm-badge]: https://img.shields.io/npm/v/sqlate.svg
[template-string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
[node-sqlite3]: https://github.com/mapbox/node-sqlite3
[node-postgresql]: https://node-postgres.com


Installing
----------
```sh
npm install sqlate
```

Sqlate.js follows [semantic versioning](http://semver.org), so feel free to depend on its major version with something like `>= 1.0.0 < 2` (a.k.a `^1.0.0`).


Using
-----
```javascript
var Sql = require("sqlate").Sql
var sql = require("sqlate")

var ids = [1, 2, 3]
var age = 42
var query = sql`SELECT * FROM models WHERE id IN ${sql.in(ids)} AND age > ${age}`
query instanceof Sql // => true
```

The `query` variable will be set to an instance of `Sql`. This way you can differentiate safe SQL from plain strings.

When you stringify the above query via `String(query)`, you'll get the SQL with values transformed to placeholders:

```sql
SELECT * FROM models WHERE id IN (?, ?, ?) AND age > ?
```

To get the values, get the `parameters` property from the `query`.

Values (incl. arrays) get interpolated as placeholders in the SQL itself. By default this is the SQLite variant's question mark (`?`). To select a placeholder appropriate for PostgreSQL, call `Sql.prototype.toString` with `"$"`:

```javascript
var name = "John"
var query = sql`SELECT * FROM models WHERE name = ${name}`
query.toString("$") // => SELECT * FROM models WHERE name = $1
```

As Sqlate.js explicitly supports [Brian Carlson's PostgreSQL library][node-postgresql], you can just pass your query to the `Client.prototype.query` function and it picks dollars for you automatically. See below for [more details](#using-with-brian-carlsons-postgresql-library).

### Tuples
When you need arrays to be interpreted as tuples (for a compound comparison or an `IN` query) or as just comma separated values, you've got `sql.tuple`, `sql.in` and `sql.csv` to help you:

```javascript
var nameAndAge = ["John", 42]
var query = sql`SELECT * FROM models WHERE (name, age) = ${sql.tuple(nameAndAge)}`

var ids = [1, 2, 3]
var query = sql`SELECT * FROM cars WHERE id IN ${sql.in(ids)}`

var tags = ["convertible", "v8"]
var query = sql`SELECT * FROM cars WHERE tags @> ARRAY[${sql.csv(tags)}]`
```

`sql.tuple` and `sql.in` differ in the way they handle empty arrays. The former gives you an empty tuple (`()`) for an empty array, which will cause a SQL syntax error in an `IN` query. That's where `sql.in` comes in handy — it returns `(NULL)` so an `IN` query fails to match. Note however that the way SQL's ternary logic works, a `NOT IN` query with a null value (`id NOT IN (NULL)` or even `id NOT IN (1, NULL, 3)`) will also never match, which isn't what you probably want. To ensure both empty arrays and nulls in a `NOT IN` clause work, use `COALESCE`:

```javascript
var ids = []
var query = sql`
  SELECT * FROM cars
  WHERE COALESCE(id NOT IN ${sql.in(ids)}, true)
`
```

The above will create the following SQL, which should behave correctly in the face of NULLs:

```sql
SELECT * FROM cars
WHERE COALESCE(id NOT IN (NULL), true)
```

Here's a table of what `sql.tuple`, `sql.in` and `sql.csv` generate:

Sqlate                 | SQL
-----------------------|----
`sql.tuple([])`        | `()`
`sql.tuple([1])`       | `(1)`
`sql.tuple([1, 2, 3])` | `(1, 2, 3)`
`sql.in([])`           | `(NULL)`
`sql.in([1])`          | `(1)`
`sql.in([1, 2, 3])`    | `(1, 2, 3)`
`sql.csv([])`          | _Nothing_
`sql.csv([1])`         | `1`
`sql.csv([1, 2, 3])`   | `1, 2, 3`

When you need to get nested tuples, like when creating an insert statement, use `sql.tuple` on each array element and `sql.csv` on the outer array. See [below](#creating-insert-statements) for an example.

### Composing SQL
You can freely compose different pieces of SQL safely by passing one `Sql` instance to another:

```javascript
var id = 42
var name = "John"
var idClause = sql`id = ${id}`
var nameClause = sql`name = ${name}`
var query = sql`SELECT * FROM models WHERE ${idClause} AND ${nameClause}`
```

This will generate the following query:

```sql
SELECT * FROM models WHERE id = ? AND name ?
```

When you need to interpolate an array of generated SQL, use `sql.concat`:

```javascript
var ranges = [[10, 15], [25, 30], [40, 45]]

sql`
  SELECT * FROM models
  WHERE age = 0
  ${sql.concat(ranges.map(([a, b]) => sql` OR age BETWEEN ${a} AND ${b}`))}
`
```

Without `sql.concat`, the interpolated array (from `ranges.map` in the example)
would be considered a regular parameter to be passed to the database, not
something that contains SQL inside.

### Creating Insert Statements
Sqlate.js also has helpers to quote table and column names. These come in handy for insert statements:

```javascript
var table = "models"
var columns = ["name", "age"]
var values = [["John", 42], ["Mike", 13]]

var query = sql`
  INSERT INTO ${sql.table(table)} ${sql.tuple(columns.map(sql.column))}
  VALUES ${sql.csv(values.map(sql.tuple))}
`
```

This will generate the following query:

```sql
INSERT INTO "models" ("name", "age") VALUES (?, ?), (?, ?)
```

The two helpers, `sql.table` and `sql.column`, have no differences other than their names. While it's safe to pass untrusted data as values, **watch out for using untrusted data as table and column names**. Sqlate.js quotes them as per the SQL 1999 standard (using two double-quotes `""` for embedded quotes) if you use `sql.column`, but just to be safe, use a whitelist.

### Using with Mapbox's SQLite3 Library
If you'd like to use Sqlate.js with [Mapbox's SQLite3 library][node-sqlite3], here's an example of how you'd do so:

```javascript
var Sqlite3 = require("sqlite3")
var db = new Sqlite3.Database(":memory:")
db.serialize()

var ids = [1, 2, 3]
var age = 42
var query = sql`SELECT * FROM models WHERE id IN ${sql.tuple(ids)} AND age > ${age}`
db.all(String(query), query.parameters)
```

For a complete [Table Data Gateway][table-data-gateway] library for SQLite that works with Sqlate.js, see [Heaven.js on SQLite](https://github.com/moll/node-heaven-sqlite).

[table-data-gateway]: https://en.wikipedia.org/wiki/Table_data_gateway

### Using with Brian Carlson's PostgreSQL Library
If you'd like to use Sqlate.js with [Brian Carlson's PostgreSQL library][node-postgresql], here's an example of how you'd do so:

```javascript
var PgClient = require("pg")
var db = new PgClient({host: "localhost", database: "models"})
db.connect()

var ids = [1, 2, 3]
var age = 42
var query = sql`SELECT * FROM models WHERE id IN ${sql.tuple(ids)} AND age > ${age}`
db.query(query.toString("$"), query.parameters)
```

Because Sqlate.js's `Sql` object also has property aliases for the [PostgreSQL's library][node-postgresql]'s [query config object](https://node-postgres.com/features/queries), you can also pass the query directly:

```javascript
var ids = [1, 2, 3]
var age = 42
db.query(sql`SELECT * FROM models WHERE id IN ${sql.tuple(ids)} AND age > ${age}`)
```

This chooses the "$" style of placeholders automatically.

### Query Helpers
Rather than create a query and unpack it to SQL and parameters at call sites manually, I recommend you create a two helper functions — `search` and `read` — for accessing your database:

```javascript
var Sql = require("sqlate").Sql
var db = connect() // Using your favorite database library here.

// Returns an promise of an array of rows.
function search(query) {
  if (!(query instanceof Sql)) throw new TypeError("Invalid Query: " + query)
  return db.query(String(query), query.parameters)
}

// Returns a promise of a single row.
function read(query) {
  return search(query).then(function(rows) { return rows[0] })
}
```

This way you have a [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) interface that you can safely pass SQL to without worrying you'll accidentally cause an SQL injection:

```javascript
var sql = require("sqlate")
var id = 42
read(sql`SELECT * FROM models WHERE id = ${id} LIMIT 1`)
```


License
-------
Sqlate.js is released under a *Lesser GNU Affero General Public License*, which in summary means:

- You **can** use this program for **no cost**.
- You **can** use this program for **both personal and commercial reasons**.
- You **do not have to share your own program's code** which uses this program.
- You **have to share modifications** (e.g. bug-fixes) you've made to this program.

For more convoluted language, see the `LICENSE` file.


About
-----
**[Andri Möll][moll]** typed this and the code.  
[Monday Calendar][monday] supported the engineering work.

If you find Sqlate.js needs improving, please don't hesitate to type to me now at [andri@dot.ee][email] or [create an issue online][issues].

[email]: mailto:andri@dot.ee
[issues]: https://github.com/moll/js-sqlate/issues
[moll]: https://m811.com
[monday]: https://mondayapp.com
