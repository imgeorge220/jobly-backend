process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../../app")
const db = require('../../db');
const User = require('../../models/user');

let standardUser, differentUser, token, token2;

beforeEach(async function () {
  db.query('DELETE FROM users')

  standardUser = new User({
    username: "testuser",
    password: "testpassword",
    first_name: "testfirst",
    last_name: "testlast",
    email: "test@email.net",
    photo_url: "testphoto",
  });

  differentUser = new User({
    username: "diffuser",
    password: "diffpassword",
    first_name: "difffirst",
    last_name: "difflast",
    email: "diff@email.net",
    photo_url: "diffphoto",
  });

  await standardUser.addToDb();
  await differentUser.addToDb();
  token = standardUser.createToken();
  token2 = differentUser.createToken();
});

describe("GET /users tests", () => {
  test("Get all users",
    async function () {
      const resp = await request(app).get(`/users`);

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.users.length).toEqual(2);
    }
  );
});

describe("GET /users/:username tests", () => {
  test("Get one user",
    async function () {
      const resp = await request(app)
        .get(`/users/testuser`);

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.user.username).toEqual("testuser");
    }
  );

  test("Get one user - fails if user doesn't exist",
    async function () {
      const resp = await request(app)
        .get(`/users/0`);

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('User not found!');
    }
  );
});

describe("POST /users tests", () => {
  test("Post - creates new user",
    async function () {
      const resp = await request(app)
        .post(`/users`)
        .send({
          username: "testuser2",
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
        });

      expect(resp.statusCode).toEqual(201);
      expect(resp.body._token).toEqual(expect.any(String));

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(3);
    }
  );

  test("Post - fails with invalid input types - refer to JSON schema",
    async function () {
      const resp = await request(app)
        .post(`/users`)
        .send({
          username: 0,
          password: "short",
          first_name: 0,
          last_name: 0,
          email: "invalid email",
          photo_url: 0,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(6);

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Post - fails with missing required inputs (uname, pw, f_name, l_name, email)",
    async function () {
      const resp = await request(app)
        .post(`/users`)
        .send({
          photo_url: "testphoto",
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(5);

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Post - fails with extraneous inputs",
    async function () {
      const resp = await request(app)
        .post(`/users`)
        .send({
          username: "testuser2",
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
          extra: "not-allowed",
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(1);

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );
});

describe("POST /users/login tests", () => {
  test("Post - logs in existing user with correct credentials",
    async function () {
      const resp = await request(app)
        .post(`/users/login`)
        .send({
          username: "testuser",
          password: "testpassword",
        });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body._token).toEqual(expect.any(String));

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Post - logs in existing user with incorrect password",
    async function () {
      const resp = await request(app)
        .post(`/users/login`)
        .send({
          username: "testuser",
          password: "wrongpassword",
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Invalid username/password");

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Post - logs in existing user with incorrect username",
    async function () {
      const resp = await request(app)
        .post(`/users/login`)
        .send({
          username: "wronguser",
          password: "testpassword",
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Invalid username/password");

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );
});

describe("PATCH /users/:username tests", () => {
  test("Patch - updates existing user",
    async function () {
      const resp = await request(app)
        .patch(`/users/testuser`)
        .send({
          first_name: "new-first-name",
          _token: token
        });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({ user: expect.any(Object) });
      expect(resp.body.user.first_name).toEqual('new-first-name');

      const respGet = await request(app)
        .get(`/users/testuser`);

      expect(respGet.body.user.first_name).toEqual('new-first-name');
    }
  );

  test("Patch - fails with invalid input types - refer to JSON schema",
    async function () {
      const resp = await request(app)
        .patch(`/users/testuser`)
        .send({
          password: "short",
          first_name: 0,
          last_name: 0,
          email: "invalid email",
          photo_url: 0,
          _token: token,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(5);

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Patch - fails with extraneous inputs",
    async function () {
      const resp = await request(app)
        .patch(`/users/testuser`)
        .send({
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
          extra: "not-allowed",
          _token: token,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(1);

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Patch - fails if username doesn't exist",
    async function () {
      const resp = await request(app)
        .patch(`/users/invalid`)
        .send({
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
          _token: token,
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Patch - fails if not logged in",
    async function () {
      const resp = await request(app)
        .patch(`/users/testuser`)
        .send({
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Patch - fails if not logged in as correct user",
    async function () {
      const resp = await request(app)
        .patch(`/users/testuser`)
        .send({
          password: "testpassword2",
          first_name: "testfirst2",
          last_name: "testlast2",
          email: "test2@email.net",
          photo_url: "testphoto2",
          _token: token2,
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );
});

describe("DELETE /users/:username tests", () => {
  test("Delete - removes user",
    async function () {
      const resp = await request(app)
        .delete(`/users/testuser`)
        .send({ _token: token, });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.message).toEqual("User successfully deleted");

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(1);
    }
  );

  test("Delete - fails if not logged in",
    async function () {
      const resp = await request(app)
        .delete(`/users/testuser`);

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );

  test("Delete - fails if not logged in as correct user",
    async function () {
      const resp = await request(app)
        .delete(`/users/testuser`)
        .send({ _token: token2 });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/users`);

      expect(respGet.body.users.length).toEqual(2);
    }
  );
});

afterAll(async function () {
  await db.end();
});
