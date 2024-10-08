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
  export default soundManager;
  