/**
 * Gallery Manager for VoidDrift Extension v20
 * Manages alternative character header images using SillyTavern's Gallery extension
 */

const GalleryManager = {
    // Cache for available images per character
    imageCache: new Map(),
    
    // Current selection cache
    currentSelections: new Map(),

    /**
     * Initialize gallery manager
     */
    async init() {
        this.loadSelections();
    },

    /**
     * Get SillyTavern context safely
     */
    getContext() {
        return window.SillyTavern?.getContext?.() || null;
    },

    /**
     * Get extensionSettings with proper initialization
     */
    getExtensionSettings() {
        const context = this.getContext();
        if (!context) return null;
        
        const { extensionSettings } = context;
        if (!extensionSettings.VoidDrift) {
            extensionSettings.VoidDrift = {};
        }
        if (!extensionSettings.VoidDrift.characterImages) {
            extensionSettings.VoidDrift.characterImages = {};
        }
        
        return extensionSettings.VoidDrift;
    },

    /**
     * Handle API errors consistently
     */
    handleApiError(error, operation) {
        console.error(`VoidDrift Gallery: Error during ${operation}:`, error);
        return [];
    },

    /**
     * Get request headers for API calls
     */
    getRequestHeaders() {
        const context = this.getContext();
        if (context && typeof context.getRequestHeaders === 'function') {
            return context.getRequestHeaders();
        }
        
        // Fallback headers
        return {
            'Content-Type': 'application/json',
        };
    },

    /**
     * Make API request with error handling
     */
    async makeApiRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                headers: this.getRequestHeaders(),
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            this.handleApiError(error, `API request to ${url}`);
            return null;
        }
    },

    /**
     * Get available images for a specific character
     * @param {string} characterName - Name of the character
     * @returns {Promise<Array>} Array of image objects
     */
    async getCharacterImages(characterName) {
        if (!characterName) return [];

        // Check cache first
        if (this.imageCache.has(characterName)) {
            return this.imageCache.get(characterName);
        }

        const files = await this.makeApiRequest('/api/images/list', {
            method: 'POST',
            body: JSON.stringify({
                folder: characterName,
                sortField: 'date',
                sortOrder: 'desc',
            }),
        });

        if (!files) return [];

        const images = files.map(file => ({
            filename: file,
            url: `user/images/${encodeURIComponent(characterName)}/${encodeURIComponent(file)}`,
            name: file.replace(/\.[^/.]+$/, '') // Remove extension for display
        }));

        // Cache the results
        this.imageCache.set(characterName, images);
        return images;
    },

    /**
     * Get all available character folders
     * @returns {Promise<Array>} Array of character folder names
     */
    async getCharacterFolders() {
        const folders = await this.makeApiRequest('/api/images/folders', {
            method: 'POST',
        });

        if (!folders) return [];
        
        return folders.filter(folder => folder && folder.trim() !== '');
    },

    /**
     * Get current character name from SillyTavern
     * @returns {string|null} Current character name
     */
    getCurrentCharacterName() {
        const context = this.getContext();
        if (!context) return null;

        if (context.groupId) {
            // In group chat, we might need to handle differently
            return null;
        }

        if (context.characterId !== undefined && context.characters[context.characterId]) {
            return context.characters[context.characterId].name;
        }

        return null;
    },

    /**
     * Character selection and image management
     */
    
    /**
     * Set alternative image for a character
     * @param {string} characterName - Name of the character
     * @param {string} imageUrl - URL of the alternative image
     */
    setCharacterAlternativeImage(characterName, imageUrl) {
        if (!characterName) return;

        this.currentSelections.set(characterName, imageUrl);
        this.saveSelections();
        this.triggerImageUpdate();
    },

    /**
     * Reset character to default avatar
     * @param {string} characterName - Name of the character
     */
    resetCharacterToDefault(characterName) {
        if (!characterName) return;

        this.currentSelections.delete(characterName);
        this.saveSelections();
        this.triggerImageUpdate();
    },

    /**
     * Reset all characters to default avatars
     */
    resetAllCharacters() {
        this.currentSelections.clear();
        this.saveSelections();
        this.triggerImageUpdate();
    },

    /**
     * Get alternative image for a character
     * @param {string} characterName - Name of the character
     * @returns {string|null} Alternative image URL or null for default
     */
    getCharacterAlternativeImage(characterName) {
        if (!characterName) return null;
        return this.currentSelections.get(characterName) || null;
    },

    /**
     * Trigger image update across all messages
     */
    triggerImageUpdate() {
        if (window.VoidDrift?.processAllMessages) {
            // Small delay to ensure any previous operations are complete
            setTimeout(() => {
                window.VoidDrift.processAllMessages();
            }, 50);
        }
    },

    /**
     * Settings persistence
     */
    
    /**
     * Save current selections to extensionSettings
     */
    saveSelections() {
        try {
            const settings = this.getExtensionSettings();
            if (!settings) return;
            
            const context = this.getContext();
            settings.characterImages = Object.fromEntries(this.currentSelections);
            context.saveSettingsDebounced();
        } catch (error) {
            this.handleApiError(error, 'saving character image selections');
        }
    },

    /**
     * Load selections from extensionSettings with migration support
     */
    loadSelections() {
        try {
            const settings = this.getExtensionSettings();
            if (!settings) return;
            
            // Load from extensionSettings
            if (settings.characterImages) {
                this.currentSelections = new Map(Object.entries(settings.characterImages));
            } else {
                // Migration: check for old localStorage data
                this.migrateFromLocalStorage();
            }
        } catch (error) {
            this.handleApiError(error, 'loading character image selections');
            this.currentSelections = new Map();
        }
    },

    /**
     * Migrate old localStorage data to extensionSettings
     */
    migrateFromLocalStorage() {
        try {
            const oldSaved = localStorage.getItem('voiddrift_character_images');
            if (oldSaved) {
                const selectionsObj = JSON.parse(oldSaved);
                this.currentSelections = new Map(Object.entries(selectionsObj));
                
                // Migrate to new storage and remove old
                this.saveSelections();
                localStorage.removeItem('voiddrift_character_images');
                console.log('VoidDrift: Migrated character images from localStorage to extensionSettings');
            } else {
                this.currentSelections = new Map();
            }
        } catch (error) {
            this.handleApiError(error, 'migrating from localStorage');
            this.currentSelections = new Map();
        }
    },

    /**
     * Utility methods
     */
     
    /**
     * Clear cache for a specific character or all characters
     * @param {string} [characterName] - Character to clear cache for, or undefined for all
     */
    clearCache(characterName) {
        if (characterName) {
            this.imageCache.delete(characterName);
        } else {
            this.imageCache.clear();
        }
    }
};

// Export for use in other files
window.VoidDriftGalleryManager = GalleryManager;
