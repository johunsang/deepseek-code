import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app, UserStore, startServer } from '../src/server';
import type { Server } from 'http';

describe('Express REST API Server', () => {
  let server: Server;
  let testUserStore: UserStore;

  beforeEach(() => {
    // 테스트용 새로운 UserStore 인스턴스 생성
    testUserStore = new UserStore();
    
    // 테스트용 초기 데이터 추가
    testUserStore.createUser('Test User 1', 'test1@example.com');
    testUserStore.createUser('Test User 2', 'test2@example.com');
  });

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Express REST API Server');
      expect(response.body.data).toHaveProperty('endpoints');
      expect(response.body.data.endpoints).toHaveProperty('GET /users');
      expect(response.body.data.endpoints).toHaveProperty('POST /users');
      expect(response.body.data.endpoints).toHaveProperty('DELETE /users/:id');
    });
  });

  describe('GET /health', () => {
    it('should return health check information', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Server is healthy');
      expect(response.body.data).toHaveProperty('status', 'OK');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('memory');
    });
  });

  describe('GET /users', () => {
    it('should return all users', async () => {
      const response = await request(app).get('/users');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('count');
      expect(response.body.count).toBeGreaterThanOrEqual(2); // 초기 데이터 2개
    });

    it('should return users with correct structure', async () => {
      const response = await request(app).get('/users');
      
      expect(response.status).toBe(200);
      
      const users = response.body.data;
      expect(users.length).toBeGreaterThan(0);
      
      const user = users[0];
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('createdAt');
      expect(typeof user.id).toBe('string');
      expect(typeof user.name).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(new Date(user.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('POST /users', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        name: 'New Test User',
        email: 'newtest@example.com',
      };

      const response = await request(app)
        .post('/users')
        .send(newUser)
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(newUser.name);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data).toHaveProperty('createdAt');
    });

    it('should return 400 for invalid email', async () => {
      const invalidUser = {
        name: 'Test User',
        email: 'invalid-email',
      };

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should return 400 for missing name', async () => {
      const invalidUser = {
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    it('should return 400 for empty name', async () => {
      const invalidUser = {
        name: '',
        email: 'test@example.com',
      };

      const response = await request(app)
        .post('/users')
        .send(invalidUser)
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete an existing user', async () => {
      // 먼저 사용자 생성
      const createResponse = await request(app)
        .post('/users')
        .send({
          name: 'User to Delete',
          email: 'delete@example.com',
        });
      
      const userId = createResponse.body.data.id;
      
      // 사용자 삭제
      const deleteResponse = await request(app)
        .delete(`/users/${userId}`);
      
      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.message).toBe(`User with id ${userId} deleted successfully`);
      expect(deleteResponse.body.data.id).toBe(userId);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .delete('/users/nonexistent-id');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with id nonexistent-id not found');
    });

    it('should return 404 for invalid user ID format', async () => {
      const response = await request(app)
        .delete('/users/123'); // 존재하지 않는 ID
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for unknown endpoint', async () => {
      const response = await request(app).get('/unknown-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/users')
        .send('invalid json')
        .set('Content-Type', 'application/json');
      
      // Express의 기본 JSON 파서는 잘못된 JSON에 대해 400을 반환합니다
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('UserStore class', () => {
    it('should create and retrieve users', () => {
      const store = new UserStore();
      
      const user = store.createUser('Test', 'test@example.com');
      expect(user).toHaveProperty('id');
      expect(user.name).toBe('Test');
      expect(user.email).toBe('test@example.com');
      
      const retrievedUser = store.getUserById(user.id);
      expect(retrievedUser).toEqual(user);
    });

    it('should delete users', () => {
      const store = new UserStore();
      
      const user = store.createUser('Test', 'test@example.com');
      const deleted = store.deleteUser(user.id);
      
      expect(deleted).toBe(true);
      expect(store.getUserById(user.id)).toBeUndefined();
    });

    it('should return all users', () => {
      const store = new UserStore();
      
      store.createUser('User 1', 'user1@example.com');
      store.createUser('User 2', 'user2@example.com');
      
      const users = store.getAllUsers();
      expect(users).toHaveLength(2);
      expect(users[0].name).toBe('User 1');
      expect(users[1].name).toBe('User 2');
    });

    it('should count users correctly', () => {
      const store = new UserStore();
      
      expect(store.getUserCount()).toBe(0);
      
      store.createUser('User 1', 'user1@example.com');
      expect(store.getUserCount()).toBe(1);
      
      store.createUser('User 2', 'user2@example.com');
      expect(store.getUserCount()).toBe(2);
      
      store.deleteUser(store.getAllUsers()[0].id);
      expect(store.getUserCount()).toBe(1);
    });
  });
});