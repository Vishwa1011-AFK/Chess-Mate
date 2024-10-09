// utils/SoundManager.js
import soundSelfMove from '../assets/sounds/self-move.mp3';
import soundCapture from '../assets/sounds/capture.mp3';
import soundCastling from '../assets/sounds/castling.mp3';
import soundMoveCheck from '../assets/sounds/move-check.mp3';
import soundPromotion from '../assets/sounds/promotion.mp3';

class SoundManager {
  constructor() {
    this.sounds = {};
  }

  preloadSounds(sounds) {
    sounds.forEach((sound) => {
      this.sounds[sound.name] = new Audio(sound.file);
    });
  }

  playSound(name) {
    if (this.sounds[name]) {
      this.sounds[name].currentTime = 0;
      this.sounds[name].play().catch(error => {
        console.error(`Failed to play sound: ${error}`);
      });
    } else {
      console.warn(`Sound ${name} not found.`);
    }
  }
}

const soundManager = new SoundManager();

// Preload sounds
const sounds = [
  { name: "selfMove", file: soundSelfMove },
  { name: "capture", file: soundCapture },
  { name: "castling", file: soundCastling },
  { name: "moveCheck", file: soundMoveCheck },
  { name: "promotion", file: soundPromotion },
];

soundManager.preloadSounds(sounds);

export default soundManager;

export const playMoveSound = (move) => {
  if (move.captured) {
    soundManager.playSound("capture");
  } else if (move.flags.includes('k') || move.flags.includes('q')) {
    soundManager.playSound("castling");
  } else if (move.flags.includes('p')) {
    soundManager.playSound("promotion");
  } else if (move.san.includes('+')) {
    soundManager.playSound("moveCheck");
  } else {
    soundManager.playSound("selfMove");
  }
};