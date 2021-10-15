## 2.2.0 (Oct 15, 2021)
- Adds `sql.concat` for concatenating an array of SQLs.  
  This could be useful for generating a series of `AND`s or `ORs`:

  ```javascript
  var ranges = [[10, 15], [25, 30], [40, 45]]

  sql`
    SELECT * FROM models
    WHERE age = 0
    ${sql.concat(ranges.map(([a, b]) => sql` OR age BETWEEN ${a} AND ${b}`))}
  `
  ```

## 2.1.0 (Jul 26, 2019)
- Adds `sql.in` for easier use in `IN` queries.

  Given an empty array, `sql.in` returns `(NULL)`. This prevents a SQL syntax error due to the empty tuple (`()`) you'd get with `sql.tuple` while still causing the `IN` query to not match anything. Note however that a `NOT IN (NULL)` query will always fail to match. See the README on how to handle that.


## 2.0.0 (Apr 30, 2019)
- Interpolates arrays always as single values (as opposed to comma separated list) to be more consistent in face of dynamic input.

  To now generate `id IN (1, 2, 3)` queries, use `sql.tuple`:

  ```javascript
  sql`SELECT * FROM models WHERE id IN ${sql.tuple(ids)} AND age > ${age}`
  ```

  To generate `tags @> ARRAY[${tags}]` queries, use `sql.csv`:

  ```javascript
  sql`SELECT * FROM cars WHERE tags @> ARRAY[${sql.csv(tags)}]`
  ```

  While the prior comma separated default was convenient for the two cases above, it interfered with `UPDATE models SET tags = ${tags}`. It may also have generated invalid SQL if you didn't expect some value to be an array. It wouldn't have caused a security issue, but invalid SQL wasn't great either.

- Adds support for calling `Sql.prototype.toString` with other placeholder formats.
- Fixes PostgreSQL support by using `$` placeholders, not `?`s.

## 1.0.0 (Apr 27, 2019)
- Things could sqlate quickly.
