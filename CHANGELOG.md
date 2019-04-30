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
