
import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';

@Injectable()
export class EyeDetectionService {
  private readonly logger = new Logger(EyeDetectionService.name);

  constructor() {
    this.logger.log('EyeDetectionService initialized with Sharp for blur detection');
  }

  async detectClosedEyes(imagePath: string): Promise<boolean> {
    this.logger.log(`Mock eye detection for: ${imagePath}`);
    // Mock implementation - returns random result for demo purposes
    // In production, you would integrate with a cloud-based AI service
    return Math.random() > 0.7;
  }

  async detectNotLookingAtCamera(imagePath: string): Promise<boolean> {
    this.logger.log(`Mock gaze detection for: ${imagePath}`);
    // Mock implementation - returns random result for demo purposes
    return Math.random() > 0.8;
  }

  async detectGroupPhoto(imagePath: string): Promise<boolean> {
    this.logger.log(`Mock group photo detection for: ${imagePath}`);
    // Mock implementation - returns random result for demo purposes
    return Math.random() > 0.6;
  }

  async detectBlur(imagePath: string): Promise<{ isBlurry: boolean; blurScore: number }> {
    try {
      this.logger.log(`Analyzing blur for: ${imagePath}`);
      
      if (!fs.existsSync(imagePath)) {
        this.logger.error(`Image file not found: ${imagePath}`);
        return { isBlurry: false, blurScore: 0 };
      }

      // Use Sharp to analyze image blur using Laplacian variance
      const image = sharp(imagePath);
      const { width, height } = await image.metadata();
      
      // Convert to grayscale and apply Laplacian filter for edge detection
      const buffer = await image
        .grayscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [0, -1, 0, -1, 4, -1, 0, -1, 0], // Laplacian kernel
        })
        .raw()
        .toBuffer();

      // Calculate variance of the convolved image
      let sum = 0;
      let sumSquares = 0;
      const pixels = buffer.length;

      for (let i = 0; i < pixels; i++) {
        const value = buffer[i];
        sum += value;
        sumSquares += value * value;
      }

      const mean = sum / pixels;
      const variance = (sumSquares / pixels) - (mean * mean);
      
      // Normalize the blur score (0-100, higher = less blurry)
      const blurScore = Math.min(100, Math.max(0, variance / 100));
      
      // Consider image blurry if score is below threshold
      const isBlurry = blurScore < 20; // Threshold can be adjusted
      
      this.logger.log(`Blur analysis complete: ${imagePath} - Score: ${blurScore.toFixed(2)}, Blurry: ${isBlurry}`);
      
      return { isBlurry, blurScore: Math.round(blurScore) };
      
    } catch (error) {
      this.logger.error(`Error detecting blur for ${imagePath}:`, error.message);
      return { isBlurry: false, blurScore: 0 };
    }
  }
}
