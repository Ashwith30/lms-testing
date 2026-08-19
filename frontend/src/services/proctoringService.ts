import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { ViolationLog, ViolationType, ProctoringSummary } from '../types';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export const loadCocoModel = async (): Promise<cocoSsd.ObjectDetection> => {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        await tf.ready();
        // Prefer WebGL for fast GPU inference in browser
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
        }
      } catch (e) {
        console.warn('TensorFlow backend initialization note:', e);
      }

      try {
        return await cocoSsd.load({ base: 'lite_mobilenet_v2' });
      } catch (err) {
        console.warn('lite_mobilenet_v2 load error, loading mobilenet_v2 fallback:', err);
        return await cocoSsd.load({ base: 'mobilenet_v2' });
      }
    })();
  }
  return modelPromise;
};

export interface DetectionResult {
  personCount: number; // -1 if video not ready, 0 if no person, 1+ for count
  phoneDetected: boolean;
  phoneScore?: number;
  predictions: cocoSsd.DetectedObject[];
  isReady: boolean;
}

export const detectObjectsInFrame = async (
  video: HTMLVideoElement,
  model: cocoSsd.ObjectDetection
): Promise<DetectionResult> => {
  if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return { personCount: -1, phoneDetected: false, predictions: [], isReady: false };
  }

  try {
    const predictions = await model.detect(video);
    
    // Filter for persons with confidence threshold
    const persons = predictions.filter(
      p => p.class === 'person' && p.score >= 0.40
    );

    // Filter for cell phone with strong confidence threshold
    const phones = predictions.filter(
      p => (p.class === 'cell phone' || p.class === 'remote') && p.score >= 0.50
    );

    return {
      personCount: persons.length,
      phoneDetected: phones.length > 0,
      phoneScore: phones.length > 0 ? phones[0].score : undefined,
      predictions,
      isReady: true
    };
  } catch (err) {
    console.warn('Object detection frame error:', err);
    return { personCount: -1, phoneDetected: false, predictions: [], isReady: false };
  }
};

/**
 * Capture an optimized low-res snapshot thumbnail (320x240 JPEG) for violation proof
 */
export const captureVideoSnapshot = (video: HTMLVideoElement): string | undefined => {
  try {
    if (!video || video.readyState < 2 || video.videoWidth === 0) return undefined;

    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark with timestamp
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.fillText(new Date().toLocaleTimeString(), 8, canvas.height - 8);

    return canvas.toDataURL('image/jpeg', 0.6);
  } catch (e) {
    console.warn('Snapshot capture failed:', e);
    return undefined;
  }
};

/**
 * Calculate proctoring summary metrics & trust score
 */
export const calculateProctoringSummary = (logs: ViolationLog[]): ProctoringSummary => {
  let tabSwitches = 0;
  let windowBlurs = 0;
  let appSwitchGestures = 0;
  let fullscreenExits = 0;
  let faceMissingIncidents = 0;
  let multipleFacesIncidents = 0;
  let phoneDetectedIncidents = 0;
  let devtoolsIncidents = 0;
  let shortcutsBlocked = 0;

  for (const log of logs) {
    switch (log.type) {
      case 'TAB_SWITCH':
        tabSwitches++;
        break;
      case 'WINDOW_BLUR':
        windowBlurs++;
        break;
      case 'APP_SWITCH_GESTURE':
        appSwitchGestures++;
        break;
      case 'FULLSCREEN_EXIT':
        fullscreenExits++;
        break;
      case 'FACE_MISSING':
        faceMissingIncidents++;
        break;
      case 'MULTIPLE_FACES':
        multipleFacesIncidents++;
        break;
      case 'PHONE_DETECTED':
        phoneDetectedIncidents++;
        break;
      case 'DEVTOOLS_OPEN':
        devtoolsIncidents++;
        break;
      case 'SHORTCUT_BLOCKED':
      case 'CONTEXT_MENU_BLOCKED':
        shortcutsBlocked++;
        break;
    }
  }

  const totalViolations = logs.length;

  let penalty = 0;
  penalty += phoneDetectedIncidents * 25;
  penalty += devtoolsIncidents * 25;
  penalty += tabSwitches * 15;
  penalty += fullscreenExits * 15;
  penalty += appSwitchGestures * 10;
  penalty += windowBlurs * 5;
  penalty += multipleFacesIncidents * 10;
  penalty += faceMissingIncidents * 10;
  penalty += shortcutsBlocked * 3;

  const trustScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    tabSwitches,
    windowBlurs,
    appSwitchGestures,
    fullscreenExits,
    faceMissingIncidents,
    multipleFacesIncidents,
    phoneDetectedIncidents,
    devtoolsIncidents,
    shortcutsBlocked,
    totalViolations,
    trustScore
  };
};
