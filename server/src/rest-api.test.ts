import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";
import app from "./rest-api";
import { db } from "./db/knex";
import * as helpers from "./helpers";

// Mock the database module so we don't hit the real DB
vi.mock("./db/knex", () => ({
  db: vi.fn(),
}));

describe("Secret Sharing API", () => {
  beforeEach(() => {
    // Reset mock implementations before each test
    (db as unknown as Mock).mockReset();
  });

  describe("POST /api/create", () => {
    it("should create a new secret (no password) and return a shortlink", async () => {
      const insertMock = vi.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({ insert: insertMock });

      vi.spyOn(helpers, "generateShortId").mockReturnValue("abcd1234");

      const payload = {
        content: "my-secret",
        expiration: { amount: 5, value: "m" },
      };

      const res = await request(app).post("/api/create").send(payload);
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.shortlink).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(res.body.shortlink).toContain("abcd1234");
      expect(insertMock).toHaveBeenCalled();
      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg).toHaveProperty("shortId", "abcd1234");
      expect(insertArg).toHaveProperty("expiresAt");
      expect(insertArg).toHaveProperty("fragments");
      const fragments = JSON.parse(insertArg.fragments);
      expect(Array.isArray(fragments)).toBe(true);
      expect(insertArg).toHaveProperty("hash", null);
    });

    it("should create a new secret with password and return a shortlink", async () => {
      const insertMock = vi.fn().mockResolvedValue(undefined);
      (db as any).mockReturnValue({ insert: insertMock });

      vi.spyOn(helpers, "generateShortId").mockReturnValue("xyz98765");

      const fakeHashedPassword = "fake-password";
      vi.spyOn(bcrypt, "hash").mockImplementation(
        async () => fakeHashedPassword,
      );

      const payload = {
        content: "another-secret",
        expiration: { amount: 10, value: "m" },
        password: "myPassword",
      };

      const res = await request(app).post("/api/create").send(payload);
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.shortlink).toMatch(/^[A-Za-z0-9]{8}$/);
      expect(res.body.shortlink).toContain("xyz98765");
      expect(bcrypt.hash).toHaveBeenCalledWith(
        payload.password,
        expect.anything(),
      );
      expect(insertMock).toHaveBeenCalled();
      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg).toHaveProperty("hash", fakeHashedPassword);
    });

    it("should return 400 if payload is invalid (empty content)", async () => {
      const payload = {
        content: "",
        expiration: { amount: 5, value: "m" },
      };

      const res = await request(app).post("/api/create").send(payload);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toContain("Content must be a non-empty string");
    });

    it("should return 400 if payload is invalid (missing expiration)", async () => {
      const payload = {
        content: "secret without expiration",
      };

      const res = await request(app).post("/api/create").send(payload);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toContain("Required");
    });
  });

  describe("GET /api/share/:shortId", () => {
    it("should return 404 if secret is not found", async () => {
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(undefined),
      });

      const res = await request(app).get("/api/share/nonexistent");
      expect(res.status).toBe(StatusCodes.NOT_FOUND);
      expect(res.body.message).toBe("Secret not found");
    });

    it("should return 404 and delete the secret if it has expired", async () => {
      const expiredSecret = {
        shortId: "expired1",
        expiresAt: new Date(Date.now() - 10000).toISOString(),
        hash: null,
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(expiredSecret);
      const delMock = vi.fn().mockResolvedValue(undefined);

      (db as any)
        .mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          first: firstMock,
        })
        .mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          del: delMock,
        });

      const res = await request(app).get("/api/share/expired1");
      expect(res.status).toBe(StatusCodes.NOT_FOUND);
      expect(res.body.message).toBe("Secret has expired");
      expect(delMock).toHaveBeenCalled();
    });

    it("should return 401 if secret is password protected", async () => {
      const protectedSecret = {
        shortId: "protected1",
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        hash: "someHashValue",
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(protectedSecret),
      });

      const res = await request(app).get("/api/share/protected1");
      expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
      expect(res.body.message).toBe("Password required");
    });

    it("should return secret content if secret is valid and not password protected", async () => {
      const validSecret = {
        shortId: "valid1",
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        hash: null,
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(validSecret);
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: firstMock,
      });

      vi.spyOn(helpers, "reassembleSecret").mockReturnValue("my-secret");

      const res = await request(app).get("/api/share/valid1");
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.content).toBe("my-secret");
    });
  });

  describe("POST /api/share/:shortId", () => {
    it("should return 400 if payload is invalid", async () => {
      const payload = {};
      const res = await request(app).post("/api/share/someId").send(payload);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
    });

    it("should return 404 if secret is not found", async () => {
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(undefined),
      });

      const payload = { password: "anyPassword" };
      const res = await request(app).post("/api/share/notfound").send(payload);
      expect(res.status).toBe(StatusCodes.NOT_FOUND);
      expect(res.body.message).toBe("Secret not found");
    });

    it("should return 404 if secret has expired", async () => {
      const expiredSecret = {
        shortId: "expired1",
        expiresAt: new Date(Date.now() - 10000).toISOString(),
        hash: "someHash",
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(expiredSecret);
      const delMock = vi.fn().mockResolvedValue(undefined);

      (db as any)
        .mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          first: firstMock,
        })
        .mockReturnValueOnce({
          where: vi.fn().mockReturnThis(),
          del: delMock,
        });

      const payload = { password: "anyPassword" };
      const res = await request(app).post("/api/share/expired1").send(payload);
      expect(res.status).toBe(StatusCodes.NOT_FOUND);
      expect(res.body.message).toBe("Secret has expired");
      expect(delMock).toHaveBeenCalled();
    });

    it("should return 400 if secret is not password protected", async () => {
      const secret = {
        shortId: "nopassword",
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        hash: null,
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(secret);
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: firstMock,
      });

      const payload = { password: "anyPassword" };
      const res = await request(app)
        .post("/api/share/nopassword")
        .send(payload);
      expect(res.status).toBe(StatusCodes.BAD_REQUEST);
      expect(res.body.message).toBe("Secret is not password protected");
    });

    it("should return 403 if incorrect password", async () => {
      const secret = {
        shortId: "wrongpass",
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        hash: "hashedPassword",
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(secret);
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: firstMock,
      });

      vi.spyOn(bcrypt, "compare").mockImplementation(async () => false);

      const payload = { password: "incorrect" };
      const res = await request(app).post("/api/share/wrongpass").send(payload);
      expect(res.status).toBe(StatusCodes.FORBIDDEN);
      expect(res.body.message).toBe("Incorrect password");
    });

    it("should return secret content if valid secret and correct password", async () => {
      const secret = {
        shortId: "valid",
        expiresAt: new Date(Date.now() + 10000).toISOString(),
        hash: "hashedPassword",
        fragments: JSON.stringify(["frag1", "frag2"]),
      };

      const firstMock = vi.fn().mockResolvedValue(secret);
      (db as any).mockReturnValue({
        where: vi.fn().mockReturnThis(),
        first: firstMock,
      });

      vi.spyOn(bcrypt, "compare").mockImplementation(async () => true);
      vi.spyOn(helpers, "reassembleSecret").mockReturnValue("my-secret");

      const payload = { password: "correctPassword" };
      const res = await request(app).post("/api/share/valid").send(payload);
      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body.content).toBe("my-secret");
    });
  });
});
