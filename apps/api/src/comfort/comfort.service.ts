import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateComfortDto } from './dto/update-comfort.dto';

@Injectable()
export class ComfortService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const settings = await this.prisma.comfortSettings.findUnique({
      where: { userId },
    });
    if (!settings) throw new NotFoundException('Comfort settings not found');
    return settings;
  }

  async update(userId: string, dto: UpdateComfortDto) {
    return this.prisma.comfortSettings.update({
      where: { userId },
      data: {
        glovesBelowC: dto.glovesBelowC,
        extraJacketLayerBelowC: dto.extraJacketLayerBelowC,
        extraPantsLayerBelowC: dto.extraPantsLayerBelowC,
        woolBaseBelowC: dto.woolBaseBelowC,
        rainProbThreshold: dto.rainProbThreshold,
        windChillSensitivity: dto.windChillSensitivity,
      },
    });
  }

  async applyBiasDelta(userId: string, deltaC: number) {
    const current = await this.get(userId);
    const next = Math.max(-8, Math.min(8, current.personalColdBiasC + deltaC));
    return this.prisma.comfortSettings.update({
      where: { userId },
      data: { personalColdBiasC: next },
    });
  }
}
