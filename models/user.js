const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

const db = require('../db');
const sqlForPartialUpdate = require('../helpers/partialUpdate');
const ExpressError = require('../helpers/expressError');
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require('../config');


class User {
  constructor({ username, password, first_name, last_name, email, photo_url, is_admin }) {
    this.username = username;
    this.password = password;
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
    this.photo_url = photo_url;
    this.is_admin = is_admin || false;
  }

  static async all() {

    const results = await db.query(
      `SELECT
        username,
        first_name,
        last_name,
        email
        FROM users`
    );

    let users = results.rows;

    return { users };
  }

  static async getByUsername(username) {
    const results = await db.query(
      `SELECT
        u.username,
        first_name,
        last_name,
        email,
        photo_url,
        a.state,
        a.created_at,
        j.title,
        j.company_handle
        FROM users u
        LEFT JOIN applications a ON u.username = a.username
        LEFT JOIN jobs j ON j.id = a.job_id
        WHERE u.username = $1`,
      [username]
    );

    const userInfo = results.rows[0];
    if (!userInfo) {
      throw new ExpressError('User not found!', 404);
    }

    const jobs = results.rows[0].title ? results.rows.map(r => ({
      title: r.title,
      company_handle: r.company_handle,
      state: r.state,
      created_at: r.created_at
    })) : [];

    const user = {
      username: userInfo.username,
      first_name: userInfo.first_name,
      last_name: userInfo.last_name,
      email: userInfo.email,
      photo_url: userInfo.photo_url,
      jobs: jobs
    }
    return { user }
  }

  static async update(username, items) {

    if (items.password) {
      items.password = await bcrypt.hash(items.password, BCRYPT_WORK_FACTOR);
    }

    let queryParams = sqlForPartialUpdate("users", items, "username", username);

    const update = await db.query(
      queryParams.query,
      queryParams.values
    );

    if (update.rows.length === 0) {
      throw new ExpressError('User does not exist', 404);
    }

    let { password, is_admin, ...user } = update.rows[0];

    return { user };
  }

  async addToDb() {
    const hashedPassword = await bcrypt.hash(this.password, BCRYPT_WORK_FACTOR);

    await db.query(
      `INSERT INTO users
        (username,
        password,
        first_name,
        last_name,
        email,
        photo_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        username,
        first_name,
        last_name,
        email,
        photo_url`,
      [this.username,
        hashedPassword,
      this.first_name,
      this.last_name,
      this.email,
      this.photo_url]
    );

    delete this.password;
  }

  createToken() {
    let payload = { username: this.username, is_admin: this.is_admin };
    let token = jwt.sign(payload, SECRET_KEY);

    return token;
  }

  static async login(credentials) {
    const user = await db.query(
      `SELECT
        username,
        password,
        is_admin
        FROM users
        WHERE username = $1`,
      [credentials.username]
    );

    if (!user.rows[0]) {
      throw new ExpressError("Invalid username/password", 401);
    }

    if (await bcrypt.compare(credentials.password, user.rows[0].password)) {
      return new User(user.rows[0]);
    }
    throw new ExpressError("Invalid username/password", 401);
  }

  static async deleteFromDb(username) {
    const deleted = await db.query(
      `DELETE FROM users
        WHERE username = $1`,
      [username]
    );

    if (deleted.rowCount === 0) {
      throw new ExpressError('User does not exist', 404);
    }

    return { message: "User successfully deleted" };
  }

}

module.exports = User;