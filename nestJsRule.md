# NestJS Backend Project Architecture & Development Guide

This comprehensive guide documents the architecture, patterns, and conventions used in this NestJS backend project. Use this as a reference when creating similar projects.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Configuration Files](#configuration-files)
5. [Module Architecture](#module-architecture)
6. [Entity Patterns](#entity-patterns)
7. [DTO Patterns](#dto-patterns)
8. [Service Patterns](#service-patterns)
9. [Controller Patterns](#controller-patterns)
10. [Authentication & Authorization](#authentication--authorization)
11. [Database Configuration](#database-configuration)
12. [Common Utilities](#common-utilities)
13. [Interceptors & Guards](#interceptors--guards)
14. [Error Handling](#error-handling)
15. [API Documentation](#api-documentation)
16. [Testing](#testing)
17. [Docker & Deployment](#docker--deployment)
18. [Code Style & Linting](#code-style--linting)
19. [Best Practices](#best-practices)

---

## 🎯 Project Overview

This is a **NestJS** backend application following a modular, feature-based architecture. The project uses:
- **NestJS Framework** - Progressive Node.js framework for building efficient and scalable server-side applications
- **TypeORM** - ORM for database operations with PostgreSQL
- **JWT Authentication** - Token-based authentication using Passport.js
- **Swagger/OpenAPI** - API documentation
- **Class Validator** - Validation decorators for DTOs
- **Docker** - Containerization for deployment

---

## 🛠 Technology Stack

### Core Dependencies

```json
{
  "@nestjs/common": "^11.0.1",
  "@nestjs/core": "^11.0.1",
  "@nestjs/platform-express": "^11.0.1",
  "@nestjs/config": "^4.0.2",
  "@nestjs/typeorm": "^11.0.0",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/passport": "^11.0.5",
  "@nestjs/swagger": "^11.1.6",
  "typeorm": "^0.3.22",
  "pg": "^8.15.6",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "bcrypt": "^5.1.1",
  "class-validator": "^0.14.2",
  "class-transformer": "^0.5.1",
  "uuid": "^13.0.0",
  "rxjs": "^7.8.1"
}
```

### Development Dependencies

```json
{
  "@nestjs/cli": "^11.0.0",
  "@nestjs/schematics": "^11.0.0",
  "@nestjs/testing": "^11.0.1",
  "typescript": "^5.7.3",
  "eslint": "^9.18.0",
  "prettier": "^3.4.2",
  "jest": "^29.7.0",
  "ts-jest": "^29.2.5"
}
```

### Node.js Requirements
- **Node.js**: >= 20.0.0
- **npm**: >= 9.0.0

---

## 📁 Project Structure

```
leitner_backend/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module
│   ├── app.controller.ts          # Root controller
│   ├── app.service.ts             # Root service
│   │
│   ├── config/                    # Configuration modules
│   │   └── database.config.ts     # Database configuration
│   │
│   ├── common/                    # Shared utilities
│   │   ├── constants/             # Application constants
│   │   ├── decorators/            # Custom decorators
│   │   ├── guards/                # Global guards
│   │   ├── interceptors/          # Global interceptors
│   │   └── interfaces/            # Shared interfaces
│   │
│   └── modules/                   # Feature modules (domain-driven)
│       ├── auth/                  # Authentication module
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/               # Data Transfer Objects
│       │   ├── entities/          # TypeORM entities
│       │   ├── guards/            # Module-specific guards
│       │   ├── strategies/        # Passport strategies
│       │   └── services/          # Sub-services
│       │
│       ├── users/                 # User management module
│       ├── boxes/                 # Box/Deck module
│       ├── cards/                 # Card module
│       └── [other-features]/      # Other domain modules
│
├── uploads/                       # User uploaded files (local storage)
├── public/                        # Static files
├── test/                          # E2E tests
├── dist/                          # Compiled output (generated)
│
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
├── nest-cli.json                  # NestJS CLI configuration
├── eslint.config.mjs              # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── Dockerfile                     # Docker image definition
├── docker-compose.yml             # Docker Compose configuration
└── .gitignore                     # Git ignore rules
```

### Key Principles

1. **Feature-Based Modules**: Each feature is a self-contained module
2. **Separation of Concerns**: Clear separation between controllers, services, entities, and DTOs
3. **Reusable Common Utilities**: Shared code in `common/` directory
4. **Domain-Driven Design**: Modules organized by business domain

---

## ⚙️ Configuration Files

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "forceConsistentCasingInFileNames": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false
  }
}
```

**Key Settings:**
- `emitDecoratorMetadata`: Required for NestJS dependency injection
- `experimentalDecorators`: Enables decorator syntax
- `target: ES2023`: Modern JavaScript target

### NestJS CLI Configuration (`nest-cli.json`)

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

### Prettier Configuration (`.prettierrc`)

```json
{
  "singleQuote": true,
  "trailingComma": "all"
}
```

### ESLint Configuration (`eslint.config.mjs`)

Uses TypeScript ESLint with Prettier integration:
- TypeScript strict type checking
- Prettier formatting rules
- Allows `any` type (configurable per project needs)
- Warns on floating promises and unsafe arguments

### Package.json Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "cross-env NODE_ENV=production node dist/main",
    "start:dev": "cross-env NODE_ENV=development nest start --watch",
    "start:debug": "cross-env NODE_ENV=development nest start --debug --watch",
    "start:prod": "cross-env NODE_ENV=production node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

---

## 🏗 Module Architecture

### Module Structure Pattern

Each feature module follows this structure:

```
module-name/
├── module-name.module.ts      # Module definition
├── module-name.controller.ts  # REST API endpoints
├── module-name.service.ts     # Business logic
├── dto/                       # Data Transfer Objects
│   ├── create-module.dto.ts
│   └── update-module.dto.ts
├── entities/                  # TypeORM entities
│   └── module.entity.ts
├── guards/                    # Module-specific guards (optional)
└── services/                  # Sub-services (optional)
```

### Example Module Definition

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // Register entities
    // Import other modules if needed
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // Export if used by other modules
})
export class UsersModule {}
```

### Root Module (`app.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    
    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => databaseConfig(configService),
    }),
    
    // Feature modules
    AuthModule,
    UsersModule,
    BoxesModule,
    // ... other modules
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ActivityLoggingInterceptor, // Global interceptor
    },
  ],
})
export class AppModule {}
```

**Key Points:**
- `ConfigModule` is global (`isGlobal: true`)
- Database uses async factory pattern for configuration
- Global interceptors registered via `APP_INTERCEPTOR`
- All feature modules imported here

---

## 📊 Entity Patterns

### Entity Definition Pattern

Entities use TypeORM decorators and follow these conventions:

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity('table_name') // Table name in database
export class EntityName {
  // Primary Key - Use UUID for user-facing IDs
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'The unique identifier' })
  id: string;

  // Or use auto-increment integer for internal IDs
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'The unique identifier' })
  id: number;

  // Regular columns
  @Column()
  @ApiProperty({ description: 'Column description' })
  name: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Optional field', required: false })
  description?: string;

  @Column({ default: false })
  @ApiProperty({ description: 'Boolean field with default' })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  @ApiProperty({ description: 'Integer field' })
  count: number;

  // Enums
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  @ApiProperty({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // Relationships
  @ManyToOne(() => User, user => user.boxes)
  @JoinColumn({ name: 'user_id' })
  @Exclude() // Exclude from serialization
  user: User;

  @OneToMany(() => Card, card => card.box)
  @ApiProperty({ type: () => [Card] })
  cards: Card[];

  // Timestamps
  @CreateDateColumn()
  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'Update timestamp' })
  updatedAt: Date;
}
```

### Entity Best Practices

1. **Use `@ApiProperty`** for Swagger documentation
2. **Use `@Exclude()`** from `class-transformer` for sensitive fields (passwords, relationships)
3. **Explicit column names** via `@JoinColumn({ name: 'user_id' })` for snake_case database
4. **Default values** for boolean and numeric fields
5. **Nullable fields** explicitly marked with `nullable: true`
6. **Relationships** clearly defined with inverse sides

---

## 📝 DTO Patterns

### DTO Definition Pattern

DTOs use class-validator for validation and Swagger for documentation:

```typescript
import { IsEmail, IsString, MinLength, IsOptional, IsUUID, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    example: 'password123',
    required: true,
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'Optional field',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'UUID of related entity',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Mobile number (format validation)',
    example: '09123456789'
  })
  @IsString()
  @Matches(/^09\d{9}$/, {
    message: 'Mobile number must match format 09xxxxxxxxx'
  })
  mobile: string;
}
```

### DTO Best Practices

1. **Every field has `@ApiProperty`** with description and example
2. **Validation decorators** from `class-validator`
3. **Clear error messages** in validation decorators
4. **Separate DTOs** for create/update operations
5. **Required vs Optional** explicitly marked

### Common Validation Decorators

```typescript
@IsString()           // Must be a string
@IsEmail()            // Must be a valid email
@IsNumber()           // Must be a number
@IsBoolean()          // Must be a boolean
@IsUUID()             // Must be a valid UUID
@IsOptional()         // Field is optional
@IsNotEmpty()         // Field cannot be empty
@MinLength(6)         // Minimum string length
@MaxLength(255)       // Maximum string length
@Matches(/regex/)     // Must match regex pattern
@IsEnum(MyEnum)       // Must be enum value
@IsArray()            // Must be an array
@Min(0)               // Minimum number value
@Max(100)             // Maximum number value
```

---

## 🔧 Service Patterns

### Service Definition Pattern

Services contain business logic and use dependency injection:

```typescript
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    // Inject other services if needed
    // private otherService: OtherService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Validation
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Business logic
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateDto: Partial<User>): Promise<User> {
    const user = await this.findOne(id); // Reuse findOne for validation
    
    if (updateDto.password) {
      updateDto.password = await bcrypt.hash(updateDto.password, 10);
    }
    
    Object.assign(user, updateDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  // Custom query methods
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }
}
```

### Service Best Practices

1. **Use `@Injectable()` decorator**
2. **Inject repositories** via `@InjectRepository()`
3. **Throw appropriate exceptions** (`NotFoundException`, `ConflictException`, etc.)
4. **Reuse methods** (e.g., `findOne` in `update` and `remove`)
5. **Return typed promises** (`Promise<User>`, `Promise<User[]>`)
6. **Handle business logic** here, not in controllers
7. **Use transactions** for complex operations

### Common NestJS Exceptions

```typescript
throw new NotFoundException('Resource not found');
throw new ConflictException('Resource already exists');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Not authenticated');
throw new ForbiddenException('Access denied');
throw new InternalServerErrorException('Server error');
```

---

## 🎮 Controller Patterns

### Controller Definition Pattern

Controllers handle HTTP requests and responses:

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards at controller level
@UseInterceptors(ClassSerializerInterceptor) // Exclude @Exclude() fields
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN) // Role-based access
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ 
    status: 201, 
    description: 'User successfully created',
    type: User 
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all users',
    type: [User]
  })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User found',
    type: User 
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  update(
    @Param('id') id: string, 
    @Body() updateDto: Partial<User>
  ): Promise<User> {
    return this.usersService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User successfully deleted' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
```

### Controller Best Practices

1. **Use `@ApiTags`** for Swagger grouping
2. **Document all endpoints** with `@ApiOperation` and `@ApiResponse`
3. **Apply guards** at controller or method level
4. **Use `ClassSerializerInterceptor`** to exclude sensitive fields
5. **Parse parameters** with pipes (`ParseIntPipe`, `ParseUUIDPipe`)
6. **Access authenticated user** via `@Request() req` → `req.user`
7. **Return typed promises** from service methods
8. **Keep controllers thin** - delegate to services

### HTTP Method Conventions

- `GET` - Retrieve resources
- `POST` - Create new resources
- `PATCH` - Partial update (preferred over PUT)
- `PUT` - Full replacement
- `DELETE` - Remove resources

### Parameter Decorators

```typescript
@Param('id') id: string                    // Route parameter
@Param('id', ParseIntPipe) id: number      // Parse as integer
@Param('id', ParseUUIDPipe) id: string     // Parse as UUID
@Body() dto: CreateUserDto                 // Request body
@Query('page') page: string                // Query parameter
@Request() req                             // Full request object
@Headers('authorization') auth: string     // Header value
```

---

## 🔐 Authentication & Authorization

### JWT Strategy

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return this.usersService.findOne(payload.sub);
  }
}
```

### JWT Auth Guard

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### Roles Guard

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role?.includes(role));
  }
}
```

### Roles Decorator

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

### Usage in Controllers

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards
export class AdminController {
  @Get('users')
  @Roles(UserRole.ADMIN) // Require admin role
  findAll() {
    // Only accessible by admins
  }
}
```

### Auth Module Structure

```typescript
@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    TypeOrmModule.forFeature([Otp]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '180d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, OtpService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## 💾 Database Configuration

### Database Config Function

```typescript
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // Try DATABASE_URL first (Railway/Heroku style)
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  if (databaseUrl) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'],
      synchronize: false, // Never true in production
      logging: true,
      ssl: false,
    };
  }

  // Fallback to individual variables
  return {
    type: 'postgres',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USERNAME'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: false,
    logging: true,
    ssl: false,
  };
};
```

### Environment Variables

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database
# OR
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=leitner_db

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=180d

# Application Configuration
NODE_ENV=development
PORT=3000
```

