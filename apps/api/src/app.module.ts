import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoutesModule } from './routes/routes.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { WeatherModule } from './weather/weather.module';
import { RecommendModule } from './recommend/recommend.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoutesModule,
    WardrobeModule,
    WeatherModule,
    RecommendModule,
    FeedbackModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
