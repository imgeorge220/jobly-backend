process.env.NODE_ENV = "test";

const request = require("supertest");
const app = require("../../app")
const db = require('../../db');
const Company = require('../../models/company');
const Job = require('../../models/job');
const User = require('../../models/user');

let adminUser, standardUser, tokenAdmin, tokenStandard, c1, j1;

beforeEach(async function () {
  db.query('DELETE FROM companies');
  db.query('DELETE FROM jobs');
  db.query('DELETE FROM users');

  adminUser = new User({
    username: "adminUser",
    password: "adminPassword",
    first_name: "adminFirst",
    last_name: "adminLast",
    email: "admin@email.net",
    photo_url: "adminPhoto",
    is_admin: true,
  });

  standardUser = new User({
    username: "standardUser",
    password: "standardPassword",
    first_name: "standardFirst",
    last_name: "standardLast",
    email: "standard@email.net",
    photo_url: "standardPhoto",
  });

  c1 = new Company({
    handle: "testHandle1",
    name: "TestName1",
    description: "test 1 company description",
    num_employees: 5,
    logo_url: "www.test.gov"
  });

  j1 = new Job({
    title: "TestTitle1",
    salary: 100.00,
    equity: 0.1,
    company_handle: "testHandle1"
  })


  await adminUser.addToDb();
  await standardUser.addToDb();
  tokenAdmin = adminUser.createToken();
  tokenStandard = standardUser.createToken();

  await c1.addToDb();
  await j1.addToDb();
});

