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
var query = sql`SELECT * FROM models WHERE id IN (${ids}) AND age > ${age}`
query instanceof Sql // => true
```

The `query` variable will be set to an instance of `Sql`. This way you can differentiate safe SQL from plain strings.

When you stringify the above query via `String(query)`, you'll get the SQL with values transformed to placeholders:

```sql
SELECT * FROM models WHERE id IN (?, ?, ?) AND age > ?
```

To get the values, get the `parameters` property from the `query`.

Regular values get interpolated as placeholders (question marks) and arrays get interpolated as a comma-separated list of question marks. This allows using JavaScript arrays both for SQL tuples and [(PostgreSQL) arrays](https://www.postgresql.org/docs/9.6/functions-array.html):

```javascript
var nameAndAge = ["John", 42]
var query = sql`SELECT * FROM models WHERE (name, age) = (${ids})`

var tags = ["convertible", "v8"]
var query = sql`SELECT * FROM cars WHERE tags @> ARRAY[${ids}]`
```

When you need to get nested tuples, like when creating an insert statement, use `sql.tuple` on each array element. See [below](#creating-insert-statements) for an example.

### Composing SQL
You can freely compose different pieces of SQL safely by passing one `Sql` instance to another:

```javascript
var id = 42
var name = "John"
var idClause = sql`id = ${id}`
var nameClause = sql`name = ${name}`
db.query(sql`SELECT * FROM models WHERE ${idClause} AND ${nameClause}`)
```

This will generate the following query:

```sql
SELECT * FROM models WHERE id = ? AND name ?
```

### Creating Insert Statements
Sqlate.js also has helpers to quote table and column names. These come in handy for insert statements:

```javascript
var table = sql.table("models")
var columns = ["name", "age"].map(sql.column)
var values = [["John", 42], ["Mike", 13]].map(sql.tuple)
db.query(sql`INSERT INTO ${table} ${columns} VALUES ${values}`)
```

This will generate the following query:

```sql
INSERT INTO "models" ("name", "age") VALUES (?, ?), (?, ?)
```

The two helpers, `sql.table` and `sql.column`, have no differences other than their names. While it's safe to pass untrusted data as values, **watch out for using untrusted data as table and column names**. Sqlate.js quotes them as per the SQL 1999 standard (using two double-quotes `""` for embedded quotes) if you use `sql.column`, but just to be safe, use a whitelist.

### Using with Mapbox's SQLite3
If you'd like to use Sqlate.js with [Mapbox's SQLite3][node-sqlite3] library, here's an example of how you'd do so:

```javascript
var Sqlite3 = require("sqlite3")
var db = new Sqlite3.Database(":memory:")
db.serialize()

var ids = [1, 2, 3]
var age = 42
var query = sql`SELECT * FROM models WHERE id IN (${ids}) AND age > ${age}`
db.all(String(query), query.parameters)
```

For a complete [Table Data Gateway][table-data-gateway] library for SQLite that works with Sqlate.js, see [Heaven.js on SQLite](https://github.com/moll/node-heaven-sqlite).

[table-data-gateway]: https://en.wikipedia.org/wiki/Table_data_gateway

### Using with Brian Carlson's PostgreSQL
If you'd like to use Sqlate.js with [Brian Carlson's PostgreSQL][node-postgresql] library, here's an example of how you'd do so:

```javascript
var PgClient = require("pg")
var db = new PgClient({host: "localhost", database: "models"})
db.connect()

var ids = [1, 2, 3]
var age = 42
var query = sql`SELECT * FROM models WHERE id IN (${ids}) AND age > ${age}`
db.query(String(query), query.parameters)
```

Because Sqlate.js's `Sql` object also has property aliases for the PostgreSQL's library's [query config object](https://node-postgres.com/features/queries), you can also pass the query directly:

```javascript
var ids = [1, 2, 3]
var age = 42
db.query(sql`SELECT * FROM models WHERE id IN (${ids}) AND age > ${age}`)
```

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
