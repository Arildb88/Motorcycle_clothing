import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { ComfortModule } from '../comfort/comfort.module';

@Module({
  imports: [ComfortModule],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}