describe("GET /jobs tests", () => {
  test("Get all- no filter",
    async function () {
      const resp = await request(app).get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- search by title",
    async function () {
      const resp = await request(app).get(`/jobs?search=TestTitle`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- search by title - fails if no match",
    async function () {
      const resp = await request(app).get(`/jobs?search=TestTitle3`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual("No jobs found");
    }
  );

  test("Get- filter by min_salary",
    async function () {
      const resp = await request(app).get(`/jobs?minSalary=50`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- filter by min_salary - fails if no match",
    async function () {
      const resp = await request(app).get(`/jobs?minSalary=1000`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('No jobs found');
    }
  );

  test("Get- filter by min_equity",
    async function () {
      const resp = await request(app).get(`/jobs?minEquity=0.01`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- filter by min_equity - fails if no match",
    async function () {
      const resp = await request(app).get(`/jobs?minEquity=.5`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('No jobs found');
    }
  );

  test("Get- filter by all possible params",
    async function () {
      const resp = await request(app)
        .get(`/jobs?minSalary=5&minEquity=0.01&search=test`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- filter by all possible params",
    async function () {
      const resp = await request(app)
        .get(`/jobs?minSalary=5&minEquity=0.01&search=test`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.jobs.length).toEqual(1);
    }
  );

  test("Get- fails if not logged in",
    async function () {
      const resp = await request(app)
        .get(`/jobs`);

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Unauthorized");
    }
  );
});

describe("GET /jobs/:id tests", () => {
  test("Get one job",
    async function () {
      const resp = await request(app)
        .get(`/jobs/${j1.id}`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({ job: expect.any(Object) });
    }
  );

  test("Get one job - fails if job doesn't exist",
    async function () {
      const resp = await request(app)
        .get(`/jobs/0`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('Job not found!');
    }
  );

  test("Get one job - fails if not logged in",
    async function () {
      const resp = await request(app)
        .get(`/jobs/${j1.id}`);

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');
    }
  );
});

describe("POST /jobs tests", () => {
  test("Post - creates new job",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(201);
      expect(resp.body).toEqual({ job: expect.any(Object) });

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(2);
    }
  );

  test("Post - fails with invalid input types - refer to JSON schema",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          title: 100,
          salary: "200.00",
          equity: "0.5",
          company_handle: 1111,
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(4);

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Post - fails with missing required inputs (title, salary, equity)",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          company_handle: "testHandle1",
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(3);

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Post - fails with extraneous inputs",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          extraKey: "Post should fail!",
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(1);

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Post - fails if not logged in",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Unauthorized");

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Post - fails if not admin",
    async function () {
      const resp = await request(app)
        .post(`/jobs`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          _token: tokenStandard,
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Unauthorized");

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );
});

describe("POST /jobs/:id/apply tests", () => {
  test("Post - creates new job application",
    async function () {
      const resp = await request(app)
        .post(`/jobs/${j1.id}/apply`)
        .send({
          state: "applied",
          _token: tokenStandard,
        });

      expect(resp.statusCode).toEqual(201);
      expect(resp.body.message).toEqual("applied");

      const respGet = await request(app)
        .get(`/users/standardUser`);

      console.log(respGet.body.user);
      expect(respGet.body.user.jobs[0].title).toEqual('TestTitle1');
    }
  );

  test("Post - fails if no user",
    async function () {
      const resp = await request(app)
        .post(`/jobs/${j1.id}/apply`)
        .send({ state: "applied" });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual("Unauthorized");
    }
  );

  test("Post - fails if invalid inputs",
    async function () {
      const resp = await request(app)
        .post(`/jobs/${j1.id}/apply`)
        .send({
          state: "invalid state",
          _token: tokenStandard,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message.length).toEqual(1);
    }
  );

  test("Post - fails if missing required inputs",
    async function () {
      const resp = await request(app)
        .post(`/jobs/${j1.id}/apply`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message.length).toEqual(1);
    }
  );

  test("Post - fails if extraneous inputs",
    async function () {
      const resp = await request(app)
        .post(`/jobs/${j1.id}/apply`)
        .send({
          state: "applied",
          _token: tokenStandard,
          invalid: "post should fail",
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message.length).toEqual(1);
    }
  );
});

describe("PATCH /jobs/:id tests", () => {
  test("Patch - updates existing job",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          salary: 1000.00,
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body).toEqual({ job: expect.any(Object) });
      expect(resp.body.job.salary).toEqual(1000.00);

      const respGet = await request(app)
        .get(`/jobs/${j1.id}`)
        .send({ _token: tokenStandard });

      expect(respGet.body.job.salary).toEqual(1000.00);
    }
  );

  test("Patch - fails with invalid input types - refer to JSON schema",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: 100,
          salary: "200.00",
          equity: "0.5",
          company_handle: 1111,
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(4);

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Patch - fails with extraneous inputs",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          extraKey: "Post should fail!",
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(400);
      expect(resp.body.message).toEqual(expect.any(Array));
      expect(resp.body.message.length).toEqual(1);

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Patch - fails if job id doesn't exist",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/0`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          _token: tokenAdmin,
        });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('Job does not exist');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Patch - fails if not logged in",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Patch - fails if not admin",
    async function () {
      const resp = await request(app)
        .patch(`/jobs/${j1.id}`)
        .send({
          title: "TestTitle2",
          salary: 200.00,
          equity: 0.5,
          company_handle: "testHandle1",
          _token: tokenStandard,
        });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );
});

describe("DELETE /jobs/:id tests", () => {
  test("Delete - removes job",
    async function () {
      const resp = await request(app)
        .delete(`/jobs/${j1.id}`)
        .send({ _token: tokenAdmin });

      expect(resp.statusCode).toEqual(200);
      expect(resp.body.message).toEqual("Job successfully deleted");

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.message).toEqual("No jobs found");
    }
  );

  test("Delete - fails if job id doesn't exist",
    async function () {
      const resp = await request(app)
        .delete(`/jobs/0`)
        .send({ _token: tokenAdmin });

      expect(resp.statusCode).toEqual(404);
      expect(resp.body.message).toEqual('Job does not exist');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Delete - fails if not logged",
    async function () {
      const resp = await request(app)
        .delete(`/jobs/${j1.id}`);

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );

  test("Delete - fails if not admin",
    async function () {
      const resp = await request(app)
        .delete(`/jobs/${j1.id}`)
        .send({ _token: tokenStandard });

      expect(resp.statusCode).toEqual(401);
      expect(resp.body.message).toEqual('Unauthorized');

      const respGet = await request(app)
        .get(`/jobs`)
        .send({ _token: tokenStandard });

      expect(respGet.body.jobs.length).toEqual(1);
    }
  );
});

afterAll(async function () {
  await db.end();
});
