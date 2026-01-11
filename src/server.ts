import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// 환경 변수 설정
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// User 타입 정의
interface User {
  id: string;
  name: string; email: string;
  createdAt: Date;
}

// API 응답 타입
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  details?: any;
}

// 유효성 검사를 위한 스키마
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  email: z.string().email('Invalid email format').max(255, 'Email is too long'),
});

// 로깅 유틸리티
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
};

// 메모리 기반 데이터 저장소
class UserStore {
  private users: Map<string, User> = new Map();
  private idCounter = 1;

  // 모든 사용자 조회
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // 사용자 생성
  createUser(name: string, email: string): User {
    const id = (this.idCounter++).toString();
    const user: User = {
      id,
      name,
      email,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    logger.info(`User created: ${id} - ${name}`);
    return user;
  }

  // 사용자 삭제
  deleteUser(id: string): boolean {
    const deleted = this.users.delete(id);
    if (deleted) {
      logger.info(`User deleted: ${id}`);
    }
    return deleted;
  }

  // ID로 사용자 조회
  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  // 사용자 수 조회
  getUserCount(): number {
    return this.users.size;
  }
}

// Express 앱 생성
const app: express.Application = express();

// 미들웨어 설정
app.use(express.json());

// 요청 로깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// 데이터 저장소 인스턴스 생성
const userStore = new UserStore();

// 초기 데이터 추가 (테스트용)
userStore.createUser('John Doe', 'john@example.com');
userStore.createUser('Jane Smith', 'jane@example.com');

// 에러 처리 미들웨어
const handleError = (error: Error, res: Response, operation: string) => {
  logger.error(`Error during ${operation}:`, error);
  res.status(500).json({
    success: false,
    error: `Internal server error during ${operation}`,
    ...(NODE_ENV === 'development' && { stack: error.stack }),
  });
};

// GET /users - 모든 사용자 조회
app.get('/users', (req: Request, res: Response) => {
  try {
    const users = userStore.getAllUsers();
    const response: ApiResponse = {
      success: true,
      data: users,
      count: users.length,
    };
    res.json(response);
  } catch (error) {
    handleError(error as Error, res, 'fetching users');
  }
});

// POST /users - 새 사용자 생성
app.post('/users', (req: Request, res: Response) => {
  try {
    // 요청 데이터 유효성 검사
    const validationResult = createUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const response: ApiResponse = {
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      };
      return res.status(400).json(response);
    }

    const { name, email } = validationResult.data;
    
    // 사용자 생성
    const newUser = userStore.createUser(name, email);
    
    const response: ApiResponse = {
      success: true,
      data: newUser,
      message: 'User created successfully',
    };
    
    res.status(201).json(response);
  } catch (error) {
    handleError(error as Error, res, 'creating user');
  }
});

// DELETE /users/:id - 사용자 삭제
app.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 사용자 존재 여부 확인
    const user = userStore.getUserById(id);
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: `User with id ${id} not found`,
      };
      return res.status(404).json(response);
    }
    
    // 사용자 삭제
    const deleted = userStore.deleteUser(id);
    
    if (deleted) {
      const response: ApiResponse = {
        success: true,
        message: `User with id ${id} deleted successfully`,
        data: user,
      };
      res.json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete user',
      };
      res.status(500).json(response);
    }
  } catch (error) {
    handleError(error as Error, res, 'deleting user');
  }
});

// 기본 경로
app.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Express REST API Server',
    data: {
      endpoints: {
        'GET /users': 'Get all users',
        'POST /users': 'Create a new user',
        'DELETE /users/:id': 'Delete a user by ID',
      },
      stats: {
        userCount: userStore.getUserCount(),
        environment: NODE_ENV,
      },
    },
  };
  res.json(response);
});

// 헬스 체크 엔드포인트
app.get('/health', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    message: 'Server is healthy',
    data: {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
  };
  res.json(response);
});

// 404 처리
app.use((req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: 'Endpoint not found',
  };
  res.status(404).json(response);
});

// 전역 에러 처리 미들웨어
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', error);
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: error.stack }),
  };
  res.status(500).json(response);
});

// 서버 시작 함수
const startServer = (port: number = PORT) => {
  return new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    try {
      const server = app.listen(port, () => {
        logger.info(`Server is running on http://localhost:${port}`);
        logger.info(`Environment: ${NODE_ENV}`);
        logger.info('Available endpoints:');
        logger.info('  GET  /');
        logger.info('  GET  /health');
        logger.info('  GET  /users');
        logger.info('  POST /users');
        logger.info('  DELETE /users/:id');
        resolve(server);
      });
      
      server.on('error', (error) => {
        logger.error('Server error:', error);
        reject(error);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      reject(error);
    }
  });
};

// 직접 실행 시 서버 시작
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { app, UserStore, startServer };