### Database Best Practices

1. **Never use `synchronize: true` in production**
2. **Use migrations** for schema changes
3. **Enable logging** in development
4. **Use connection pooling** for production
5. **Handle connection errors** gracefully

---

## 🛠 Common Utilities

### Custom Decorators

```typescript
// log-activity.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const LOG_ACTIVITY_KEY = 'logActivity';

export interface LogActivityMetadata {
  action: ActivityType;
  entityType?: string;
  description?: string;
  severity?: 'INFO' | 'WARNING' | 'ERROR';
}

export const LogActivity = (
  action: ActivityType,
  entityType?: string,
  description?: string,
  severity: 'INFO' | 'WARNING' | 'ERROR' = 'INFO',
) => {
  return SetMetadata(LOG_ACTIVITY_KEY, {
    action,
    entityType,
    description,
    severity,
  });
};
```

### Usage

```typescript
@Post()
@LogActivity(ActivityType.CREATE_BOX, 'Box', 'User created a new box')
create(@Body() dto: CreateBoxDto) {
  // ...
}
```

---

## 🎯 Interceptors & Guards

### Interceptor Pattern

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class ActivityLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap((response) => {
        // Log activity after request completes
        this.logActivity(context, response);
      }),
    );
  }

  private logActivity(context: ExecutionContext, response: any) {
    // Implementation
  }
}
```

### Registering Global Interceptors

```typescript
// In app.module.ts
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: ActivityLoggingInterceptor,
  },
]
```

### Custom Guards

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    // Your logic here
    return true; // or false
  }
}
```

