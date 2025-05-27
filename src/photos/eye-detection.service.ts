import { Injectable, Logger } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import * as faceDetection from '@tensorflow-models/face-landmarks-detection';
import { load as loadCocoSsd, ObjectDetection } from '@tensorflow-models/coco-ssd';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EyeDetectionService {
  private readonly logger = new Logger(EyeDetectionService.name);
  private detector: faceDetection.FaceLandmarksDetector | null = null;
  private objectDetector: ObjectDetection | null = null;

  async onModuleInit() {
    try {
      await tf.ready();
      this.logger.log('TensorFlow.js loaded successfully');
      
      // Load the MediaPipe face landmarks detection model with optimized configuration
      this.detector = await faceDetection.createDetector(
        faceDetection.SupportedModels.MediaPipeFaceMesh,
        {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 10
        }
      );
      this.logger.log('MediaPipe face landmarks detection model loaded successfully');

      // Load COCO-SSD model for object detection (including people)
      try {
        this.objectDetector = await loadCocoSsd();
        this.logger.log('COCO-SSD object detection model loaded successfully');
      } catch (cocoError) {
        this.logger.error('Failed to load COCO-SSD model:', cocoError);
        this.logger.warn('Group photo detection will be disabled');
      }
    } catch (error) {
      this.logger.error('Failed to initialize detection models:', error);
    }
  }

  async detectClosedEyes(imagePath: string): Promise<boolean> {
    if (!this.detector) {
      this.logger.warn('Face detector not initialized');
      return false;
    }

    try {
      // Read and decode the image
      const imageBuffer = fs.readFileSync(imagePath);
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
      
      // Detect faces and landmarks
      const faces = await this.detector.estimateFaces(imageTensor);
      
      imageTensor.dispose();
      
      if (faces.length === 0) {
        this.logger.log('No faces detected in image');
        return false;
      }

      // Check each face for closed eyes
      for (const face of faces) {
        if (face.keypoints) {
          const isPersonClosedEyes = this.areEyesClosed(face.keypoints);
          if (isPersonClosedEyes) {
            this.logger.log('Found at least one person with both eyes closed');
            return true;
          }
        }
      }
      
      this.logger.log('No person found with both eyes closed');
      return false;
      
    } catch (error) {
      this.logger.error('Error during eye detection:', error);
      return false;
    }
  }

  private areEyesClosed(keypoints: any[]): boolean {
    try {
      // MediaPipe face landmarks indices for eyes
      const leftEyeTop = keypoints[159]; // Top of left eye
      const leftEyeBottom = keypoints[145]; // Bottom of left eye
      const rightEyeTop = keypoints[386]; // Top of right eye  
      const rightEyeBottom = keypoints[374]; // Bottom of right eye
      
      if (!leftEyeTop || !leftEyeBottom || !rightEyeTop || !rightEyeBottom) {
        return false;
      }
      
      // Calculate eye aspect ratios
      const leftEyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y);
      const rightEyeHeight = Math.abs(rightEyeTop.y - rightEyeBottom.y);
      
      // Get eye widths for normalization
      const leftEyeLeft = keypoints[33];
      const leftEyeRight = keypoints[133];
      const rightEyeLeft = keypoints[362];
      const rightEyeRight = keypoints[263];
      
      if (!leftEyeLeft || !leftEyeRight || !rightEyeLeft || !rightEyeRight) {
        return false;
      }
      
      const leftEyeWidth = Math.abs(leftEyeRight.x - leftEyeLeft.x);
      const rightEyeWidth = Math.abs(rightEyeRight.x - rightEyeLeft.x);
      
      // Calculate aspect ratios
      const leftEAR = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0;
      const rightEAR = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0;
      
      // Threshold for closed eyes (typically around 0.15-0.2)
      const EAR_THRESHOLD = 0.18;
      
      // Both eyes must be closed
      const bothEyesClosed = leftEAR < EAR_THRESHOLD && rightEAR < EAR_THRESHOLD;
      
      this.logger.log(`Eye aspect ratios - Left: ${leftEAR.toFixed(3)}, Right: ${rightEAR.toFixed(3)}, Both closed: ${bothEyesClosed}`);
      
      return bothEyesClosed;
      
    } catch (error) {
      this.logger.error('Error calculating eye aspect ratio:', error);
      return false;
    }
  }

  async detectNotLookingAtCamera(imagePath: string): Promise<boolean> {
    if (!this.detector) {
      this.logger.warn('Face detector not initialized');
      return false;
    }

    try {
      // Read and decode the image
      const imageBuffer = fs.readFileSync(imagePath);
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
      
      // Detect faces and landmarks
      const faces = await this.detector.estimateFaces(imageTensor);
      
      imageTensor.dispose();
      
      if (faces.length === 0) {
        this.logger.log('No faces detected in image');
        return false;
      }

      // Check each face for gaze direction with improved detection
      for (const face of faces) {
        if (face.keypoints) {
          const isNotLooking = this.analyzeGazeDirectionImproved(face.keypoints);
          if (isNotLooking) {
            this.logger.log('Found at least one person not looking at camera');
            return true;
          }
        }
      }
      
      this.logger.log('All persons appear to be looking at camera');
      return false;
      
    } catch (error) {
      this.logger.error('Error during gaze detection:', error);
      return false;
    }
  }

  private analyzeGazeDirectionImproved(keypoints: any[]): boolean {
    try {
      // Comprehensive gaze analysis with multiple detection methods
      let gazeIndicators = 0;
      const detectionResults: string[] = [];
      
      // Method 1: Head pose analysis - most reliable for side profiles
      const headPose = this.analyzeHeadPoseRobust(keypoints);
      if (headPose.isProfileView || headPose.significantTurn) {
        gazeIndicators += 3; // High weight for head pose
        detectionResults.push(`head pose: yaw=${headPose.yawAngle.toFixed(1)}°, profile=${headPose.isProfileView}`);
      }
      
      // Method 2: Iris/pupil position relative to eye shape
      const irisAnalysis = this.analyzeIrisGaze(keypoints);
      if (irisAnalysis.significantDeviation) {
        gazeIndicators += 2;
        detectionResults.push(`iris deviation: ${irisAnalysis.maxDeviation.toFixed(3)}`);
      }
      
      // Method 3: Facial asymmetry for profile detection
      const asymmetry = this.detectFacialAsymmetry(keypoints);
      if (asymmetry.isAsymmetric) {
        gazeIndicators += 2;
        detectionResults.push(`facial asymmetry: ${asymmetry.score.toFixed(3)}`);
      }
      
      // Method 4: Nose bridge alignment
      const noseAnalysis = this.analyzeNoseDirection(keypoints);
      if (noseAnalysis.pointingAway) {
        gazeIndicators += 1;
        detectionResults.push(`nose direction: ${noseAnalysis.deviation.toFixed(3)}`);
      }
      
      // Method 5: Eye corner visibility analysis
      const eyeVisibility = this.analyzeEyeVisibility(keypoints);
      if (eyeVisibility.unevenVisibility) {
        gazeIndicators += 1;
        detectionResults.push(`eye visibility: ${eyeVisibility.description}`);
      }
      
      // Lower threshold for better sensitivity
      const isNotLooking = gazeIndicators >= 3;
      
      this.logger.log(`Improved gaze analysis - Indicators: ${gazeIndicators}, Not looking: ${isNotLooking}, Details: [${detectionResults.join(', ')}]`);
      
      return isNotLooking;
      
    } catch (error) {
      this.logger.error('Error in improved gaze analysis:', error);
      return false;
    }
  }

  private analyzeHeadPoseRobust(keypoints: any[]): { yawAngle: number; isProfileView: boolean; significantTurn: boolean } {
    try {
      // Key facial landmarks for head pose
      const noseTip = keypoints[1];
      const leftEar = keypoints[234];
      const rightEar = keypoints[454];
      const leftCheek = keypoints[116];
      const rightCheek = keypoints[345];
      const chinTip = keypoints[175];
      const foreheadCenter = keypoints[9];
      
      if (!noseTip || !leftEar || !rightEar || !chinTip || !foreheadCenter) {
        return { yawAngle: 0, isProfileView: false, significantTurn: false };
      }
      
      // Calculate face center and dimensions
      const faceWidth = Math.abs(rightEar.x - leftEar.x);
      const faceCenterX = (leftEar.x + rightEar.x) / 2;
      
      // Primary yaw calculation using nose position relative to ears
      const noseOffsetX = noseTip.x - faceCenterX;
      const yawAngle = faceWidth > 0 ? Math.abs(noseOffsetX / faceWidth * 60) : 0;
      
      // Secondary validation using cheeks if available
      let cheekYawAngle = 0;
      if (leftCheek && rightCheek) {
        const cheekCenterX = (leftCheek.x + rightCheek.x) / 2;
        const cheekWidth = Math.abs(rightCheek.x - leftCheek.x);
        const noseOffsetFromCheeks = noseTip.x - cheekCenterX;
        cheekYawAngle = cheekWidth > 0 ? Math.abs(noseOffsetFromCheeks / cheekWidth * 45) : 0;
      }
      
      // Use the higher of the two measurements for better detection
      const finalYawAngle = Math.max(yawAngle, cheekYawAngle);
      
      // Profile detection - more aggressive thresholds
      const isProfileView = finalYawAngle > 25; // Reduced from 35
      const significantTurn = finalYawAngle > 15; // Reduced from 20
      
      return { yawAngle: finalYawAngle, isProfileView, significantTurn };
      
    } catch (error) {
      return { yawAngle: 0, isProfileView: false, significantTurn: false };
    }
  }

  private analyzeIrisGaze(keypoints: any[]): { significantDeviation: boolean; maxDeviation: number } {
    try {
      // Calculate precise iris/pupil centers
      const leftIrisCenter = this.calculateEyeCenter(keypoints, 'left');
      const rightIrisCenter = this.calculateEyeCenter(keypoints, 'right');
      
      if (!leftIrisCenter || !rightIrisCenter) {
        return { significantDeviation: false, maxDeviation: 0 };
      }
      
      // Get eye bounding boxes
      const leftEyeBox = this.getEyeBoundingBox(keypoints, 'left');
      const rightEyeBox = this.getEyeBoundingBox(keypoints, 'right');
      
      if (!leftEyeBox || !rightEyeBox) {
        return { significantDeviation: false, maxDeviation: 0 };
      }
      
      // Calculate normalized iris positions (0.5 = center)
      const leftNormX = (leftIrisCenter.x - leftEyeBox.minX) / (leftEyeBox.maxX - leftEyeBox.minX);
      const rightNormX = (rightIrisCenter.x - rightEyeBox.minX) / (rightEyeBox.maxX - rightEyeBox.minX);
      
      // Calculate deviations from center (0.5)
      const leftDeviation = Math.abs(leftNormX - 0.5);
      const rightDeviation = Math.abs(rightNormX - 0.5);
      const maxDeviation = Math.max(leftDeviation, rightDeviation);
      
      // More sensitive threshold for iris deviation
      const significantDeviation = maxDeviation > 0.15; // Reduced from 0.2
      
      return { significantDeviation, maxDeviation };
      
    } catch (error) {
      return { significantDeviation: false, maxDeviation: 0 };
    }
  }

  private detectFacialAsymmetry(keypoints: any[]): { isAsymmetric: boolean; score: number } {
    try {
      // Compare left and right side landmark distances
      const leftSideLandmarks = [33, 7, 163, 144, 145, 153, 154, 155, 133];
      const rightSideLandmarks = [362, 382, 381, 380, 374, 373, 390, 249, 263];
      
      const noseTip = keypoints[1];
      if (!noseTip) {
        return { isAsymmetric: false, score: 0 };
      }
      
      // Calculate average distances from nose to left and right landmarks
      let leftAvgDistance = 0, rightAvgDistance = 0;
      let leftCount = 0, rightCount = 0;
      
      for (const idx of leftSideLandmarks) {
        if (keypoints[idx]) {
          leftAvgDistance += Math.sqrt(
            Math.pow(keypoints[idx].x - noseTip.x, 2) + 
            Math.pow(keypoints[idx].y - noseTip.y, 2)
          );
          leftCount++;
        }
      }
      
      for (const idx of rightSideLandmarks) {
        if (keypoints[idx]) {
          rightAvgDistance += Math.sqrt(
            Math.pow(keypoints[idx].x - noseTip.x, 2) + 
            Math.pow(keypoints[idx].y - noseTip.y, 2)
          );
          rightCount++;
        }
      }
      
      if (leftCount === 0 || rightCount === 0) {
        return { isAsymmetric: false, score: 0 };
      }
      
      leftAvgDistance /= leftCount;
      rightAvgDistance /= rightCount;
      
      // Calculate asymmetry score
      const asymmetryScore = Math.abs(leftAvgDistance - rightAvgDistance) / 
                            Math.max(leftAvgDistance, rightAvgDistance);
      
      // More sensitive asymmetry detection
      const isAsymmetric = asymmetryScore > 0.12; // Reduced from 0.2
      
      return { isAsymmetric, score: asymmetryScore };
      
    } catch (error) {
      return { isAsymmetric: false, score: 0 };
    }
  }

  private analyzeNoseDirection(keypoints: any[]): { pointingAway: boolean; deviation: number } {
    try {
      const noseTip = keypoints[1];
      const noseBase = keypoints[5];
      const leftNostril = keypoints[2];
      const rightNostril = keypoints[4];
      
      if (!noseTip || !noseBase || !leftNostril || !rightNostril) {
        return { pointingAway: false, deviation: 0 };
      }
      
      // Calculate nose center line
      const nostrilCenterX = (leftNostril.x + rightNostril.x) / 2;
      const nostrilWidth = Math.abs(rightNostril.x - leftNostril.x);
      
      // Calculate deviation of nose tip from center
      const noseDeviation = nostrilWidth > 0 ? Math.abs(noseTip.x - nostrilCenterX) / nostrilWidth : 0;
      
      // More sensitive nose direction detection
      const pointingAway = noseDeviation > 0.1; // Reduced from 0.15
      
      return { pointingAway, deviation: noseDeviation };
      
    } catch (error) {
      return { pointingAway: false, deviation: 0 };
    }
  }

  private analyzeEyeVisibility(keypoints: any[]): { unevenVisibility: boolean; description: string } {
    try {
      // Analyze if one eye is more visible than the other (profile indicator)
      const leftEyeLandmarks = [33, 7, 163, 144, 145, 153, 154, 155, 133];
      const rightEyeLandmarks = [362, 382, 381, 380, 374, 373, 390, 249, 263];
      
      let leftVisible = 0, rightVisible = 0;
      
      for (const idx of leftEyeLandmarks) {
        if (keypoints[idx]) leftVisible++;
      }
      
      for (const idx of rightEyeLandmarks) {
        if (keypoints[idx]) rightVisible++;
      }
      
      const totalLeft = leftEyeLandmarks.length;
      const totalRight = rightEyeLandmarks.length;
      
      const leftVisibilityRatio = leftVisible / totalLeft;
      const rightVisibilityRatio = rightVisible / totalRight;
      
      const visibilityDifference = Math.abs(leftVisibilityRatio - rightVisibilityRatio);
      
      // More sensitive visibility analysis
      const unevenVisibility = visibilityDifference > 0.15; // Reduced from 0.25
      
      const description = `left: ${(leftVisibilityRatio * 100).toFixed(1)}%, right: ${(rightVisibilityRatio * 100).toFixed(1)}%`;
      
      return { unevenVisibility, description };
      
    } catch (error) {
      return { unevenVisibility: false, description: 'analysis failed' };
    }
  }

  private calculateEyeCenter(keypoints: any[], eye: 'left' | 'right'): { x: number; y: number } | null {
    try {
      // More precise eye center calculation using weighted landmarks
      const landmarks = eye === 'left' 
        ? [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        : [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      // Weight center points more heavily
      const centerIndices = eye === 'left' ? [159, 145, 133, 157] : [386, 374, 362, 387];
      
      let sumX = 0, sumY = 0, totalWeight = 0;
      
      for (const idx of landmarks) {
        if (keypoints[idx]) {
          const weight = centerIndices.includes(idx) ? 3 : 1; // Higher weight for center points
          sumX += keypoints[idx].x * weight;
          sumY += keypoints[idx].y * weight;
          totalWeight += weight;
        }
      }
      
      if (totalWeight === 0) return null;
      
      return { x: sumX / totalWeight, y: sumY / totalWeight };
    } catch (error) {
      return null;
    }
  }

  private getEyeBoundingBox(keypoints: any[], eye: 'left' | 'right'): { minX: number; maxX: number; minY: number; maxY: number } | null {
    try {
      const landmarks = eye === 'left' 
        ? [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
        : [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
      
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      
      for (const idx of landmarks) {
        if (keypoints[idx]) {
          minX = Math.min(minX, keypoints[idx].x);
          maxX = Math.max(maxX, keypoints[idx].x);
          minY = Math.min(minY, keypoints[idx].y);
          maxY = Math.max(maxY, keypoints[idx].y);
        }
      }
      
      if (minX === Infinity) return null;
      
      return { minX, maxX, minY, maxY };
    } catch (error) {
      return null;
    }
  }

  private calculateLandmarkVisibility(keypoints: any[], landmarks: number[]): number {
    try {
      let visibleCount = 0;
      for (const idx of landmarks) {
        if (keypoints[idx]) {
          visibleCount++;
        }
      }
      return visibleCount / landmarks.length;
    } catch (error) {
      return 0;
    }
  }

  async detectGroupPhoto(imagePath: string): Promise<boolean> {
    if (!this.objectDetector) {
      this.logger.warn('Object detector not initialized - group photo detection disabled');
      return false;
    }

    try {
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        this.logger.warn(`Image file not found: ${imagePath}`);
        return false;
      }

      // Read and decode the image
      const imageBuffer = fs.readFileSync(imagePath);
      const imageTensor = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
      
      // Detect objects in the image
      const predictions = await this.objectDetector.detect(imageTensor);
      
      imageTensor.dispose();
      
      // Count people detected with a confidence threshold
      const peopleCount = predictions.filter(prediction => 
        prediction.class === 'person' && prediction.score > 0.5
      ).length;
      
      this.logger.log(`Detected ${peopleCount} people in image ${path.basename(imagePath)}`);
      
      // Return true if 4 or more people detected
      const isGroupPhoto = peopleCount >= 4;
      
      if (isGroupPhoto) {
        this.logger.log(`Image classified as group photo: ${peopleCount} people detected`);
      }
      
      return isGroupPhoto;
      
    } catch (error) {
      this.logger.error('Error during group photo detection:', error);
      return false;
    }
  }

  async moveToClosedEyesFolder(imagePath: string, originalPath: string): Promise<string> {
    const closedEyesDir = path.join(process.cwd(), 'uploads', 'closed-eyes');
    
    // Create closed-eyes directory if it doesn't exist
    if (!fs.existsSync(closedEyesDir)) {
      fs.mkdirSync(closedEyesDir, { recursive: true });
    }
    
    const filename = path.basename(originalPath);
    const newPath = path.join('closed-eyes', filename);
    const fullNewPath = path.join(process.cwd(), 'uploads', newPath);
    
    // Move file to closed-eyes folder
    fs.renameSync(imagePath, fullNewPath);
    
    return newPath;
  }

  async copyToNotLookingFolder(imagePath: string, originalPath: string): Promise<string> {
    const notLookingDir = path.join(process.cwd(), 'uploads', 'not-looking-at-camera');
    
    // Create not-looking-at-camera directory if it doesn't exist
    if (!fs.existsSync(notLookingDir)) {
      fs.mkdirSync(notLookingDir, { recursive: true });
    }
    
    const filename = path.basename(originalPath);
    const newPath = path.join('not-looking-at-camera', filename);
    const fullNewPath = path.join(process.cwd(), 'uploads', newPath);
    
    // Copy file to not-looking-at-camera folder (keep original)
    fs.copyFileSync(imagePath, fullNewPath);
    
    return newPath;
  }

  async copyToGroupsFolder(imagePath: string, originalPath: string): Promise<string> {
    const groupsDir = path.join(process.cwd(), 'uploads', 'groups');
    
    // Create groups directory if it doesn't exist
    if (!fs.existsSync(groupsDir)) {
      fs.mkdirSync(groupsDir, { recursive: true });
      this.logger.log('Created groups directory');
    }
    
    const filename = path.basename(originalPath);
    const newPath = path.join('groups', filename);
    const fullNewPath = path.join(process.cwd(), 'uploads', newPath);
    
    try {
      // Copy file to groups folder (keep original)
      fs.copyFileSync(imagePath, fullNewPath);
      this.logger.log(`Successfully copied to groups folder: ${newPath}`);
      
      return newPath;
    } catch (error) {
      this.logger.error(`Failed to copy file to groups folder:`, error);
      throw error;
    }
  }
}
