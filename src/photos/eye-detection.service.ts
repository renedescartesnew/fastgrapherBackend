import { Injectable, Logger } from '@nestjs/common';
import { CenteredDetectionService } from './centered-detection.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EyeDetectionService {
  private readonly logger = new Logger(EyeDetectionService.name);

  constructor(private centeredDetectionService: CenteredDetectionService) {}

  async detectClosedEyes(imagePath: string): Promise<boolean> {
    // Mock implementation for now
    this.logger.log(`Mock detecting closed eyes in: ${imagePath}`);
    return Math.random() < 0.1;
  }

  async detectNotLookingAtCamera(imagePath: string): Promise<boolean> {
    // Mock implementation for now
    this.logger.log(`Mock detecting not looking at camera in: ${imagePath}`);
    return Math.random() < 0.15;
  }

  async detectGroupPhoto(imagePath: string): Promise<boolean> {
    // Mock implementation for now
    this.logger.log(`Mock detecting group photo in: ${imagePath}`);
    return Math.random() < 0.2;
  }

  async detectBlur(imagePath: string): Promise<{ isBlurry: boolean; blurScore: number }> {
    this.logger.log(`Mock detecting blur in: ${imagePath}`);
    const blurScore = Math.random() * 100;
    return {
      isBlurry: blurScore > 70,
      blurScore: Math.round(blurScore)
    };
  }

  async detectCenteredObject(imagePath: string): Promise<{ isCentered: boolean; confidence: number }> {
    return this.centeredDetectionService.detectCenteredObject(imagePath);
  }
}