---

## ⚠️ Error Handling

### Exception Handling Pattern

NestJS uses HTTP exceptions that map to status codes:

```typescript
// In services
throw new NotFoundException('User not found');
throw new ConflictException('Email already exists');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Not authenticated');
throw new ForbiddenException('Access denied');
```

### Global Exception Filter (Optional)

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}
```

---

## 📖 API Documentation

### Swagger Setup (`main.ts`)

```typescript
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('API Title')
  .setDescription('API description')
  .setVersion('1.0')
  .addBearerAuth() // Enable JWT in Swagger
  .build();
  
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);

// JSON endpoint for Postman import
app.use('/api-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(document);
});
```

### Access Points

- **Swagger UI**: `http://localhost:3000/api`
- **OpenAPI JSON**: `http://localhost:3000/api-json`

### Documenting Endpoints

```typescript
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of users',
    type: [User]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll() {
    // ...
  }
}
```

---

## 🧪 Testing

### Test Structure

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const users = [{ id: '1', email: 'test@example.com' }];
      mockRepository.find.mockResolvedValue(users);

      expect(await service.findAll()).toEqual(users);
    });
  });
});
```

---

## 🐳 Docker & Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "run", "start:prod"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: leitner_db
      POSTGRES_USER: leitner_user
      POSTGRES_PASSWORD: leitner_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  backend:
    build: .
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USERNAME: leitner_user
      DB_PASSWORD: leitner_password
      DB_NAME: leitner_db
      JWT_SECRET: your-secret-key
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
    driver: bridge
```

