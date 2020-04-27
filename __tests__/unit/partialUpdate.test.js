const sqlForPartialUpdate = require('../../helpers/partialUpdate');

describe("partialUpdate()", () => {
  test("should generate a proper partial update query with just 1 field",
    function () {
      let query = sqlForPartialUpdate(
        "test",
        { name: "apple" },
        "handle",
        "apl",
      );
      expect(query).toEqual({
        query: `UPDATE test SET name=$1 WHERE handle=$2 RETURNING *`,
        values: ["apple", "apl"]
      });
    });

  test("should generate a proper partial update query with multiple fields",
    function () {
      let query = sqlForPartialUpdate(
        "test",
        {
          name: "apple",
          description: "computers"
        },
        "handle",
        "apl",
      );
      expect(query).toEqual({
        query: `UPDATE test SET name=$1, description=$2 WHERE handle=$3 RETURNING *`,
        values: ["apple", "computers", "apl"]
      });

    });
});
