import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { SessionSerializer } from './auth/serializers';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import { getQueueToken } from '@nestjs/bullmq';
import { FLIGHT_CANCELLATION_QUEUE } from './flights/flight-cancellation.queue';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configure CORS with credentials support
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:5173';
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      // Allow the configured frontend URL
      if (origin === frontendUrl || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Configure express-session middleware
  app.use(
    session({
      secret: configService.get('SESSION_SECRET') || configService.get('JWT_SECRET') || 'your-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false, // Don't save empty sessions
      name: 'connect.sid', // Session cookie name
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: configService.get('NODE_ENV') === 'production', // Use secure cookies in production (HTTPS)
        sameSite: 'lax', // CSRF protection - allows cookies on cross-site requests
      },
    }),
  );

  // Initialize Passport and session support
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport serialization using UsersService
  // This must be done after passport.initialize() but before routes
  const usersService = app.get(UsersService);
  
  passport.serializeUser((user: any, done: any) => {
    // Store only user ID in session
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await usersService.findById(id);
      if (!user) {
        return done(new Error('User not found'), null);
      }
      // Return user without password
      const { password: _, ...userWithoutPassword } = user.toJSON();
      done(null, userWithoutPassword);
    } catch (err) {
      done(err, null);
    }
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Airway Management System API')
    .setDescription('API documentation for Airway Management System')
    .setVersion('1.0')
    .addCookieAuth('connect.sid', {
      type: 'apiKey',
      in: 'cookie',
      name: 'connect.sid',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Setup Bull Board Dashboard for queue monitoring
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/queues');

    // Get the flight cancellation queue instance
    const flightCancellationQueue = app.get<Queue>(
      getQueueToken(FLIGHT_CANCELLATION_QUEUE),
    );

    // Create Bull Board with all queues
    createBullBoard({
      queues: [new BullMQAdapter(flightCancellationQueue)],
      serverAdapter,
    });

    // Mount Bull Board on the Express app
    app.use('/queues', serverAdapter.getRouter());

    console.log(`Bull Board dashboard: http://localhost:${process.env.PORT || 3000}/queues`);
  } catch (error) {
    console.warn('Failed to setup Bull Board dashboard:', error.message);
    // Don't fail the application if dashboard setup fails
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();

