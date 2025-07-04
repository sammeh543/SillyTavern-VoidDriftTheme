// /VoidDriftTheme/index.js
/*
================================================================================
 Light Weight Styler v20
================================================================================
    AUTHORS: AI Archaea & AI Assistant(Gemini Pro 2.5, Claude Sonnet 4.0)
  LAST UPDATED: June 30, 2025

  FEATURES:
  - Styler allows pulling of UID and Avatars to use with CSS snippets
  - Whisper Light Check box allows for UI theme via style.css
    when deselected allows us to keep the UID and Avatar grabbing
    but makes it so other Whisper Light specific stuff won't interfere with
    our UI when the theme is off.
  - Alternative character images via Gallery extension integration
  - Cross-device settings sync using SillyTavern's extensionSettings
================================================================================
*/

jQuery(function () {
    const context = SillyTavern.getContext();
    const { extensionSettings, saveSettingsDebounced } = context;

    //================================================================================
    // CONSTANTS & CONFIGURATION
    //================================================================================

    const CONSTANTS = {
        MODULE_NAME: 'VoidDrift',
        PATHS: {
            SETTINGS_HTML: 'scripts/extensions/third-party/SillyTavern-VoidDriftTheme/settings.html',
            STYLESHEET: 'scripts/extensions/third-party/SillyTavern-VoidDriftTheme/style.css',
            GALLERY_MANAGER: 'scripts/extensions/third-party/SillyTavern-VoidDriftTheme/gallery-manager.js',
        },
        DOM: {
            STYLESHEET_ID: 'voiddrift-style',
            WHISPER_LIGHT_TOGGLE: 'voiddrift_whisper_light',
            THEME_SETTINGS_CONTAINER: 'voiddrift_theme_settings',
            LARGE_MODE_RADIO: 'voiddrift_large_avatar_mode',
            SMALL_MODE_RADIO: 'voiddrift_small_avatar_mode',
            AVATAR_WIDTH_INPUT: 'voiddrift_avatar_width',
            EDIT_OFFSET_INPUT: 'voiddrift_edit_offset',
            EDIT_RIGHT_OFFSET_INPUT: 'voiddrift_edit_right_offset',
            REASONING_TOP_COMPENSATION_INPUT: 'voiddrift_reasoning_top_compensation',
            REASONING_RIGHT_COMPENSATION_INPUT: 'voiddrift_reasoning_right_compensation',
            AVATAR_RESET_BUTTON: 'voiddrift_reset_button',
            PERSONA_BANNER_POS_INPUT: 'voiddrift_persona_banner_pos',
            CHARACTER_BANNER_POS_INPUT: 'voiddrift_character_banner_pos',
            BANNER_POS_RESET_BUTTON: 'voiddrift_bannerpos_reset_button',
            RESET_ALL_BUTTON: 'voiddrift_reset_all_button',
            CHARACTER_INDICATOR: 'voiddrift_character_indicator',
            CHARACTER_NAME_DISPLAY: 'voiddrift_character_name',
            EXTENSIONS_SETTINGS: '#extensions_settings',
            CHAT_CONTAINER: '#chat',
            CHAT_MESSAGE: '.mes',
            AVATAR_MODE_RADIO_CHECKED: 'input[name="avatar_mode"]:checked',
            // Gallery Manager Elements
            CHARACTER_SELECT: 'voiddrift_character_select',
            IMAGE_SELECT: 'voiddrift_image_select',
            IMAGE_SELECTION_CONTAINER: 'voiddrift_image_selection',
            REFRESH_CHARACTERS_BUTTON: 'voiddrift_refresh_characters',
            PREVIEW_IMAGE_BUTTON: 'voiddrift_preview_image',
            APPLY_IMAGE_BUTTON: 'voiddrift_apply_image',
            RESET_CHARACTER_BUTTON: 'voiddrift_reset_character',
            IMAGE_PREVIEW_CONTAINER: 'voiddrift_image_preview',
            PREVIEW_IMG: 'voiddrift_preview_img',
        },
        CSS_VARS: {
            AVATAR_WIDTH: '--avatar-width',
            EDIT_OFFSET: '--edit-buttons-top-offset',
            EDIT_RIGHT_OFFSET: '--edit-buttons-right-offset',
            REASONING_TOP_COMPENSATION: '--reasoning-edit-top-compensation',
            REASONING_RIGHT_COMPENSATION: '--reasoning-edit-right-compensation',
            PERSONA_BANNER: '--persona-banner-pos',
            CHARACTER_BANNER: '--character-banner-pos',
            MESSAGE_AVATAR_URL: '--mes-avatar-url',
            CHARACTER_OVERRIDE: '--voiddrift-character-override',
        },
    };

    const DEFAULT_SETTINGS = {
        whisperLight: true,
        avatarMode: 'large',
        avatar_width_large: 304,
        edit_offset_large: 375,
        edit_right_offset_large: 25,
        reasoning_top_compensation_large: -90,
        reasoning_right_compensation_large: -40,
        avatar_width_small: 75,
        edit_offset_small: 70,
        edit_right_offset_small: 25,
        reasoning_top_compensation_small: -30,
        reasoning_right_compensation_small: -40,
        personaBannerPos: 15,
        characterBannerPos: 27,
        // Per-character settings storage
        characterPositions: {},
    };

    //================================================================================
    // CHARACTER POSITION MANAGEMENT
    //================================================================================

    const CharacterPositionManager = {
        currentCharacter: null,
        isLoadingCharacterSettings: false,

        /**
         * Get current active character name
         */
        getCurrentCharacterName() {
            const context = SillyTavern.getContext();
            if (!context) return null;

            // Check if in group chat
            if (context.groupId) return null; // We'll use global settings for group chats

            // Method 1: Try context.characterId and context.characters
            if (context.characterId !== undefined && context.characters && context.characters[context.characterId]) {
                const charName = context.characters[context.characterId].name;
                return charName;
            }

            // Method 2: Try to get from selected character directly
            if (context.characters && context.characters.length > 0) {
                const activeChar = context.characters.find(char => char.selected || char.active);
                if (activeChar) return activeChar.name;
            }

            // Method 3: Try to get from chat metadata or current chat
            if (context.chat && context.chat.length > 0) {
                for (let i = context.chat.length - 1; i >= 0; i--) {
                    const message = context.chat[i];
                    if (!message.is_user && message.name) return message.name;
                }
            }

            // Method 4: Try global character reference
            if (window.this_chid !== undefined && context.characters && context.characters[window.this_chid]) {
                const charName = context.characters[window.this_chid].name;
                return charName;
            }

            return null;
        },

        /**
         * Save current position settings for the active character
         */
        saveCurrentCharacterPositions() {
            const characterName = this.getCurrentCharacterName();
            if (!characterName) return; // Use global settings for group chats or when no character

            const settings = Utils.getSettings();
            if (!settings.characterPositions) {
                settings.characterPositions = {};
            }

            // Save current banner positions for this character
            settings.characterPositions[characterName] = {
                personaBannerPos: settings.personaBannerPos,
                characterBannerPos: settings.characterBannerPos,
            };

            saveSettingsDebounced();
        },

        /**
         * Load position settings for a character
         */
        loadCharacterPositions(characterName) {
            if (!characterName) return false;

            const settings = Utils.getSettings();
            const characterSettings = settings.characterPositions?.[characterName];
            
            if (!characterSettings) return false; // No saved settings for this character

            // Update global settings with character-specific values
            settings.personaBannerPos = characterSettings.personaBannerPos;
            settings.characterBannerPos = characterSettings.characterBannerPos;

            return true;
        },

        /**
         * Delayed execution helper for UI updates
         */
        delayedUIUpdate(callback, delay = 50) {
            setTimeout(callback, delay);
        },

        /**
         * Handle character change
         */
        handleCharacterChange() {
            const newCharacter = this.getCurrentCharacterName();
            
            // Only proceed if there's an actual character change
            if (newCharacter === this.currentCharacter) {
                return;
            }

            // Store current values before switching (for potential future use)
            if (this.currentCharacter) {
                const settings = Utils.getSettings();
                const previousSettings = {
                    character: this.currentCharacter,
                    personaBannerPos: settings.personaBannerPos,
                    characterBannerPos: settings.characterBannerPos
                };
            }

            // Load settings for new character
            if (newCharacter) {
                const loaded = this.loadCharacterPositions(newCharacter);
                if (loaded) {
                    // Update UI to reflect loaded settings
                    this.delayedUIUpdate(() => {
                        this.updateBannerPositionInputs();
                        ThemeManager.updateStyles();
                    });
                } else {
                    // No saved settings for this character, use defaults
                    const settings = Utils.getSettings();
                    settings.personaBannerPos = DEFAULT_SETTINGS.personaBannerPos;
                    settings.characterBannerPos = DEFAULT_SETTINGS.characterBannerPos;
                    this.delayedUIUpdate(() => {
                        this.updateBannerPositionInputs();
                        ThemeManager.updateStyles();
                    });
                }
            }

            this.currentCharacter = newCharacter;
            this.updateCharacterIndicator();
        },

        /**
         * Update character indicator in the UI
         */
        updateCharacterIndicator() {
            const indicatorElement = document.getElementById(CONSTANTS.DOM.CHARACTER_INDICATOR);
            const nameElement = document.getElementById(CONSTANTS.DOM.CHARACTER_NAME_DISPLAY);
            
            if (!indicatorElement || !nameElement) return;

            if (this.currentCharacter) {
                nameElement.textContent = this.currentCharacter;
                indicatorElement.style.display = 'block';
            } else {
                indicatorElement.style.display = 'none';
            }
        },

        /**
         * Update banner position inputs in the UI
         */
        updateBannerPositionInputs() {
            const elementIds = {
                personaBannerPos: CONSTANTS.DOM.PERSONA_BANNER_POS_INPUT,
                characterBannerPos: CONSTANTS.DOM.CHARACTER_BANNER_POS_INPUT,
            };

            const elements = Utils.getElements(elementIds);
            if (Object.keys(elements).length !== Object.keys(elementIds).length) return;

            // Set flag to prevent saving during loading
            this.isLoadingCharacterSettings = true;

            const settings = Utils.getSettings();
            elements.personaBannerPos.value = settings.personaBannerPos ?? DEFAULT_SETTINGS.personaBannerPos;
            elements.characterBannerPos.value = settings.characterBannerPos ?? DEFAULT_SETTINGS.characterBannerPos;

            // Clear flag after a short delay to allow DOM updates to complete
            setTimeout(() => {
                this.isLoadingCharacterSettings = false;
            }, 100);
        },

        /**
         * Reset character-specific position settings
         */
        resetCharacterPositions(characterName) {
            if (!characterName) return;

            const settings = Utils.getSettings();
            if (settings.characterPositions && settings.characterPositions[characterName]) {
                delete settings.characterPositions[characterName];
                saveSettingsDebounced();
            }
        },

        /**
         * Reset all character-specific position settings
         */
        resetAllCharacterPositions() {
            const settings = Utils.getSettings();
            settings.characterPositions = {};
            saveSettingsDebounced();
        }
    };

    //================================================================================
    // UTILITY FUNCTIONS
    //================================================================================

    const Utils = {
        /**
         * Get settings with defaults applied
         */
        getSettings() {
            if (!extensionSettings[CONSTANTS.MODULE_NAME]) {
                extensionSettings[CONSTANTS.MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
            }
            const settings = extensionSettings[CONSTANTS.MODULE_NAME];
            for (const key in DEFAULT_SETTINGS) {
                if (settings[key] === undefined) {
                    settings[key] = DEFAULT_SETTINGS[key];
                }
            }
            return settings;
        },

        /**
         * Get DOM elements by ID with error handling
         */
        getElements(elementIds) {
            const elements = {};
            const missing = [];
            
            for (const [key, id] of Object.entries(elementIds)) {
                const element = document.getElementById(id);
                if (element) {
                    elements[key] = element;
                } else {
                    missing.push(id);
                }
            }
            
            if (missing.length > 0) {
                console.warn(`VoidDrift: Missing DOM elements: ${missing.join(', ')}`);
            }
            
            return elements;
        },

       
        showNotification(message, type = 'success') {
            if (window.toastr) {
                // Define timeout durations for different message types (in milliseconds)
                const timeouts = {
                    info: 2500,     // Quick status messages - brief display
                    success: 2500,  // Success confirmations - moderate display  
                    warning: 4000,  // Warnings - longer for attention
                    error: 5000     // Errors - longest for user to read
                };
                
                // Get appropriate timeout, fallback to success timeout
                const timeout = timeouts[type] || timeouts.success;
                
                // Show notification with custom timeout
                toastr[type](message, '', {
                    timeOut: timeout,
                    extendedTimeOut: timeout + 2000
                });
            }
        },

        /**
         * Create input event listener with settings persistence
         */
        createInputListener(keyProvider) {
            return (event) => {
                const settings = this.getSettings();
                const key = typeof keyProvider === 'function' ? keyProvider() : keyProvider;
                settings[key] = event.target.value;
                saveSettingsDebounced();
                ThemeManager.updateStyles();
                
                // If this is a banner position change, save it for the current character
                // But only if we're not currently loading character settings
                if ((key === 'personaBannerPos' || key === 'characterBannerPos') && 
                    !CharacterPositionManager.isLoadingCharacterSettings) {
                    CharacterPositionManager.saveCurrentCharacterPositions();
                }
            };
        },

        /**
         * Escape CSS URL values
         */
        escapeCssUrl(url) {
            return url.replace(/['"()\s]/g, "\\$&");
        }
    };

    //================================================================================
    // MESSAGE & AVATAR PROCESSING
    //================================================================================

    const MessageProcessor = {
        /**
         * Extract message author UID for CSS targeting
         */
        getMessageAuthorUid(message) {
            const avatarImg = message.querySelector(".avatar img");
            if (!avatarImg) return null;

            const isUser = message.getAttribute("is_user") === "true";
            const nameElement = message.querySelector(".name_text");
            const charName = nameElement ? nameElement.textContent.trim() : null;

            const avatarSrc = avatarImg.getAttribute("src");
            if (!avatarSrc || !charName) return null;

            const charType = isUser ? "persona" : "character";
            const avatarFileName = avatarSrc.split("/").pop().split("?").shift();

            return `${charType}|${charName}|${avatarFileName}`;
        },

        /**
         * Process individual message for avatar and UID
         */
        processMessage(message) {
            // Set UID attribute for CSS targeting
            const uid = this.getMessageAuthorUid(message);
            if (!message.hasAttribute("csc-author-uid") && uid) {
                message.setAttribute("csc-author-uid", uid);
            }

            // Process avatar image
            const avatarImg = message.querySelector(".avatar img");
            if (avatarImg) {
                this.processAvatarImage(message, avatarImg);
            }
        },

        /**
         * Process avatar image with alternative image support
         */
        processAvatarImage(message, avatarImg) {
            let avatarSrc = avatarImg.getAttribute("src");
            if (!avatarSrc) return;

            // Check for character-specific alternative image
            const isUser = message.getAttribute("is_user") === "true";
            if (!isUser && window.VoidDriftGalleryManager) {
                const altImageUrl = this.getAlternativeImageForMessage(message);
                if (altImageUrl) {
                    const cleanUrl = altImageUrl.startsWith('/') ? altImageUrl : `/${altImageUrl}`;
                    message.style.setProperty(CONSTANTS.CSS_VARS.MESSAGE_AVATAR_URL, `url('${cleanUrl}')`);
                    return;
                }
            }
            
            // Use default avatar
            if (!avatarSrc.startsWith("/") && !avatarSrc.startsWith("http")) {
                avatarSrc = "/" + avatarSrc;
            }
            const escapedSrc = Utils.escapeCssUrl(avatarSrc);
            message.style.setProperty(CONSTANTS.CSS_VARS.MESSAGE_AVATAR_URL, `url('${escapedSrc}')`);
        },

        /**
         * Get alternative image URL for a message
         */
        getAlternativeImageForMessage(message) {
            const nameElement = message.querySelector(".name_text");
            const charName = nameElement ? nameElement.textContent.trim() : null;
            
            if (charName && window.VoidDriftGalleryManager) {
                return window.VoidDriftGalleryManager.getCharacterAlternativeImage(charName);
            }
            
            return null;
        },

        /**
         * Process all visible messages
         */
        processAllMessages() {
            document.querySelectorAll(`${CONSTANTS.DOM.CHAT_CONTAINER} ${CONSTANTS.DOM.CHAT_MESSAGE}`)
                .forEach(message => this.processMessage(message));
        }
    };

    // Export for gallery manager to use
    window.VoidDrift = { 
        processAllMessages: () => MessageProcessor.processAllMessages() 
    };

    //================================================================================
    // THEME & UI MANAGEMENT
    //================================================================================

    const ThemeManager = {
        /**
         * Enable or disable Whisper Light theme
         */
        setWhisperLightEnabled(enabled) {
            const styleTag = document.getElementById(CONSTANTS.DOM.STYLESHEET_ID);
            const themeSettings = document.getElementById(CONSTANTS.DOM.THEME_SETTINGS_CONTAINER);

            if (enabled) {
                this.loadStylesheet();
                this.addThemeClass();
                if (themeSettings) themeSettings.style.display = "";
                this.updateStyles();
            } else {
                if (styleTag) styleTag.remove();
                this.removeThemeClass();
                if (themeSettings) themeSettings.style.display = "none";
                this.clearCssVariables();
            }
        },

        /**
         * Add the voiddrift-theme class to enable namespaced CSS
         */
        addThemeClass() {
            document.body.classList.add('voiddrift-theme');
        },

        /**
         * Remove the voiddrift-theme class to disable namespaced CSS
         */
        removeThemeClass() {
            document.body.classList.remove('voiddrift-theme');
        },

        /**
         * Load the stylesheet if not already loaded
         */
        loadStylesheet() {
            if (!document.getElementById(CONSTANTS.DOM.STYLESHEET_ID)) {
                const newStyleTag = document.createElement("link");
                newStyleTag.id = CONSTANTS.DOM.STYLESHEET_ID;
                newStyleTag.rel = "stylesheet";
                newStyleTag.type = "text/css";
                newStyleTag.href = CONSTANTS.PATHS.STYLESHEET;
                document.head.appendChild(newStyleTag);
            }
        },

        /**
         * Update CSS custom properties based on settings
         */
        updateStyles() {
            if (!Utils.getSettings().whisperLight) return;

            const elementIds = {
                avatarWidth: CONSTANTS.DOM.AVATAR_WIDTH_INPUT,
                editOffset: CONSTANTS.DOM.EDIT_OFFSET_INPUT,
                editRightOffset: CONSTANTS.DOM.EDIT_RIGHT_OFFSET_INPUT,
                reasoningTopCompensation: CONSTANTS.DOM.REASONING_TOP_COMPENSATION_INPUT,
                reasoningRightCompensation: CONSTANTS.DOM.REASONING_RIGHT_COMPENSATION_INPUT,
                personaBannerPos: CONSTANTS.DOM.PERSONA_BANNER_POS_INPUT,
                characterBannerPos: CONSTANTS.DOM.CHARACTER_BANNER_POS_INPUT,
            };

            const elements = Utils.getElements(elementIds);
            if (Object.keys(elements).length !== Object.keys(elementIds).length) return;

            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.AVATAR_WIDTH, `${elements.avatarWidth.value}px`);
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.EDIT_OFFSET, `${elements.editOffset.value}px`);
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.EDIT_RIGHT_OFFSET, `${elements.editRightOffset.value}px`);
            
            // Apply reasoning edit button compensation from input fields
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.REASONING_TOP_COMPENSATION, `${elements.reasoningTopCompensation.value}px`);
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.REASONING_RIGHT_COMPENSATION, `${elements.reasoningRightCompensation.value}px`);
            
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.PERSONA_BANNER, `${elements.personaBannerPos.value}%`);
            document.documentElement.style.setProperty(CONSTANTS.CSS_VARS.CHARACTER_BANNER, `${elements.characterBannerPos.value}%`);
        },

        /**
         * Clear all CSS variables
         */
        clearCssVariables() {
            const vars = Object.values(CONSTANTS.CSS_VARS);
            vars.forEach(cssVar => {
                document.documentElement.style.removeProperty(cssVar);
            });
        }
    };

    //================================================================================
    // GALLERY MANAGER INTEGRATION
    //================================================================================

    const GalleryIntegration = {
        /**
         * Load gallery manager script
         */
        async loadGalleryManager() {
            if (window.VoidDriftGalleryManager) return;
            
            try {
                const script = document.createElement('script');
                script.src = CONSTANTS.PATHS.GALLERY_MANAGER;
                script.async = true;
                document.head.appendChild(script);
                
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
                
                if (window.VoidDriftGalleryManager) {
                    await window.VoidDriftGalleryManager.init();
                }
            } catch (error) {
                console.error('Failed to load gallery manager:', error);
            }
        },

        /**
         * Setup gallery UI elements and event handlers
         */
        async setupGalleryUI() {
            const elementIds = {
                characterSelect: CONSTANTS.DOM.CHARACTER_SELECT,
                imageSelect: CONSTANTS.DOM.IMAGE_SELECT,
                imageSelection: CONSTANTS.DOM.IMAGE_SELECTION_CONTAINER,
                refreshButton: CONSTANTS.DOM.REFRESH_CHARACTERS_BUTTON,
                previewButton: CONSTANTS.DOM.PREVIEW_IMAGE_BUTTON,
                applyButton: CONSTANTS.DOM.APPLY_IMAGE_BUTTON,
                resetButton: CONSTANTS.DOM.RESET_CHARACTER_BUTTON,
                previewContainer: CONSTANTS.DOM.IMAGE_PREVIEW_CONTAINER,
                previewImg: CONSTANTS.DOM.PREVIEW_IMG,
            };

            const elements = Utils.getElements(elementIds);
            if (Object.keys(elements).length !== Object.keys(elementIds).length) return;

            // Setup event handlers
            this.setupGalleryEvents(elements);
            
            // Initial load
            await this.loadCharacters(elements);
        },

        /**
         * Setup all gallery-related event handlers
         */
        setupGalleryEvents(elements) {
            elements.refreshButton.addEventListener('click', async () => {
                // Clear the gallery manager's image cache to force fresh data
                if (window.VoidDriftGalleryManager) {
                    window.VoidDriftGalleryManager.clearCache();
                }
                await this.loadCharacters(elements);
                Utils.showNotification('Character list refreshed', 'info');
            });
            
            elements.characterSelect.addEventListener('change', () => 
                this.loadCharacterImages(elements));
            
            elements.imageSelect.addEventListener('change', () => 
                this.previewImage(elements));
            
            elements.previewButton.addEventListener('click', () => 
                this.previewImage(elements));
            
            elements.applyButton.addEventListener('click', () => 
                this.applyImage(elements));
            
            elements.resetButton.addEventListener('click', () => 
                this.resetCharacter(elements));
        },

        /**
         * Load and populate character dropdown
         */
        async loadCharacters(elements) {
            if (!window.VoidDriftGalleryManager) return;
            
            elements.characterSelect.innerHTML = '<option value="">Select a character...</option>';
            const folders = await window.VoidDriftGalleryManager.getCharacterFolders();
            
            // Get current character name to pre-select it
            const currentChar = window.VoidDriftGalleryManager.getCurrentCharacterName();
            
            folders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder;
                option.textContent = folder;
                elements.characterSelect.appendChild(option);
            });

            // Auto-select current character if available
            if (currentChar && folders.includes(currentChar)) {
                elements.characterSelect.value = currentChar;
                await this.loadCharacterImages(elements);
            }
        },

        /**
         * Load images for selected character
         */
        async loadCharacterImages(elements) {
            const selectedChar = elements.characterSelect.value;
            if (!selectedChar || !window.VoidDriftGalleryManager) {
                elements.imageSelection.style.display = 'none';
                return;
            }

            elements.imageSelect.innerHTML = '<option value="">Use default avatar</option>';
            const images = await window.VoidDriftGalleryManager.getCharacterImages(selectedChar);
            
            if (images.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No images found - use Gallery extension to add images';
                option.disabled = true;
                elements.imageSelect.appendChild(option);
            } else {
                images.forEach(image => {
                    const option = document.createElement('option');
                    option.value = image.url;
                    option.textContent = image.name;
                    elements.imageSelect.appendChild(option);
                });
            }

            // Show current selection if any
            const currentImage = window.VoidDriftGalleryManager.getCharacterAlternativeImage(selectedChar);
            if (currentImage) {
                elements.imageSelect.value = currentImage;
                this.previewImage(elements);
            }

            elements.imageSelection.style.display = 'block';
        },

        /**
         * Preview selected image
         */
        previewImage(elements) {
            const selectedImage = elements.imageSelect.value;
            if (selectedImage) {
                elements.previewImg.src = selectedImage;
                elements.previewContainer.style.display = 'block';
            } else {
                elements.previewContainer.style.display = 'none';
            }
        },

        /**
         * Apply selected image or reset to default
         */
        applyImage(elements) {
            const selectedChar = elements.characterSelect.value;
            const selectedImage = elements.imageSelect.value;
            
            if (!selectedChar || !window.VoidDriftGalleryManager) return;

            if (selectedImage) {
                window.VoidDriftGalleryManager.setCharacterAlternativeImage(selectedChar, selectedImage);
                Utils.showNotification(`Alternative image applied for ${selectedChar}`);
            } else {
                window.VoidDriftGalleryManager.resetCharacterToDefault(selectedChar);
                Utils.showNotification(`${selectedChar} reset to default avatar`);
            }
            
            elements.previewContainer.style.display = 'none';
        },

        /**
         * Reset character to default avatar
         */
        resetCharacter(elements) {
            const selectedChar = elements.characterSelect.value;
            if (!selectedChar || !window.VoidDriftGalleryManager) return;

            window.VoidDriftGalleryManager.resetCharacterToDefault(selectedChar);
            elements.imageSelect.value = '';
            elements.previewContainer.style.display = 'none';
            Utils.showNotification(`${selectedChar} reset to default avatar`);
        }
    };

    //================================================================================
    // SETTINGS UI MANAGEMENT
    //================================================================================

    const SettingsManager = {
        /**
         * Setup Whisper Light toggle
         */
        setupWhisperLightToggle() {
            const checkbox = document.getElementById(CONSTANTS.DOM.WHISPER_LIGHT_TOGGLE);
            if (!checkbox) return;

            const settings = Utils.getSettings();
            checkbox.checked = settings.whisperLight;
            ThemeManager.setWhisperLightEnabled(checkbox.checked);

            checkbox.addEventListener("change", () => {
                settings.whisperLight = checkbox.checked;
                saveSettingsDebounced();
                ThemeManager.setWhisperLightEnabled(checkbox.checked);
            });
        },

        /**
         * Setup theme-related UI controls
         */
        setupThemeSettings() {
            const elementIds = {
                largeModeRadio: CONSTANTS.DOM.LARGE_MODE_RADIO,
                smallModeRadio: CONSTANTS.DOM.SMALL_MODE_RADIO,
                avatarWidthInput: CONSTANTS.DOM.AVATAR_WIDTH_INPUT,
                editOffsetInput: CONSTANTS.DOM.EDIT_OFFSET_INPUT,
                editRightOffsetInput: CONSTANTS.DOM.EDIT_RIGHT_OFFSET_INPUT,
                reasoningTopCompensationInput: CONSTANTS.DOM.REASONING_TOP_COMPENSATION_INPUT,
                reasoningRightCompensationInput: CONSTANTS.DOM.REASONING_RIGHT_COMPENSATION_INPUT,
                resetButton: CONSTANTS.DOM.AVATAR_RESET_BUTTON,
                personaBannerPosInput: CONSTANTS.DOM.PERSONA_BANNER_POS_INPUT,
                characterBannerPosInput: CONSTANTS.DOM.CHARACTER_BANNER_POS_INPUT,
                bannerPosResetButton: CONSTANTS.DOM.BANNER_POS_RESET_BUTTON,
                resetAllButton: CONSTANTS.DOM.RESET_ALL_BUTTON,
            };

            const elements = Utils.getElements(elementIds);
            if (Object.keys(elements).length !== Object.keys(elementIds).length) return;

            this.setupModeControls(elements);
            this.setupResetButtons(elements);
            this.setupInputListeners(elements);
            this.loadInitialState(elements);
        },

        /**
         * Setup avatar mode radio buttons
         */
        setupModeControls(elements) {
            const handleModeChange = (mode) => {
                Utils.getSettings().avatarMode = mode;
                saveSettingsDebounced();
                this.applyMode(elements, mode);
                ThemeManager.updateStyles();
            };

            elements.largeModeRadio.addEventListener("change", () => 
                elements.largeModeRadio.checked && handleModeChange("large"));
            
            elements.smallModeRadio.addEventListener("change", () => 
                elements.smallModeRadio.checked && handleModeChange("small"));
        },

        /**
         * Setup reset buttons
         */
        setupResetButtons(elements) {
            elements.resetButton.addEventListener("click", () => {
                const settings = Utils.getSettings();
                const mode = document.querySelector(CONSTANTS.DOM.AVATAR_MODE_RADIO_CHECKED).value;
                settings[`avatar_width_${mode}`] = DEFAULT_SETTINGS[`avatar_width_${mode}`];
                settings[`edit_offset_${mode}`] = DEFAULT_SETTINGS[`edit_offset_${mode}`];
                settings[`edit_right_offset_${mode}`] = DEFAULT_SETTINGS[`edit_right_offset_${mode}`];
                settings[`reasoning_top_compensation_${mode}`] = DEFAULT_SETTINGS[`reasoning_top_compensation_${mode}`];
                settings[`reasoning_right_compensation_${mode}`] = DEFAULT_SETTINGS[`reasoning_right_compensation_${mode}`];
                saveSettingsDebounced();
                this.applyMode(elements, mode);
                ThemeManager.updateStyles();
            });

            elements.bannerPosResetButton.addEventListener("click", () => {
                const settings = Utils.getSettings();
                settings.personaBannerPos = DEFAULT_SETTINGS.personaBannerPos;
                settings.characterBannerPos = DEFAULT_SETTINGS.characterBannerPos;
                saveSettingsDebounced();
                this.applyBannerPositions(elements);
                ThemeManager.updateStyles();
                
                // Save reset values for current character
                CharacterPositionManager.saveCurrentCharacterPositions();
            });

            // Reset All button
            elements.resetAllButton.addEventListener("click", () => {
                this.resetAllToDefault(elements);
            });
        },

        /**
         * Setup input field listeners
         */
        setupInputListeners(elements) {
            elements.avatarWidthInput.addEventListener("input", 
                Utils.createInputListener(() => `avatar_width_${Utils.getSettings().avatarMode}`));
            
            elements.editOffsetInput.addEventListener("input", 
                Utils.createInputListener(() => `edit_offset_${Utils.getSettings().avatarMode}`));
            
            elements.editRightOffsetInput.addEventListener("input", 
                Utils.createInputListener(() => `edit_right_offset_${Utils.getSettings().avatarMode}`));
            
            elements.reasoningTopCompensationInput.addEventListener("input", 
                Utils.createInputListener(() => `reasoning_top_compensation_${Utils.getSettings().avatarMode}`));
            
            elements.reasoningRightCompensationInput.addEventListener("input", 
                Utils.createInputListener(() => `reasoning_right_compensation_${Utils.getSettings().avatarMode}`));
            
            elements.personaBannerPosInput.addEventListener("input", 
                Utils.createInputListener('personaBannerPos'));
            
            elements.characterBannerPosInput.addEventListener("input", 
                Utils.createInputListener('characterBannerPos'));
        },

        /**
         * Apply settings for a specific mode
         */
        applyMode(elements, mode) {
            const settings = Utils.getSettings();
            elements.avatarWidthInput.value = settings[`avatar_width_${mode}`] ?? DEFAULT_SETTINGS[`avatar_width_${mode}`];
            elements.editOffsetInput.value = settings[`edit_offset_${mode}`] ?? DEFAULT_SETTINGS[`edit_offset_${mode}`];
            elements.editRightOffsetInput.value = settings[`edit_right_offset_${mode}`] ?? DEFAULT_SETTINGS[`edit_right_offset_${mode}`];
            elements.reasoningTopCompensationInput.value = settings[`reasoning_top_compensation_${mode}`] ?? DEFAULT_SETTINGS[`reasoning_top_compensation_${mode}`];
            elements.reasoningRightCompensationInput.value = settings[`reasoning_right_compensation_${mode}`] ?? DEFAULT_SETTINGS[`reasoning_right_compensation_${mode}`];
        },

        /**
         * Apply banner position settings
         */
        applyBannerPositions(elements) {
            const settings = Utils.getSettings();
            elements.personaBannerPosInput.value = settings.personaBannerPos ?? DEFAULT_SETTINGS.personaBannerPos;
            elements.characterBannerPosInput.value = settings.characterBannerPos ?? DEFAULT_SETTINGS.characterBannerPos;
        },

        /**
         * Load initial UI state from settings
         */
        loadInitialState(elements) {
            const savedMode = Utils.getSettings().avatarMode;
            if (savedMode === "small") {
                elements.smallModeRadio.checked = true;
            } else {
                elements.largeModeRadio.checked = true;
            }
            this.applyMode(elements, savedMode);
            this.applyBannerPositions(elements);
            ThemeManager.updateStyles();
        },

        /**
         * Reset all settings to default values
         */
        resetAllToDefault(elements) {
            if (!confirm('Reset all VoidDrift settings to default?\n\nThis will:\n• Restore all theme settings to defaults\n• Clear alternative character image selections\n• Clear all per-character position settings\n• Re-enable Whisper Light theme\n\nYour uploaded images will remain safe in the Gallery.')) {
                return;
            }

            try {
                // Reset all extension settings to defaults
                extensionSettings[CONSTANTS.MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
                
                // Clear all alternative character images if gallery manager is available
                if (window.VoidDriftGalleryManager) {
                    window.VoidDriftGalleryManager.resetAllCharacters();
                }

                // Clear all character position settings
                CharacterPositionManager.resetAllCharacterPositions();
                
                // Update UI elements to reflect defaults
                this.applyDefaultsToUI(elements);
                
                // Save settings and update theme
                saveSettingsDebounced();
                ThemeManager.setWhisperLightEnabled(DEFAULT_SETTINGS.whisperLight);
                ThemeManager.updateStyles();
                
                // Refresh gallery UI if available
                if (window.VoidDriftGalleryManager) {
                    const characterSelect = document.getElementById(CONSTANTS.DOM.CHARACTER_SELECT);
                    if (characterSelect) {
                        characterSelect.value = '';
                        const imageSelection = document.getElementById(CONSTANTS.DOM.IMAGE_SELECTION_CONTAINER);
                        if (imageSelection) {
                            imageSelection.style.display = 'none';
                        }
                    }
                }
                
                Utils.showNotification('All VoidDrift settings reset to default!', 'success');
            } catch (error) {
                console.error('VoidDrift: Error resetting all settings:', error);
                Utils.showNotification('Error resetting settings. Check console for details.', 'error');
            }
        },

        /**
         * Apply default values to all UI elements
         */
        applyDefaultsToUI(elements) {
            // Set Whisper Light toggle
            const whisperToggle = document.getElementById(CONSTANTS.DOM.WHISPER_LIGHT_TOGGLE);
            if (whisperToggle) {
                whisperToggle.checked = DEFAULT_SETTINGS.whisperLight;
            }
            
            // Set avatar mode radio buttons
            if (DEFAULT_SETTINGS.avatarMode === 'small') {
                elements.smallModeRadio.checked = true;
                elements.largeModeRadio.checked = false;
            } else {
                elements.largeModeRadio.checked = true;
                elements.smallModeRadio.checked = false;
            }
            
            // Apply mode-specific defaults
            this.applyMode(elements, DEFAULT_SETTINGS.avatarMode);
            
            // Set banner position inputs
            elements.personaBannerPosInput.value = DEFAULT_SETTINGS.personaBannerPos;
            elements.characterBannerPosInput.value = DEFAULT_SETTINGS.characterBannerPos;
            this.applyBannerPositions(elements);
        }
    };

    //================================================================================
    // INITIALIZATION
    //================================================================================

    const Initialization = {
        /**
         * Add VoidDrift settings drawer to extension settings
         */
        async addVoidDriftSettingsDrawer() {
            if (document.getElementById(CONSTANTS.DOM.WHISPER_LIGHT_TOGGLE)) return;

            const settingsHtml = await $.get(CONSTANTS.PATHS.SETTINGS_HTML);
            $(CONSTANTS.DOM.EXTENSIONS_SETTINGS).append(settingsHtml);

            SettingsManager.setupWhisperLightToggle();
            SettingsManager.setupThemeSettings();
            
            // Load gallery manager and setup UI
            await GalleryIntegration.loadGalleryManager();
            await GalleryIntegration.setupGalleryUI();
            
            if (Utils.getSettings().whisperLight) {
                ThemeManager.updateStyles();
            }

            // Initialize character position manager
            CharacterPositionManager.handleCharacterChange();
            
            // Update character indicator once UI is loaded
            setTimeout(() => {
                CharacterPositionManager.updateCharacterIndicator();
            }, 500);
        },

        /**
         * Setup chat observers and event listeners
         */
        setupChatObservers() {
            // Observer for new chat messages
            const chatObserver = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList.contains("mes")) {
                            MessageProcessor.processMessage(node);
                        }
                    }
                }
            });

            const chatContainer = document.querySelector(CONSTANTS.DOM.CHAT_CONTAINER);
            if (chatContainer) {
                chatObserver.observe(chatContainer, { childList: true });
                MessageProcessor.processAllMessages();
            }

            // Additional observer for character changes by watching the chat container
            const characterChangeObserver = new MutationObserver(() => {
                // Debounce character change detection
                clearTimeout(this.characterChangeTimeout);
                this.characterChangeTimeout = setTimeout(() => {
                    CharacterPositionManager.handleCharacterChange();
                }, 250);
            });

            // Watch for changes in the main chat area that might indicate a character change
            if (chatContainer) {
                characterChangeObserver.observe(chatContainer, { 
                    childList: true, 
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['csc-author-uid']
                });
            }
        },

        /**
         * Setup SillyTavern event listeners
         */
        setupEventListeners() {
            if (context?.internal?.eventSource) {
                const { eventSource, event_types } = context.internal;
                
                eventSource.on(event_types.CHAT_CHANGED, () => {
                    MessageProcessor.processAllMessages();
                    this.handleChatChanged();
                    
                    // Handle character position changes
                    setTimeout(() => {
                        CharacterPositionManager.handleCharacterChange();
                    }, 100);
                });

                // Also listen for character selection changes if available
                if (event_types.CHARACTER_SELECTED) {
                    eventSource.on(event_types.CHARACTER_SELECTED, () => {
                        setTimeout(() => {
                            CharacterPositionManager.handleCharacterChange();
                        }, 100);
                    });
                }

                // Try to catch other relevant events
                if (event_types.CHARACTER_EDITED) {
                    eventSource.on(event_types.CHARACTER_EDITED, () => {
                        setTimeout(() => {
                            CharacterPositionManager.handleCharacterChange();
                        }, 100);
                    });
                }
            }
        },

        /**
         * Handle chat changed event for gallery integration
         */
        handleChatChanged() {
            if (window.VoidDriftGalleryManager) {
                window.VoidDriftGalleryManager.triggerImageUpdate();
                
                // Refresh gallery UI to show current character
                setTimeout(() => {
                    const characterSelect = document.getElementById(CONSTANTS.DOM.CHARACTER_SELECT);
                    const currentChar = window.VoidDriftGalleryManager.getCurrentCharacterName();
                    if (characterSelect && currentChar) {
                        characterSelect.value = currentChar;
                        // Trigger change event to load images
                        const event = new Event('change');
                        characterSelect.dispatchEvent(event);
                    }
                }, 200);
            }
        },

        /**
         * Setup settings panel observer
         */
        setupSettingsObserver() {
            const settingsObserver = new MutationObserver(() => {
                if (document.querySelector(CONSTANTS.DOM.EXTENSIONS_SETTINGS)) {
                    this.addVoidDriftSettingsDrawer();
                    settingsObserver.disconnect();
                }
            });
            settingsObserver.observe(document.body, { childList: true, subtree: true });
        }
    };

    //================================================================================
    // MAIN EXECUTION
    //================================================================================

    function main() {
        const settings = Utils.getSettings();
        ThemeManager.setWhisperLightEnabled(settings.whisperLight);
        Initialization.setupChatObservers();
        Initialization.setupEventListeners();
        Initialization.setupSettingsObserver();
    }

    main();
});