// This file contains utility functions for managing local storage.

const storage = {
    getItem: (key) => {
        return localStorage.getItem(key);
    },
    setItem: (key, value) => {
        localStorage.setItem(key, value);
    },
    removeItem: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => {
        localStorage.clear();
    }
};

export default storage;