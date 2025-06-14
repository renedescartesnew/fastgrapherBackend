
import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CenteredDetectionService {
  private readonly logger = new Logger(CenteredDetectionService.name);
  private model: cocoSsd.ObjectDetection | null = null;

  async loadModel(): Promise<void> {
    if (!this.model) {
      try {
        this.logger.log('Loading COCO-SSD model...');
        this.model = await cocoSsd.load();
        this.logger.log('COCO-SSD model loaded successfully');
      } catch (error) {
        this.logger.error('Failed to load COCO-SSD model:', error);
        throw error;
      }
    }
  }

  async detectCenteredObject(imagePath: string): Promise<{ isCentered: boolean; confidence: number }> {
    try {
      await this.loadModel();

      if (!fs.existsSync(imagePath)) {
        this.logger.error(`Image file not found: ${imagePath}`);
        return { isCentered: true, confidence: 0 };
      }

      this.logger.log(`Analyzing centered object for: ${imagePath}`);

      // Read and decode image
      const imageBuffer = fs.readFileSync(imagePath);
      let decodedImage = tf.node.decodeImage(imageBuffer, 3);
      
      // Ensure we have a 3D tensor (squeeze out batch dimension if it exists)
      let imageTensor: tf.Tensor3D;
      if (decodedImage.shape.length === 4) {
        imageTensor = decodedImage.squeeze([0]) as tf.Tensor3D;
      } else {
        imageTensor = decodedImage as tf.Tensor3D;
      }

      // Detect objects
      const predictions = await this.model.detect(imageTensor);

      if (predictions.length === 0) {
        this.logger.log('No objects detected, considering as centered');
        imageTensor.dispose();
        return { isCentered: true, confidence: 0.5 };
      }

      // Find the most prominent object (largest by area)
      const mainObject = predictions.reduce((max, obj) => {
        const maxArea = max.bbox[2] * max.bbox[3];
        const objArea = obj.bbox[2] * obj.bbox[3];
        return objArea > maxArea ? obj : max;
      });

      // Calculate image and object centers
      const imageWidth = imageTensor.shape[1] as number;
      const imageHeight = imageTensor.shape[0] as number;
      const imageCenter = { x: imageWidth / 2, y: imageHeight / 2 };

      const objectCenter = {
        x: mainObject.bbox[0] + mainObject.bbox[2] / 2,
        y: mainObject.bbox[1] + mainObject.bbox[3] / 2
      };

      // Calculate distance from center (normalized)
      const distanceX = Math.abs(objectCenter.x - imageCenter.x) / imageWidth;
      const distanceY = Math.abs(objectCenter.y - imageCenter.y) / imageHeight;
      const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      // Consider object centered if it's within 25% of the center
      const centerThreshold = 0.25;
      const isCentered = totalDistance < centerThreshold;

      this.logger.log(`Centered detection result: ${isCentered ? 'centered' : 'not centered'} (distance: ${totalDistance.toFixed(3)}, threshold: ${centerThreshold})`);

      imageTensor.dispose();
      return { isCentered, confidence: mainObject.score };

    } catch (error) {
      this.logger.error(`Error detecting centered object for ${imagePath}:`, error);
      return { isCentered: true, confidence: 0 };
    }
  }
}