---

## 🎨 Code Style & Linting

### Prettier Rules

- **Single quotes** for strings
- **Trailing commas** for cleaner diffs
- **2 spaces** for indentation (default)

### ESLint Rules

- TypeScript strict type checking enabled
- Prettier integration
- Custom rules can be configured in `eslint.config.mjs`

### Format Code

```bash
npm run format  # Format all files
npm run lint    # Lint and auto-fix
```

---

## ✅ Best Practices Summary

### 1. **Project Structure**
- ✅ Feature-based modules
- ✅ Clear separation of concerns
- ✅ Shared utilities in `common/`

### 2. **Entities**
- ✅ Use TypeORM decorators
- ✅ Document with `@ApiProperty`
- ✅ Exclude sensitive fields with `@Exclude()`
- ✅ Explicit relationships

### 3. **DTOs**
- ✅ Validate with class-validator
- ✅ Document with Swagger
- ✅ Separate create/update DTOs

### 4. **Services**
- ✅ Business logic in services
- ✅ Use dependency injection
- ✅ Throw appropriate exceptions
- ✅ Return typed promises

### 5. **Controllers**
- ✅ Keep controllers thin
- ✅ Document all endpoints
- ✅ Use guards for authentication
- ✅ Parse parameters with pipes

### 6. **Database**
- ✅ Never use `synchronize: true` in production
- ✅ Use migrations
- ✅ Connection pooling in production

