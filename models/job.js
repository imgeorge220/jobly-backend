const db = require('../db');
const sqlForPartialUpdate = require('../helpers/partialUpdate');
const ExpressError = require('../helpers/expressError');
const { buildJobFilter } = require("../helpers/buildFilterQuery");


class Job {
  constructor({ title, salary, equity, company_handle }) {
    this.title = title;
    this.salary = salary;
    this.equity = equity;
    this.company_handle = company_handle;
  }

  static async allByQueries(queries, username) {
    let filterParams = buildJobFilter(queries, username);

    const results = await db.query(
      filterParams.sqlQueryString,
      filterParams.values
    );
    
    let jobs = results.rows;

    return { jobs };
  }

  static async getByID(id) {
    const results = await db.query(
      `SELECT
          id,
          title,
          salary,
          equity,
          date_posted,
          c.handle,
          c.name,
          c.description,
          c.num_employees,
          c.logo_url
        FROM jobs
        JOIN companies c
        ON company_handle = c.handle
        WHERE id = $1`,
      [id]
    );

    const job = results.rows[0];

    if (!job) {
      throw new ExpressError('Job not found!', 404);
    }

    return {
      job: {
        id: job.id,
        title: job.title,
        salary: job.salary,
        equity: job.equity,
        date_posted: job.date_posted,
        company: {
          handle: job.handle,
          name: job.name,
          description: job.description,
          num_employees: job.num_employees,
          logo_url: job.logo_url
        }
      }
    };
  }


  static async update(id, items) {
    let queryParams = sqlForPartialUpdate("jobs", items, "id", id);

    const update = await db.query(
      queryParams.query,
      queryParams.values
    );

    if (update.rows.length === 0) {
      throw new ExpressError('Job does not exist', 404);
    }

    let job = update.rows[0];

    return { job };
  }

  async addToDb() {
    const job = (await db.query(
      `INSERT INTO jobs
          (title,
          salary,
          equity,
          company_handle)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          title,
          salary,
          equity,
          company_handle,
          date_posted`,
      [this.title,
      this.salary,
      this.equity,
      this.company_handle]
    )).rows[0];

    this.id = job.id;
    this.date_posted = job.date_posted;
  }

  static async deleteFromDb(id) {
    const deleted = await db.query(
      `DELETE FROM jobs
        WHERE id = $1`,
      [id]
    );

    if (deleted.rowCount === 0) {
      throw new ExpressError('Job does not exist', 404);
    }

    return { message: "Job successfully deleted" };
  }

  static async apply(username, id, state) {
    const update = (await db.query(
      `INSERT INTO applications (username, job_id, state)
      VALUES ($1, $2, $3)
      RETURNING state`, [username, id, state]
    )).rows[0].state;

    return update;
  }

}

module.exports = Job;