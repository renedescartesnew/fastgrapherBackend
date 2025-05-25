
import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { createDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EyeDetectionService {
  private readonly logger = new Logger(EyeDetectionService.name);
  private model: any = null;

  async initializeModel() {
    if (!this.model) {
      this.logger.log('Loading face landmarks detection model...');
      this.model = await createDetector(SupportedModels.MediaPipeFaceMesh, {
        runtime: 'tfjs',
        refineLandmarks: true
      });
      this.logger.log('Face landmarks detection model loaded successfully');
    }
    return this.model;
  }

  async detectClosedEyes(imagePath: string): Promise<boolean> {
    try {
      const model = await this.initializeModel();
      
      // Read and decode the image
      const imageBuffer = fs.readFileSync(imagePath);
      const imgTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
      
      // Get face predictions
      const predictions = await model.estimateFaces(imgTensor);
      
      let hasClosedEyes = false;
      
      if (predictions.length > 0) {
        // Check each face for closed eyes
        for (const prediction of predictions) {
          if (this.checkEyeState(prediction.keypoints)) {
            hasClosedEyes = true;
            break;
          }
        }
      }
      
      // Clean up tensor
      imgTensor.dispose();
      
      this.logger.log(`Eye detection result for ${path.basename(imagePath)}: ${hasClosedEyes ? 'closed' : 'open'}`);
      return hasClosedEyes;
      
    } catch (error) {
      this.logger.error(`Error detecting eyes in ${imagePath}:`, error);
      return false; // Default to open eyes if detection fails
    }
  }

  private checkEyeState(keypoints: any[]): boolean {
    try {
      // Eye landmark indices for MediaPipe Face Mesh
      const leftEyeIndices = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
      const rightEyeIndices = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      // Calculate eye aspect ratio for both eyes
      const leftEAR = this.calculateEyeAspectRatio(keypoints, leftEyeIndices);
      const rightEAR = this.calculateEyeAspectRatio(keypoints, rightEyeIndices);
      
      // Threshold for closed eyes (typically around 0.2-0.25)
      const EAR_THRESHOLD = 0.23;
      
      // Consider eyes closed if both eyes have low EAR
      const bothEyesClosed = leftEAR < EAR_THRESHOLD && rightEAR < EAR_THRESHOLD;
      
      this.logger.log(`Eye aspect ratios - Left: ${leftEAR.toFixed(3)}, Right: ${rightEAR.toFixed(3)}, Closed: ${bothEyesClosed}`);
      
      return bothEyesClosed;
      
    } catch (error) {
      this.logger.error('Error checking eye state:', error);
      return false;
    }
  }

  private calculateEyeAspectRatio(keypoints: any[], eyeIndices: number[]): number {
    try {
      if (!keypoints || keypoints.length === 0 || eyeIndices.length < 6) {
        return 1.0; // Default to open eye
      }

      // Get key points for eye aspect ratio calculation
      const p1 = keypoints[eyeIndices[1]]; // Top
      const p2 = keypoints[eyeIndices[5]]; // Bottom
      const p3 = keypoints[eyeIndices[0]]; // Left corner
      const p4 = keypoints[eyeIndices[3]]; // Right corner

      if (!p1 || !p2 || !p3 || !p4) {
        return 1.0;
      }

      // Calculate distances
      const verticalDist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
      const horizontalDist = Math.sqrt(Math.pow(p3.x - p4.x, 2) + Math.pow(p3.y - p4.y, 2));
      
      // Eye aspect ratio
      const ear = horizontalDist > 0 ? verticalDist / horizontalDist : 0;
      
      return ear;
      
    } catch (error) {
      this.logger.error('Error calculating eye aspect ratio:', error);
      return 1.0;
    }
  }

  async moveToClosedEyesFolder(originalPath: string, filename: string): Promise<string> {
    try {
      const closedEyesDir = path.join(process.cwd(), 'uploads', 'closed-eyes');
      
      // Create closed-eyes directory if it doesn't exist
      if (!fs.existsSync(closedEyesDir)) {
        fs.mkdirSync(closedEyesDir, { recursive: true });
      }
      
      const newPath = path.join(closedEyesDir, filename);
      
      // Move file to closed-eyes folder
      fs.renameSync(originalPath, newPath);
      
      this.logger.log(`Moved ${filename} to closed-eyes folder`);
      return `closed-eyes/${filename}`;
      
    } catch (error) {
      this.logger.error(`Error moving file ${filename} to closed-eyes folder:`, error);
      return filename; // Return original path if move fails
    }
  }
}