### 7. **Security**
- ✅ Hash passwords with bcrypt
- ✅ Use JWT for authentication
- ✅ Validate all inputs
- ✅ Use environment variables for secrets

### 8. **Error Handling**
- ✅ Use appropriate HTTP exceptions
- ✅ Provide meaningful error messages
- ✅ Log errors appropriately

### 9. **Documentation**
- ✅ Document all endpoints with Swagger
- ✅ Use `@ApiOperation` and `@ApiResponse`
- ✅ Include examples in DTOs

### 10. **Testing**
- ✅ Write unit tests for services
- ✅ Write E2E tests for endpoints
- ✅ Mock dependencies in tests

---

## 🚀 Getting Started Checklist

When creating a new project based on this architecture:

- [ ] Initialize NestJS project: `nest new project-name`
- [ ] Install core dependencies (see Technology Stack)
- [ ] Configure TypeScript (`tsconfig.json`)
- [ ] Set up ESLint and Prettier
- [ ] Create project structure (modules, common, config)
- [ ] Configure database connection
- [ ] Set up authentication module
- [ ] Create root module with all imports
- [ ] Configure Swagger
- [ ] Set up environment variables
- [ ] Create Docker configuration
- [ ] Write initial tests
- [ ] Document API endpoints

---

## 📚 Additional Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Class Validator](https://github.com/typestack/class-validator)
- [Swagger/OpenAPI](https://swagger.io/)

---

**Last Updated**: Based on Leitner Box Backend architecture  
**Version**: 1.0.0

