// Haptic Feedback Utilities

export const haptics = {
    light: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    },
    
    medium: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(30);
        }
    },
    
    heavy: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    },
    
    success: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate([30, 50, 30]);
        }
    },
    
    error: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate([50, 100, 50]);
        }
    },
    
    warning: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate([40, 60, 40]);
        }
    },
    
    selection: () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(5);
        }
    }
};

export default haptics;