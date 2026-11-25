// Ported from the pre-redesign dashboard. Element ids and tab ids are the DOM contract.
        // Immediate initialization for critical UI functions
        (function () {
            'use strict';

            // Core app actions available globally
            window.appActions = {
                toggleTheme: function () {
                    const html = document.documentElement;
                    const currentTheme = html.getAttribute('data-theme') || 'dark';
                    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

                    html.setAttribute('data-theme', newTheme);
                    localStorage.setItem('config-ui-theme', newTheme);

                    // Update all theme icons
                    document.querySelectorAll('[data-theme-icon]').forEach(icon => {
                        icon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
                    });

                    console.log('Theme switched to:', newTheme);
                },

                saveConfig: async function () {
                    // Show save indicators
                    const desktopIndicator = document.getElementById('desktop-save-indicator');
                    const mobileIndicator = document.getElementById('mobile-save-indicator');

                    if (desktopIndicator) {
                        desktopIndicator.classList.remove('hidden');
                        desktopIndicator.textContent = 'Saving...';
                    }
                    if (mobileIndicator) {
                        mobileIndicator.classList.remove('hidden');
                        mobileIndicator.textContent = 'Saving...';
                    }

                    // Use config manager if available
                    if (window.configManager && window.configManager.saveConfig) {
                        await window.configManager.saveConfig();
                    } else {
                        console.error('Config manager not ready yet');
                        if (desktopIndicator) {
                            desktopIndicator.textContent = 'Error: Config manager not ready';
                            setTimeout(() => desktopIndicator.classList.add('hidden'), 3000);
                        }
                        if (mobileIndicator) {
                            mobileIndicator.textContent = 'Error!';
                            setTimeout(() => mobileIndicator.classList.add('hidden'), 3000);
                        }
                    }
                },

                toggleDrawer: function () {
                    // Use the new custom drawer implementation
                    if (window.mobileDrawer) {
                        window.mobileDrawer.toggle();
                    }
                }
            };


            // Event delegation for all button clicks - Set up after DOM is ready
            document.addEventListener('DOMContentLoaded', function () {
                console.log('Setting up button event delegation');

                // Simple, single event delegation
                document.addEventListener('click', function (e) {
                    // Find the closest element with data-action attribute
                    const actionElement = e.target.closest('[data-action]');
                    if (!actionElement) return;

                    // Prevent default and stop propagation
                    e.preventDefault();
                    e.stopPropagation();

                    // Get the action and execute it
                    const action = actionElement.getAttribute('data-action');
                    console.log('Action triggered:', action);

                    switch (action) {
                        case 'toggle-theme':
                            window.appActions.toggleTheme();
                            break;
                        case 'save-config':
                            window.appActions.saveConfig();
                            break;
                        case 'toggle-drawer':
                            console.log('Toggling drawer');
                            window.appActions.toggleDrawer();
                            break;
                        case 'navigate-tab':
                            const tabId = actionElement.getAttribute('data-tab');
                            if (tabId) {
                                window.location.hash = tabId; // Update URL hash
                                // activateTab will be called by the hashchange listener
                            }
                            break;
                        default:
                            console.warn('Unknown action:', action);
                    }
                });
            });

            // Initialize theme on page load
            const savedTheme = localStorage.getItem('config-ui-theme') || 'dark';
            document.documentElement.setAttribute('data-theme', savedTheme);

            // Update theme icons on load
            setTimeout(() => {
                document.querySelectorAll('[data-theme-icon]').forEach(icon => {
                    icon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
                });
            }, 100);

        })();

        // Add the missing hideRestartNotification function
        function hideRestartNotification() {
            const notification = document.getElementById('restartNotification');
            if (notification) {
                notification.style.display = 'none';
            }
        }
        // Wrapper functions for backward compatibility
        function showSuccess(message) {
            showToast(message, 'success');
        }

        function showError(message) {
            showToast(message, 'error');
        }

        // Make wrapper functions available globally
        window.showSuccess = showSuccess;
        window.showError = showError;

        // Configuration Manager
        class ConfigManager {
            constructor() {
                this.config = {};
                this.hasChanges = false;
                this.listenersInitialized = false;
                // Note: init() is called explicitly after instantiation to properly handle async
            }

            async init() {
                await this.loadConfig();
                this.setupEventListeners();
                this.populateFields();
            }

            async loadConfig() {
                try {
                    const response = await fetch('/api/config');
                    const data = await response.json();
                    this.config = data.config || {};
                    // Expose config globally for other components (like workspace selector)
                    window.currentConfig = this.config;
                    console.log('Config loaded:', this.config);
                } catch (error) {
                    console.error('Failed to load config:', error);
                }
            }

            populateFields() {
                // Populate all form fields with config values
                Object.entries(this.config).forEach(([key, value]) => {
                    // Skip RAG prompt fields, template modal fields, translation input, and temporary form variables
                    if (key === 'RAG_PRE_CONTEXT' || key === 'RAG_POST_CONTEXT' || key === 'templateName' || key === 'templateDescription' || key === 'translationTargetLanguage' ||
                        key === 'new-model-id' || key === 'new-model-name' || key === 'ai-provider-select') {
                        return;
                    }

                    // No special handling needed for unified RAG system

                    const field = document.getElementById(key);
                    if (field) {
                        if (field.type === 'checkbox') {
                            field.checked = value === 'true' || value === true;
                        } else {
                            field.value = value || '';
                        }
                    }
                });

                // Update favicon preview with actual value
                const faviconUrl = this.config.NEXT_PUBLIC_FAVICON_URL || '/favicon.svg';
                const faviconPreview = document.getElementById('faviconPreview');
                if (faviconPreview) {
                    faviconPreview.innerHTML = `<img src="${faviconUrl}" alt="Current favicon" class="w-6 h-6" onerror="this.src='/favicon.svg'">`;
                }

                // Update model cards after config is loaded
                if (typeof updateModelCards === 'function') {
                    updateModelCards();
                }

                // Initialize RAG slider values from config
                const chunkSizeSlider = document.getElementById('LLAMACLOUD_CHUNK_SIZE');
                const chunkSizeValue = document.getElementById('chunk-size-value');
                if (chunkSizeSlider && this.config.LLAMACLOUD_CHUNK_SIZE) {
                    chunkSizeSlider.value = this.config.LLAMACLOUD_CHUNK_SIZE;
                    if (chunkSizeValue) {
                        chunkSizeValue.textContent = this.config.LLAMACLOUD_CHUNK_SIZE;
                    }
                }

                const chunkOverlapSlider = document.getElementById('LLAMACLOUD_CHUNK_OVERLAP');
                const chunkOverlapValue = document.getElementById('chunk-overlap-value');
                if (chunkOverlapSlider && this.config.LLAMACLOUD_CHUNK_OVERLAP) {
                    chunkOverlapSlider.value = this.config.LLAMACLOUD_CHUNK_OVERLAP;
                    if (chunkOverlapValue) {
                        chunkOverlapValue.textContent = this.config.LLAMACLOUD_CHUNK_OVERLAP;
                    }
                }

                // Initialize voice provider settings visibility
                const voiceProvider = this.config.NEXT_PUBLIC_VOICE_PROVIDER || 'openai';
                const openaiSettings = document.getElementById('openai-tts-settings');
                const elevenLabsSettings = document.getElementById('elevenlabs-tts-settings');

                if (voiceProvider === 'elevenlabs') {
                    openaiSettings.style.display = 'none';
                    elevenLabsSettings.style.display = 'block';
                } else {
                    openaiSettings.style.display = 'block';
                    elevenLabsSettings.style.display = 'none';
                }

                // Initialize image generation provider dropdown based on legacy toggles
                const imageProviderSelect = document.getElementById('IMAGE_GENERATION_PROVIDER');
                if (imageProviderSelect) {
                    // Check legacy toggles first
                    if (this.config.USE_OPENAI_IMAGE === 'true' || this.config.USE_OPENAI_IMAGE === true) {
                        imageProviderSelect.value = 'openai';
                    } else if (this.config.USE_REPLICATE_PROVIDER === 'true' || this.config.USE_REPLICATE_PROVIDER === true) {
                        imageProviderSelect.value = 'fal';
                    } else if (this.config.IMAGE_GENERATION_PROVIDER) {
                        imageProviderSelect.value = this.config.IMAGE_GENERATION_PROVIDER;
                    } else {
                        imageProviderSelect.value = 'openai'; // default
                    }

                    // Update provider settings visibility
                    if (typeof updateImageProviderSettings === 'function') {
                        updateImageProviderSettings();
                    }
                }

                // Initialize Video Generation provider
                const videoProviderSelect = document.getElementById('VIDEO_GENERATION_PROVIDER');
                if (videoProviderSelect) {
                    if (this.config.VIDEO_GENERATION_PROVIDER) {
                        videoProviderSelect.value = this.config.VIDEO_GENERATION_PROVIDER;
                    } else {
                        // Default based on USE_REPLICATE_PROVIDER
                        videoProviderSelect.value = (this.config.USE_REPLICATE_PROVIDER === 'true') ? 'fal' : 'replicate';
                    }

                    if (typeof updateVideoProviderSettings === 'function') {
                        updateVideoProviderSettings();
                    }
                }

                // Initialize 3D Generation provider (USE_REPLICATE_PROVIDER checkbox)
                const useFalProviderCheckbox = document.getElementById('USE_REPLICATE_PROVIDER');
                if (useFalProviderCheckbox) {
                    // Set checkbox based on config
                    useFalProviderCheckbox.checked = (this.config.USE_REPLICATE_PROVIDER === 'true' || this.config.USE_REPLICATE_PROVIDER === true);

                    if (typeof update3DProviderSettings === 'function') {
                        update3DProviderSettings();
                    }
                }

                // Initialize AI Logo Type based on existing configuration
                const aiLogoType = this.config.NEXT_PUBLIC_AI_LOGO_TYPE;
                const aiLogoUrl = this.config.NEXT_PUBLIC_AI_RESPONSE_LOGO_URL;
                const useDefaultLogo = this.config.NEXT_PUBLIC_USE_DEFAULT_AI_LOGO === 'true' || this.config.NEXT_PUBLIC_USE_DEFAULT_AI_LOGO === true;

                // Determine which radio button to check
                let logoTypeToSelect = 'chat-bubble'; // default

                if (aiLogoType) {
                    logoTypeToSelect = aiLogoType;
                } else if (aiLogoUrl) {
                    // If there's a URL but no type, check if it's one of our defaults
                    if (aiLogoUrl.includes('/logos/defaults/')) {
                        const match = aiLogoUrl.match(/\/logos\/defaults\/(.+)\.svg/);
                        if (match) {
                            logoTypeToSelect = match[1];
                        } else {
                            logoTypeToSelect = 'custom';
                        }
                    } else {
                        logoTypeToSelect = 'custom';
                    }
                }

                // Select the appropriate radio button
                const radioToSelect = document.querySelector(`input[name="aiLogoType"][value="${logoTypeToSelect}"]`);
                if (radioToSelect) {
                    radioToSelect.checked = true;
                    radioToSelect.dispatchEvent(new Event('change'));
                }

                // If custom, populate the custom URL field
                if (logoTypeToSelect === 'custom' && aiLogoUrl) {
                    const customAiLogoUrl = document.getElementById('customAiLogoUrl');
                    if (customAiLogoUrl) {
                        customAiLogoUrl.value = aiLogoUrl;
                    }
                }

                // Initialize Token Limit Configuration
                const useCustomTokenLimit = document.getElementById('USE_CUSTOM_TOKEN_LIMIT');
                const maxCompletionTokens = document.getElementById('MAX_COMPLETION_TOKENS');
                const tokenLimitSettings = document.getElementById('token-limit-settings');

                if (this.config.MAX_COMPLETION_TOKENS) {
                    // If MAX_COMPLETION_TOKENS is set, enable custom limit
                    if (useCustomTokenLimit) {
                        useCustomTokenLimit.checked = true;
                    }
                    if (maxCompletionTokens) {
                        maxCompletionTokens.value = this.config.MAX_COMPLETION_TOKENS;
                    }
                    if (tokenLimitSettings) {
                        tokenLimitSettings.style.display = 'block';
                    }
                } else {
                    // Otherwise, use default limits
                    if (useCustomTokenLimit) {
                        useCustomTokenLimit.checked = false;
                    }
                    if (tokenLimitSettings) {
                        tokenLimitSettings.style.display = 'none';
                    }
                }

                // Initialize Welcome Text Customization
                const welcomeTextInput = document.getElementById('NEXT_PUBLIC_WELCOME_TEXT');
                const welcomeTextGradient = document.getElementById('NEXT_PUBLIC_WELCOME_TEXT_GRADIENT');
                const welcomeTextPreview = document.getElementById('welcomeTextPreview');
                const welcomeTextMode = this.config.NEXT_PUBLIC_WELCOME_TEXT_MODE || 'default';

                // Set initial preview text
                if (welcomeTextInput && welcomeTextPreview) {
                    welcomeTextPreview.textContent = welcomeTextInput.value || 'What can I help with?';
                }

                // Update mode indicator
                if (typeof updateModeIndicator === 'function') {
                    updateModeIndicator(welcomeTextMode);
                }

                // Update preview if updateWelcomeTextPreview is available
                if (typeof updateWelcomeTextPreview === 'function') {
                    updateWelcomeTextPreview();
                }

                // Initialize suggestions if we're on that tab
                const suggestionsTab = document.getElementById('suggestions');
                if (suggestionsTab && suggestionsTab.classList.contains('active')) {
                    setTimeout(() => {
                        suggestionsManager.init();

                        // Initialize translation event listeners
                        const translateBtn = document.getElementById('translateAllBtn');
                        const revertBtn = document.getElementById('revertTranslationBtn');
                        const setDefaultBtn = document.getElementById('setAsDefaultBtn');

                        if (translateBtn && !translateBtn.hasAttribute('data-initialized')) {
                            translateBtn.setAttribute('data-initialized', 'true');
                            translateBtn.addEventListener('click', () => {
                                suggestionsManager.translateAll();
                            });
                        }

                        if (revertBtn && !revertBtn.hasAttribute('data-initialized')) {
                            revertBtn.setAttribute('data-initialized', 'true');
                            revertBtn.addEventListener('click', () => {
                                suggestionsManager.revertTranslation();
                            });
                        }

                        if (setDefaultBtn && !setDefaultBtn.hasAttribute('data-initialized')) {
                            setDefaultBtn.setAttribute('data-initialized', 'true');
                            setDefaultBtn.addEventListener('click', () => {
                                suggestionsManager.setAsDefault();
                            });
                        }

                        const resetBtn = document.getElementById('resetToDefaultsBtn');
                        if (resetBtn && !resetBtn.hasAttribute('data-initialized')) {
                            resetBtn.setAttribute('data-initialized', 'true');
                            resetBtn.addEventListener('click', () => {
                                suggestionsManager.resetToDefaults();
                            });
                        }
                    }, 100);
                }
            }

            async saveConfig() {
                console.log('SaveConfig called - showing save indicator');

                // Show saving indicator immediately - handle both desktop and mobile
                const desktopIndicator = document.getElementById('desktop-save-indicator');
                const mobileIndicator = document.getElementById('mobile-save-indicator');

                if (desktopIndicator) {
                    desktopIndicator.classList.remove('hidden');
                    desktopIndicator.textContent = 'Saving...';
                    desktopIndicator.classList.add('alert-info');
                    desktopIndicator.classList.remove('alert-success', 'alert-error');
                }

                if (mobileIndicator) {
                    mobileIndicator.classList.remove('hidden');
                    mobileIndicator.textContent = 'Saving...';
                    mobileIndicator.classList.add('alert-info');
                    mobileIndicator.classList.remove('alert-success', 'alert-error');
                }

                try {
                    // First save the main config
                    const response = await fetch('/api/config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ config: this.config }),
                    });

                    if (!response.ok) {
                        console.error('Failed to save config');
                        if (desktopIndicator) {
                            desktopIndicator.textContent = 'Failed to save configuration';
                            desktopIndicator.classList.remove('alert-info', 'alert-success');
                            desktopIndicator.classList.add('alert-error');
                            setTimeout(() => desktopIndicator.classList.add('hidden'), 3000);
                        }
                        if (mobileIndicator) {
                            mobileIndicator.textContent = 'Failed to save';
                            mobileIndicator.classList.remove('alert-info', 'alert-success');
                            mobileIndicator.classList.add('alert-error');
                            setTimeout(() => mobileIndicator.classList.add('hidden'), 3000);
                        }
                        showToast('Failed to save configuration', 'error');
                        return;
                    }

                    // Also save RAG system prompt if we're on that tab
                    const systemPromptTab = document.getElementById('system-prompt');
                    const ragPreContextArea = document.getElementById('RAG_PRE_CONTEXT');
                    const ragPostContextArea = document.getElementById('RAG_POST_CONTEXT');

                    if (systemPromptTab && systemPromptTab.classList.contains('active') &&
                        ragPreContextArea && ragPostContextArea) {
                        // Save RAG prompt
                        const ragSaved = await saveRagPrompt(false); // false = don't show toast
                        if (!ragSaved) {
                            showToast('Configuration saved but RAG prompt failed to save', 'warning');
                            return;
                        }
                    }

                    this.hasChanges = false;

                    // Update indicators to show success
                    if (desktopIndicator) {
                        desktopIndicator.textContent = 'Configuration saved successfully!';
                        desktopIndicator.classList.remove('alert-info', 'alert-error', 'hidden');
                        desktopIndicator.classList.add('alert-success');

                        // Hide after 3 seconds
                        setTimeout(() => {
                            desktopIndicator.classList.add('hidden');
                        }, 3000);
                    }

                    if (mobileIndicator) {
                        mobileIndicator.textContent = 'Saved!';
                        mobileIndicator.classList.remove('alert-info', 'alert-error', 'hidden');
                        mobileIndicator.classList.add('alert-success');

                        // Hide after 3 seconds
                        setTimeout(() => {
                            mobileIndicator.classList.add('hidden');
                        }, 3000);
                    }

                    this.showSaveIndicator();
                    console.log('Config saved successfully');
                } catch (error) {
                    console.error('Error saving config:', error);

                    // Update indicators to show error
                    if (desktopIndicator) {
                        desktopIndicator.textContent = 'Error saving configuration';
                        desktopIndicator.classList.remove('alert-info', 'alert-success');
                        desktopIndicator.classList.add('alert-error');
                        setTimeout(() => desktopIndicator.classList.add('hidden'), 3000);
                    }

                    if (mobileIndicator) {
                        mobileIndicator.textContent = 'Error!';
                        mobileIndicator.classList.remove('alert-info', 'alert-success');
                        mobileIndicator.classList.add('alert-error');
                        setTimeout(() => mobileIndicator.classList.add('hidden'), 3000);
                    }

                    showToast('Error saving configuration', 'error');
                }
            }

            updateConfig(key, value) {
                this.config[key] = value;
                this.hasChanges = true;

                // Update localStorage immediately for real-time UI updates
                if (typeof value === 'boolean') {
                    localStorage.setItem(key, value.toString());
                } else {
                    localStorage.setItem(key, value || '');
                }

                // Broadcast the change for real-time updates
                try {
                    const bc = new BroadcastChannel('chatrag-config');
                    bc.postMessage({ key, value });
                    bc.close();
                } catch (e) {
                    // BroadcastChannel might not be supported
                }
            }

            showSaveIndicator() {
                const desktopIndicator = document.getElementById('desktop-save-indicator');
                const mobileIndicator = document.getElementById('mobile-save-indicator');

                if (this.showRestartRequired) {
                    if (desktopIndicator) {
                        desktopIndicator.innerHTML = 'Configuration saved! <strong>Important:</strong> Run <code class="bg-base-300 px-1 rounded">rm -rf .next</code> then restart the app.';
                        desktopIndicator.classList.add('text-warning');
                        desktopIndicator.classList.remove('text-success', 'alert-success', 'hidden');
                    }
                    if (mobileIndicator) {
                        mobileIndicator.textContent = 'Saved! (Restart required)';
                        mobileIndicator.classList.add('text-warning');
                        mobileIndicator.classList.remove('text-success', 'alert-success', 'hidden');
                    }
                } else {
                    if (desktopIndicator) {
                        desktopIndicator.textContent = 'Configuration saved!';
                        desktopIndicator.classList.add('text-success', 'alert-success');
                        desktopIndicator.classList.remove('text-warning', 'hidden');
                    }
                    if (mobileIndicator) {
                        mobileIndicator.textContent = 'Saved!';
                        mobileIndicator.classList.add('text-success', 'alert-success');
                        mobileIndicator.classList.remove('text-warning', 'hidden');
                    }
                }

                setTimeout(() => {
                    if (desktopIndicator) desktopIndicator.classList.add('hidden');
                    if (mobileIndicator) mobileIndicator.classList.add('hidden');
                    this.showRestartRequired = false;
                }, 7000); // Increased to 7 seconds for the longer message
            }

            setupEventListeners() {
                // Prevent duplicate event listener registration
                if (this.listenersInitialized) {
                    console.log('Event listeners already initialized, skipping...');
                    return;
                }
                this.listenersInitialized = true;

                // Save buttons - handle both with better event binding
                const saveHandler = () => this.saveConfig();

                // Function to initialize save buttons
                const initSaveButtons = () => {
                    const saveBtn = document.getElementById('saveAllBtn');
                    const saveBtn2 = document.getElementById('saveAllBtn2');

                    if (saveBtn) {
                        // Remove existing listeners by cloning
                        const newSaveBtn = saveBtn.cloneNode(true);
                        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
                        newSaveBtn.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            saveHandler();
                        });
                    }

                    if (saveBtn2) {
                        // Remove existing listeners by cloning
                        const newSaveBtn2 = saveBtn2.cloneNode(true);
                        saveBtn2.parentNode.replaceChild(newSaveBtn2, saveBtn2);
                        newSaveBtn2.addEventListener('click', function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            saveHandler();
                        });
                        // Also add onclick for redundancy
                        newSaveBtn2.onclick = function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                            saveHandler();
                        };
                        console.log('Save button 2 initialized');
                    }
                };

                // Initialize immediately and with a delay
                initSaveButtons();
                setTimeout(initSaveButtons, 500);

                // MCP System toggle dependency - when MCP System is toggled, also toggle MCP Tools List
                const mcpSystemToggle = document.getElementById('NEXT_PUBLIC_MCP_SYSTEM_ENABLED');
                const mcpToolsListToggle = document.getElementById('NEXT_PUBLIC_MCP_TOOLS_LIST_ENABLED');

                if (mcpSystemToggle && mcpToolsListToggle) {
                    mcpSystemToggle.addEventListener('change', (e) => {
                        const isEnabled = e.target.checked;
                        console.log('[Config] MCP System toggled:', isEnabled);

                        // Update MCP Tools List to match MCP System state
                        mcpToolsListToggle.checked = isEnabled;

                        // Update the config for MCP Tools List
                        this.updateConfig('NEXT_PUBLIC_MCP_TOOLS_LIST_ENABLED', isEnabled);
                        console.log('[Config] MCP Tools List updated to match:', isEnabled);
                    });
                }

                // Handle image generation provider changes
                const imageProviderSelect = document.getElementById('IMAGE_GENERATION_PROVIDER');
                if (imageProviderSelect) {
                    imageProviderSelect.addEventListener('change', (e) => {
                        const provider = e.target.value;
                        console.log('[Config] Image generation provider changed to:', provider);

                        // Update the main provider setting
                        this.updateConfig('IMAGE_GENERATION_PROVIDER', provider);

                        // Update legacy toggles for backward compatibility
                        this.updateConfig('USE_OPENAI_IMAGE', provider === 'openai' ? 'true' : 'false');

                        // Update the hidden legacy checkboxes
                        const useOpenAICheckbox = document.getElementById('USE_OPENAI_IMAGE');
                        if (useOpenAICheckbox) useOpenAICheckbox.checked = provider === 'openai';

                        // Update UI
                        updateImageProviderSettings();
                        this.saveConfig();
                    });
                }

                // Handle video generation provider changes
                const videoProviderSelect = document.getElementById('VIDEO_GENERATION_PROVIDER');
                if (videoProviderSelect) {
                    videoProviderSelect.addEventListener('change', (e) => {
                        const provider = e.target.value;
                        console.log('[Config] Video generation provider changed to:', provider);

                        this.updateConfig('VIDEO_GENERATION_PROVIDER', provider);
                        updateVideoProviderSettings();
                        this.saveConfig();
                    });
                }

                // Handle 3D provider changes (USE_REPLICATE_PROVIDER checkbox)
                const useFal3DCheckbox = document.getElementById('USE_REPLICATE_PROVIDER');
                if (useFal3DCheckbox) {
                    useFal3DCheckbox.addEventListener('change', (e) => {
                        const useFal = e.target.checked;
                        console.log('[Config] 3D provider changed - Use Fal:', useFal);

                        this.updateConfig('USE_REPLICATE_PROVIDER', useFal ? 'true' : 'false');
                        update3DProviderSettings();
                        this.saveConfig();
                    });
                }

                // Media Generation field handlers
                const mediaFields = [
                    'NEXT_PUBLIC_MEDIA_GENERATION_MASTER',
                    'MEDIA_DEFAULT_QUALITY',
                    'OPENAI_IMAGE_MODEL',
                    'FAL_IMAGE_MODEL',
                    'FAL_INFERENCE_STEPS',
                    'FAL_GUIDANCE_SCALE',
                    'REPLICATE_IMAGE_MODEL',
                    'REPLICATE_CUSTOM_IMAGE_MODEL',
                    'FAL_VIDEO_MODEL',
                    'FAL_VIDEO_TEXT_MODEL',
                    'FAL_VIDEO_TEXT_FAST_MODEL',
                    'FAL_VIDEO_IMAGE_MODEL',
                    'FAL_VIDEO_IMAGE_FAST_MODEL',
                    'FAL_VIDEO_DURATION',
                    'FAL_VIDEO_FPS',
                    'FAL_VIDEO_RESOLUTION',
                    'REPLICATE_VIDEO_MODEL',
                    'VIDEO_GENERATION_PROVIDER',
                    '3D_GENERATION_PROVIDER',
                    'FAL_3D_MODEL',
                    'REPLICATE_3D_MODEL',
                    '3D_TEXTURE_SIZE',
                    '3D_MESH_SIMPLIFY',
                    '3D_SAMPLING_STEPS',
                    '3D_OUTPUT_FORMAT',
                    'USE_REPLICATE_PROVIDER'
                ];

                mediaFields.forEach(fieldId => {
                    const field = document.getElementById(fieldId);
                    if (field) {
                        field.addEventListener('change', (e) => {
                            const value = field.type === 'checkbox' ? field.checked : field.value;
                            this.updateConfig(fieldId, value);
                            this.saveConfig();
                        });
                    }
                });

                // Auto-save on field changes
                document.addEventListener('change', (e) => {
                    if (e.target.matches('input, select, textarea')) {
                        // Skip file inputs - they should not be saved to config
                        if (e.target.type === 'file') {
                            return;
                        }

                        // Special handling for deployment mode radio buttons
                        if (e.target.type === 'radio' && e.target.name === 'NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE') {
                            const selectedMode = e.target.value;
                            console.log('[Config] Deployment mode selected:', selectedMode);

                            // Update deployment mode in config
                            this.updateConfig('NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE', selectedMode);

                            console.log('[Config] Updated deployment mode config:', {
                                'NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE': selectedMode
                            });

                            // Trigger auto-save
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveConfig();
                            }, 1000);

                            return; // Early return to skip the rest
                        }

                        // Special handling for aiLogoType radio buttons
                        if (e.target.type === 'radio' && e.target.name === 'aiLogoType') {
                            const selectedType = e.target.value;
                            console.log('[Config] AI Logo Type selected:', selectedType);

                            // Update AI_LOGO_TYPE
                            this.updateConfig('NEXT_PUBLIC_AI_LOGO_TYPE', selectedType);

                            // Update AI_RESPONSE_LOGO_URL based on selection
                            let logoUrl = '';
                            if (selectedType === 'custom') {
                                const customInput = document.getElementById('customAiLogoUrl');
                                logoUrl = customInput ? customInput.value : '';
                            } else {
                                logoUrl = `/logos/defaults/${selectedType}.svg`;
                            }
                            this.updateConfig('NEXT_PUBLIC_AI_RESPONSE_LOGO_URL', logoUrl);

                            // Update backward compatibility flag (no longer using lucide)
                            this.updateConfig('NEXT_PUBLIC_USE_DEFAULT_AI_LOGO', 'false');

                            console.log('[Config] Updated config:', {
                                'NEXT_PUBLIC_AI_LOGO_TYPE': selectedType,
                                'NEXT_PUBLIC_AI_RESPONSE_LOGO_URL': logoUrl
                            });

                            // Trigger auto-save
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveConfig();
                            }, 1000);

                            return; // Early return to skip the rest
                        }

                        // Special handling for voice provider selection
                        if (e.target.id === 'NEXT_PUBLIC_VOICE_PROVIDER') {
                            const provider = e.target.value;
                            const openaiSettings = document.getElementById('openai-tts-settings');
                            const elevenLabsSettings = document.getElementById('elevenlabs-tts-settings');

                            if (provider === 'elevenlabs') {
                                openaiSettings.style.display = 'none';
                                elevenLabsSettings.style.display = 'block';
                            } else {
                                openaiSettings.style.display = 'block';
                                elevenLabsSettings.style.display = 'none';
                            }
                        }

                        // Special handling for AI provider selection
                        if (e.target.id === 'ai-provider-select') {
                            const provider = e.target.value;
                            this.updateConfig('NEXT_PUBLIC_AI_PROVIDER', provider);

                            // Auto-save after 1 second delay
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveConfig();
                            }, 1000);

                            return; // Early return to skip the general handling
                        }

                        // Special handling for token limit configuration
                        if (e.target.id === 'USE_CUSTOM_TOKEN_LIMIT') {
                            const isChecked = e.target.checked;
                            const maxTokensInput = document.getElementById('MAX_COMPLETION_TOKENS');

                            if (!isChecked) {
                                // Remove MAX_COMPLETION_TOKENS from config when disabled
                                delete this.config.MAX_COMPLETION_TOKENS;
                                if (maxTokensInput) {
                                    maxTokensInput.value = '';
                                }
                            }

                            // Continue with normal checkbox handling
                        }

                        if (e.target.id === 'MAX_COMPLETION_TOKENS') {
                            const value = e.target.value;
                            if (value && parseInt(value) > 0) {
                                this.updateConfig('MAX_COMPLETION_TOKENS', value);
                            } else {
                                // Remove from config if empty or invalid
                                delete this.config.MAX_COMPLETION_TOKENS;
                            }

                            // Auto-save after 1 second delay
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveConfig();
                            }, 1000);

                            return;
                        }

                        const key = e.target.id;

                        // Skip RAG prompt fields, template modal fields, translation fields, and admin form fields - they have their own save mechanism
                        if (key === 'RAG_PRE_CONTEXT' || key === 'RAG_POST_CONTEXT' || key === 'templateName' || key === 'templateDescription' || key === 'translationTargetLanguage' || key === 'translationProvider' ||
                            key === 'newAdminEmail' || key === 'new-model-id' || key === 'new-model-name' || key === 'ai-provider-select') {
                            return;
                        }

                        let value = e.target.value;

                        if (e.target.type === 'checkbox') {
                            value = e.target.checked.toString();
                        }

                        // Skip template placeholders or values that look like template syntax
                        if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
                            console.warn(`[Config UI] Skipping template placeholder value for ${key}: ${value}`);
                            return;
                        }

                        // Skip problematic values
                        if (key === 'Context' || value === '{{context}}') {
                            console.warn(`[Config UI] Skipping problematic value for ${key}: ${value}`);
                            return;
                        }

                        if (key) {
                            this.updateConfig(key, value);

                            // No special handling needed for suggestions toggle - it works at runtime

                            // Auto-save after 1 second delay
                            clearTimeout(this.saveTimeout);
                            this.saveTimeout = setTimeout(() => {
                                this.saveConfig();
                            }, 1000);
                        }
                    }
                });

                // Password reveal buttons
                document.addEventListener('click', (e) => {
                    // Check if the clicked element or its parent is a button with data-for
                    const button = e.target.closest('button[data-for]');
                    if (button) {
                        e.preventDefault();
                        e.stopPropagation();
                        const targetId = button.getAttribute('data-for');
                        const input = document.getElementById(targetId);
                        if (input) {
                            const isPassword = input.type === 'password';
                            input.type = isPassword ? 'text' : 'password';
                            button.textContent = isPassword ? '🙈' : '👁️';
                        }
                    }
                });

                // Add event listeners for chat input text size slider
                const chatInputTextSizeSlider = document.getElementById('NEXT_PUBLIC_CHAT_INPUT_TEXT_SIZE');
                const chatInputTextSizeValue = document.getElementById('chatInputTextSizeValue');
                const chatInputPreview = document.getElementById('chatInputPreview');

                if (chatInputTextSizeSlider) {
                    chatInputTextSizeSlider.addEventListener('input', (e) => {
                        const size = e.target.value;
                        if (chatInputTextSizeValue) {
                            chatInputTextSizeValue.textContent = `${size}px`;
                        }
                        if (chatInputPreview) {
                            chatInputPreview.style.fontSize = `${size}px`;
                        }
                    });

                    // Initialize value display and preview
                    const initialSize = chatInputTextSizeSlider.value || '18';
                    if (chatInputTextSizeValue) {
                        chatInputTextSizeValue.textContent = `${initialSize}px`;
                    }
                    if (chatInputPreview) {
                        chatInputPreview.style.fontSize = `${initialSize}px`;
                    }
                }

                // Add event listeners for ElevenLabs sliders to update displayed values
                const speedSlider = document.getElementById('ELEVENLABS_VOICE_SPEED');
                const speedValue = document.getElementById('speed-value');
                if (speedSlider && speedValue) {
                    speedSlider.addEventListener('input', (e) => {
                        speedValue.textContent = `(${e.target.value})`;
                    });
                    // Initialize value display
                    speedValue.textContent = `(${speedSlider.value})`;
                }

                const stabilitySlider = document.getElementById('ELEVENLABS_VOICE_STABILITY');
                const stabilityValue = document.getElementById('stability-value');
                if (stabilitySlider && stabilityValue) {
                    stabilitySlider.addEventListener('input', (e) => {
                        stabilityValue.textContent = `(${e.target.value})`;
                    });
                    // Initialize value display
                    stabilityValue.textContent = `(${stabilitySlider.value})`;
                }

                const similaritySlider = document.getElementById('ELEVENLABS_SIMILARITY_BOOST');
                const similarityValue = document.getElementById('similarity-value');
                if (similaritySlider && similarityValue) {
                    similaritySlider.addEventListener('input', (e) => {
                        similarityValue.textContent = `(${e.target.value})`;
                    });
                    // Initialize value display
                    similarityValue.textContent = `(${similaritySlider.value})`;
                }
            }
        }

        // Update mobile menu active state
        function updateMobileMenuActiveState() {
            const activeTab = document.querySelector('.menu .menu-item.active')?.getAttribute('data-tab') || 'features';
            const mobileMenuItems = document.querySelectorAll('.drawer-panel .menu-item');

            mobileMenuItems.forEach(item => {
                const itemTab = item.getAttribute('data-tab');
                if (itemTab === activeTab) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }

        // Custom Mobile Drawer Implementation
        window.mobileDrawer = {
            element: null,
            isOpen: false,

            init: function () {
                this.element = document.getElementById('mobile-drawer');
                if (!this.element) {
                    console.error('Mobile drawer element not found');
                    return;
                }

                // Add click handler to backdrop
                const backdrop = this.element.querySelector('.drawer-backdrop');
                if (backdrop) {
                    backdrop.addEventListener('click', () => this.close());
                }

                // Add click handlers to menu items
                const menuItems = this.element.querySelectorAll('.menu-item');
                menuItems.forEach(item => {
                    item.addEventListener('click', () => {
                        // Close drawer when menu item is clicked
                        setTimeout(() => this.close(), 100);
                    });
                });

                console.log('Mobile drawer initialized');
            },

            open: function () {
                if (this.element) {
                    this.element.classList.add('open');
                    this.isOpen = true;
                    // Prevent body scrolling when drawer is open
                    document.body.style.overflow = 'hidden';
                    console.log('Drawer opened');
                }
            },

            close: function () {
                if (this.element) {
                    this.element.classList.remove('open');
                    this.isOpen = false;
                    // Restore body scrolling
                    document.body.style.overflow = '';
                    console.log('Drawer closed');
                }
            },

            toggle: function () {
                if (this.isOpen) {
                    this.close();
                } else {
                    this.open();
                }
            }
        };

        // Tab switching functionality
        document.addEventListener('DOMContentLoaded', function () {
            console.log('DOM loaded, initializing config UI');

            // Initialize the custom mobile drawer
            window.mobileDrawer.init();

            // Theme is now restored in the immediate initialization script at the top of the file

            // Function to close drawer
            function closeDrawer() {
                // Use the new custom drawer implementation
                if (window.mobileDrawer) {
                    window.mobileDrawer.close();
                }
            }


            const menuItems = document.querySelectorAll('.menu-item');
            const tabContents = document.querySelectorAll('.tab-content');

            console.log('Found menu items:', menuItems.length);
            console.log('Found tab contents:', tabContents.length);

            // Debug: Log all menu items
            menuItems.forEach((item, index) => {
                console.log(`Menu item ${index}:`, item.textContent, 'data-tab:', item.getAttribute('data-tab'));
            });

            // Function to switch to a tab (shared logic)
            function activateTab(targetTab, updateHash = true) {
                const targetContent = document.getElementById(targetTab);
                if (!targetContent) {
                    console.warn('Tab not found:', targetTab);
                    return false;
                }

                // Remove active class from all menu items
                menuItems.forEach(mi => {
                    mi.classList.remove('active');
                });

                // Update all menu items with the same data-tab
                document.querySelectorAll(`.menu-item[data-tab="${targetTab}"]`).forEach(item => {
                    item.classList.add('active');
                });

                // Hide all tab contents
                tabContents.forEach(tc => tc.classList.remove('active'));

                // Show target tab content
                targetContent.classList.add('active');

                // Update URL hash (without triggering scroll)
                if (updateHash) {
                    history.replaceState(null, null, '#' + targetTab);
                }

                return true;
            }

            menuItems.forEach(item => {
                item.addEventListener('click', function (e) {
                    e.preventDefault();
                    console.log('Menu item clicked:', this.textContent);
                    const targetTab = this.getAttribute('data-tab');
                    console.log('Target tab:', targetTab);

                    if (activateTab(targetTab)) {
                        // Close mobile drawer if open
                        closeDrawer();

                        // Initialize specific tab functionality
                        if (targetTab === 'rag-prompt') {
                            // Initialize System Prompt when tab is opened
                            setTimeout(() => {
                                initSystemPrompt();
                            }, 100); // Small delay to ensure DOM is ready
                        } else if (targetTab === 'admin') {
                            // Initialize Admin Management when tab is opened
                            setTimeout(() => {
                                initAdminManagement();
                            }, 100); // Small delay to ensure DOM is ready
                        } else if (targetTab === 'advanced') {
                            // Initialize MCP Config when tab is opened
                            setTimeout(() => {
                                initMcpConfig();
                            }, 100); // Small delay to ensure DOM is ready
                        } else if (targetTab === 'deployment') {
                            // Initialize Deployment Mode when tab is opened
                            setTimeout(() => {
                                initDeploymentMode();
                            }, 100);
                        } else if (targetTab === 'suggestions') {
                            // Initialize Suggestions Manager when tab is opened
                            setTimeout(() => {
                                suggestionsManager.init();

                                // Initialize translation event listeners
                                const translateBtn = document.getElementById('translateAllBtn');
                                const revertBtn = document.getElementById('revertTranslationBtn');
                                const setDefaultBtn = document.getElementById('setAsDefaultBtn');

                                if (translateBtn && !translateBtn.hasAttribute('data-initialized')) {
                                    translateBtn.setAttribute('data-initialized', 'true');
                                    translateBtn.addEventListener('click', () => {
                                        suggestionsManager.translateAll();
                                    });
                                }

                                if (revertBtn && !revertBtn.hasAttribute('data-initialized')) {
                                    revertBtn.setAttribute('data-initialized', 'true');
                                    revertBtn.addEventListener('click', () => {
                                        suggestionsManager.revertTranslation();
                                    });
                                }

                                if (setDefaultBtn && !setDefaultBtn.hasAttribute('data-initialized')) {
                                    setDefaultBtn.setAttribute('data-initialized', 'true');
                                    setDefaultBtn.addEventListener('click', () => {
                                        suggestionsManager.setAsDefault();
                                    });
                                }

                                const resetBtn = document.getElementById('resetToDefaultsBtn');
                                if (resetBtn && !resetBtn.hasAttribute('data-initialized')) {
                                    resetBtn.setAttribute('data-initialized', 'true');
                                    resetBtn.addEventListener('click', () => {
                                        suggestionsManager.resetToDefaults();
                                    });
                                }
                            }, 100); // Small delay to ensure DOM is ready
                        } else if (targetTab === 'document-processing') {
                            // Initialize Document Manager and load workspaces when tab is opened
                            setTimeout(() => {
                                if (window.documentManager) {
                                    window.documentManager.init();
                                }
                                if (window.documentProcessor) {
                                    window.documentProcessor.loadWorkspaces();
                                }
                            }, 100); // Small delay to ensure DOM is ready
                        } else if (targetTab === 'whatsapp') {
                            // Initialize WhatsApp configuration when tab is opened
                            setTimeout(() => {
                                initWhatsAppConfig();
                                // Add event listener for provider toggle
                                const providerSelect = document.getElementById('whatsapp-provider');
                                if (providerSelect) {
                                    providerSelect.removeEventListener('change', toggleWhatsAppProvider);
                                    providerSelect.addEventListener('change', toggleWhatsAppProvider);
                                }
                            }, 100); // Small delay to ensure DOM is ready
                        }
                    }
                });
            });

            // Handle browser back/forward navigation for hash changes
            window.addEventListener('hashchange', function () {
                const hash = window.location.hash.slice(1);
                if (hash) {
                    activateTab(hash, false);
                }
            });

            // Restore tab from URL hash on page load
            const initialHash = window.location.hash.slice(1);
            if (initialHash) {
                console.log('Restoring tab from URL hash:', initialHash);
                if (activateTab(initialHash, false)) {
                    // Initialize tab-specific functionality if needed
                    if (initialHash === 'rag-prompt') {
                        setTimeout(() => initSystemPrompt(), 100);
                    } else if (initialHash === 'admin') {
                        setTimeout(() => initAdminManagement(), 100);
                    } else if (initialHash === 'advanced') {
                        setTimeout(() => initMcpConfig(), 100);
                    } else if (initialHash === 'deployment') {
                        setTimeout(() => initDeploymentMode(), 100);
                    } else if (initialHash === 'suggestions') {
                        setTimeout(() => suggestionsManager.init(), 100);
                    } else if (initialHash === 'document-processing') {
                        setTimeout(() => {
                            if (window.documentManager) window.documentManager.init();
                            if (window.documentProcessor) window.documentProcessor.loadWorkspaces();
                        }, 100);
                    } else if (initialHash === 'connectors') {
                        setTimeout(() => {
                            if (window.connectorsConfig && typeof window.connectorsConfig.loadConfiguration === 'function') {
                                window.connectorsConfig.loadConfiguration();
                            }
                        }, 100);
                    } else if (initialHash === 'whatsapp') {
                        setTimeout(() => initWhatsAppConfig(), 100);
                    }
                }
            }

            // Clean up early tab style (was used to prevent flash before DOMContentLoaded)
            const earlyStyle = document.getElementById('early-tab-style');
            if (earlyStyle) {
                earlyStyle.remove();
            }

            // Theme toggle and save config are now handled by the event delegation system at the top of the file

            // Initialize config manager
            window.configManager = new ConfigManager();
            window.configManager.init();  // Initialize to load config and set up event listeners

            // Initialize MCP Config Manager if available
            if (typeof McpConfigManager !== 'undefined') {
                window.mcpManager = new McpConfigManager();
            }

            // Initialize Admin Manager
            window.adminManager = {
                async listAdmins() {
                    this.showResult('Loading admin list...');
                    try {
                        const response = await fetch('/api/admin/list');
                        const data = await response.json();
                        this.showResult(`Found ${data.admins?.length || 0} admin users: ${JSON.stringify(data, null, 2)}`);
                    } catch (error) {
                        this.showResult(`Error: ${error.message}`);
                    }
                },

                async setupAdmin() {
                    this.showResult('Setting up admin...');
                    try {
                        const email = document.getElementById('ADMIN_EMAIL').value;
                        const password = document.getElementById('ADMIN_PASSWORD').value;

                        if (!email || !password) {
                            this.showResult('Please enter admin email and password first.');
                            return;
                        }

                        const response = await fetch('/api/admin/setup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password })
                        });

                        const data = await response.json();
                        this.showResult(JSON.stringify(data, null, 2));
                    } catch (error) {
                        this.showResult(`Error: ${error.message}`);
                    }
                },

                async checkAdmin() {
                    this.showResult('Checking admin status...');
                    try {
                        const email = document.getElementById('ADMIN_EMAIL').value;

                        if (!email) {
                            this.showResult('Please enter admin email first.');
                            return;
                        }

                        const response = await fetch(`/api/admin/check?email=${encodeURIComponent(email)}`);
                        const data = await response.json();
                        this.showResult(JSON.stringify(data, null, 2));
                    } catch (error) {
                        this.showResult(`Error: ${error.message}`);
                    }
                },

                showResult(message) {
                    const resultDiv = document.getElementById('adminActionResult');
                    resultDiv.textContent = message;
                    resultDiv.classList.remove('hidden');
                }
            };

            // Embed Widget Functions
            window.embedManager = {
                copyToClipboard: function (text) {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(function () {
                            console.log('Copied to clipboard');
                        }).catch(function (err) {
                            console.error('Failed to copy: ', err);
                        });
                    }
                },

                updateEmbedCodes: function () {
                    var siteUrl = 'https://your-domain.com';
                    var siteUrlInput = document.getElementById('NEXT_PUBLIC_SITE_URL');
                    if (siteUrlInput && siteUrlInput.value) {
                        siteUrl = siteUrlInput.value;
                        // Remove trailing slash to prevent double slashes in URLs
                        siteUrl = siteUrl.replace(/\/$/, '');
                    }

                    // Get current configuration values
                    var primaryColor = document.getElementById('NEXT_PUBLIC_EMBED_PRIMARY_COLOR')?.value || '#FF6417';
                    var title = document.getElementById('NEXT_PUBLIC_EMBED_TITLE')?.value || 'ChatRAG Assistant';
                    var position = document.getElementById('NEXT_PUBLIC_EMBED_POSITION')?.value || 'bottom-right';
                    var greeting = document.getElementById('NEXT_PUBLIC_EMBED_GREETING')?.value || 'Hello! Development help you today?';
                    var model = document.getElementById('NEXT_PUBLIC_EMBED_MODEL')?.value || 'openai/gpt-4o-mini';

                    // Update script code with data attributes
                    var scriptCode = '<script \n  src="' + siteUrl + '/embed/chat.js"\n';
                    if (primaryColor !== '#FF6417') {
                        scriptCode += '  data-primary-color="' + primaryColor + '"\n';
                    }
                    if (title !== 'ChatRAG Assistant') {
                        scriptCode += '  data-title="' + encodeURIComponent(title) + '"\n';
                    }
                    if (position !== 'bottom-right') {
                        scriptCode += '  data-position="' + position + '"\n';
                    }
                    if (greeting !== 'Hello! Development help you today?') {
                        scriptCode += '  data-greeting="' + encodeURIComponent(greeting) + '"\n';
                    }
                    if (model !== 'openai/gpt-4o-mini') {
                        scriptCode += '  data-model="' + model + '"\n';
                    }
                    scriptCode += '><\/script>';

                    var scriptElement = document.getElementById('embedScriptCode');
                    if (scriptElement) {
                        scriptElement.textContent = scriptCode;
                    }

                    // Generate React/Next.js code
                    var reactCode = '<script\n  id="chatrag-embed"\n  dangerouslySetInnerHTML={{ __html: `\n';
                    reactCode += '    (function(){\n';
                    reactCode += '      var s = document.createElement(\'script\');\n';
                    reactCode += '      s.src = \'' + siteUrl + '/embed/chat.js\';\n';
                    reactCode += '      s.async = true;\n';
                    if (primaryColor !== '#FF6417') {
                        reactCode += '      s.setAttribute(\'data-primary-color\', \'' + primaryColor + '\');\n';
                    }
                    if (title !== 'ChatRAG Assistant') {
                        reactCode += '      s.setAttribute(\'data-title\', \'' + title.replace(/'/g, "\\'") + '\');\n';
                    }
                    if (position !== 'bottom-right') {
                        reactCode += '      s.setAttribute(\'data-position\', \'' + position + '\');\n';
                    }
                    if (greeting !== 'Hello! Development help you today?') {
                        reactCode += '      s.setAttribute(\'data-greeting\', \'' + greeting.replace(/'/g, "\\'") + '\');\n';
                    }
                    if (model !== 'openai/gpt-4o-mini') {
                        reactCode += '      s.setAttribute(\'data-model\', \'' + model + '\');\n';
                    }
                    reactCode += '      document.body.appendChild(s);\n';
                    reactCode += '    })();\n';
                    reactCode += '  ` }}\n';
                    reactCode += '/>';

                    var reactElement = document.getElementById('embedReactCode');
                    if (reactElement) {
                        reactElement.textContent = reactCode;
                    }
                }
            };

            // Suggestions Manager Functions
            window.suggestionsManager = {
                suggestionGroups: [],
                englishOriginal: null,
                customDefault: null,
                defaultLanguage: 'English',
                currentLanguage: 'English',

                init: function () {
                    console.log('Initializing suggestions manager...');
                    this.loadSuggestionGroups();
                },

                loadSuggestionGroups: function () {
                    console.log('Loading suggestion groups...');
                    const configValue = configManager.config.NEXT_PUBLIC_SUGGESTION_GROUPS || '';

                    // Default English suggestion groups
                    const defaultEnglishGroups = [
                        {
                            id: 'pricing-ownership',
                            label: 'Pricing & Ownership',
                            icon: 'DollarSign',
                            items: [
                                { text: 'How much does ChatRAG cost?' },
                                { text: 'How many chatbots can I create?' },
                                { text: 'Do I own the code forever?' },
                                { text: 'Can I use ChatRAG for client projects?' }
                            ]
                        },
                        {
                            id: 'technical-foundation',
                            label: 'Technical Foundation',
                            icon: 'Database',
                            items: [
                                { text: 'What vector database does ChatRAG use?' },
                                { text: 'How does ChatRAG parse documents?' },
                                { text: 'What AI models does ChatRAG support?' },
                                { text: 'How fast is the vector search?' }
                            ]
                        },
                        {
                            id: 'chatrag-vs-others',
                            label: 'ChatRAG vs Others',
                            icon: 'BarChart',
                            items: [
                                { text: 'How does ChatRAG compare to Chatbase?' },
                                { text: 'Why choose ChatRAG over building from scratch?' },
                                { text: 'Who created ChatRAG?' },
                                { text: 'What features does ChatRAG have that competitors don\'t?' }
                            ]
                        },
                        {
                            id: 'key-features',
                            label: 'Key Features',
                            icon: 'Rocket',
                            items: [
                                { text: 'How can I install ChatRAG?' },
                                { text: 'How can I deploy ChatRAG to Vercel?' },
                                { text: 'Does ChatRAG support WhatsApp?' },
                                { text: 'Can I monetize chatbots with Stripe?' }
                            ]
                        }
                    ];

                    if (configValue) {
                        try {
                            const parsedConfig = JSON.parse(configValue);

                            // Check if it's the new format with metadata
                            if (parsedConfig.groups && parsedConfig.defaultLanguage !== undefined) {
                                // New format
                                this.suggestionGroups = parsedConfig.groups || [];
                                this.defaultLanguage = parsedConfig.defaultLanguage || 'English';
                                this.englishOriginal = parsedConfig.englishOriginal || defaultEnglishGroups;
                                this.customDefault = parsedConfig.customDefault || null;
                                this.currentLanguage = parsedConfig.currentLanguage || this.defaultLanguage;

                                // Update UI to show default language
                                this.updateDefaultLanguageDisplay();
                            } else {
                                // Old format - migrate to new format
                                this.suggestionGroups = parsedConfig.groups || parsedConfig || [];
                                this.englishOriginal = defaultEnglishGroups;
                                this.defaultLanguage = 'English';
                                this.currentLanguage = 'English';
                                this.customDefault = null;
                            }

                            console.log('Loaded suggestion groups:', this.suggestionGroups);
                            console.log('Default language:', this.defaultLanguage);
                        } catch (error) {
                            console.error('Error parsing NEXT_PUBLIC_SUGGESTION_GROUPS:', error);
                            this.suggestionGroups = defaultEnglishGroups;
                            this.englishOriginal = defaultEnglishGroups;
                            this.defaultLanguage = 'English';
                            this.currentLanguage = 'English';
                        }
                    } else {
                        // No config - use defaults
                        this.suggestionGroups = defaultEnglishGroups;
                        this.englishOriginal = defaultEnglishGroups;
                        this.defaultLanguage = 'English';
                        this.currentLanguage = 'English';
                    }

                    this.renderGroups();
                    this.updateButtonStates();
                },

                renderGroups: function () {
                    const container = document.getElementById('suggestionGroupsList');
                    if (!container) return;

                    container.innerHTML = '';

                    if (this.suggestionGroups.length === 0) {
                        container.innerHTML = `
                            <div class="text-center text-base-content/60 py-8">
                                <p>No suggestion groups configured.</p>
                                <button class="btn btn-primary btn-sm mt-4" onclick="suggestionsManager.addGroup()">
                                    Add First Group
                                </button>
                            </div>
                        `;
                        return;
                    }

                    this.suggestionGroups.forEach((group, index) => {
                        const groupEl = document.createElement('div');
                        groupEl.className = 'card bg-base-100 shadow-sm mb-4';
                        groupEl.innerHTML = `
                            <div class="card-body">
                                <div class="flex justify-between items-start mb-4">
                                    <div class="flex items-center gap-3">
                                        <div class="flex items-center justify-center w-10 h-10 text-base-content/70">
                                            ${this.getIconEmoji(group.icon)}
                                        </div>
                                        <div>
                                            <input type="text" class="font-semibold bg-transparent border-b border-transparent hover:border-base-300 focus:border-primary px-1" 
                                                   value="${group.label}" 
                                                   onchange="suggestionsManager.updateGroupLabel(${index}, this.value)"
                                                   placeholder="Group Label">
                                            <div class="text-sm text-base-content/60 mt-1">
                                                Icon: 
                                                <div class="dropdown dropdown-bottom">
                                                    <button type="button" tabindex="0" class="btn btn-xs gap-4" onclick="event.stopPropagation()">
                                                        <span class="w-4 h-4">${this.getIconEmoji(group.icon)}</span>
                                                        <span>${group.icon}</span>
                                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                                                        </svg>
                                                    </button>
                                                    <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 z-50">
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'DollarSign'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('DollarSign')}</span><span>DollarSign</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Database'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Database')}</span><span>Database</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'BarChart'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('BarChart')}</span><span>BarChart</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Rocket'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Rocket')}</span><span>Rocket</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'FileText'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('FileText')}</span><span>FileText</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'ListTodo'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('ListTodo')}</span><span>ListTodo</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Globe'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Globe')}</span><span>Globe</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Paintbrush'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Paintbrush')}</span><span>Paintbrush</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Search'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Search')}</span><span>Search</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Heart'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Heart')}</span><span>Heart</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'Star'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('Star')}</span><span>Star</span></a></li>
                                                        <li><a href="#" onclick="event.preventDefault(); suggestionsManager.updateGroupIcon(${index}, 'MessageCircle'); document.activeElement.blur();" class="flex items-center gap-4"><span class="w-4 h-4">${this.getIconEmoji('MessageCircle')}</span><span>MessageCircle</span></a></li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button class="btn btn-ghost btn-sm text-error" onclick="suggestionsManager.removeGroup(${index})">
                                        Remove
                                    </button>
                                </div>
                                
                                <div class="space-y-2">
                                    <div class="text-sm font-medium text-base-content/70">Suggestion Items:</div>
                                    ${(group.items || []).map((item, itemIndex) => `
                                        <div class="flex items-center gap-2">
                                            <span class="text-base-content/50">•</span>
                                            <input type="text" class="input input-sm input-bordered flex-1" 
                                                   value="${item.text}" 
                                                   onchange="suggestionsManager.updateItem(${index}, ${itemIndex}, this.value)"
                                                   placeholder="Suggestion text">
                                            <button class="btn btn-ghost btn-xs text-error" onclick="suggestionsManager.removeItem(${index}, ${itemIndex})">
                                                ✕
                                            </button>
                                        </div>
                                    `).join('')}
                                    
                                    <button class="btn btn-outline btn-xs btn-primary mt-2" onclick="suggestionsManager.addItem(${index})">
                                        + Add Item
                                    </button>
                                </div>
                            </div>
                        `;
                        container.appendChild(groupEl);
                    });

                    // Add button for new group
                    const addBtn = document.createElement('div');
                    addBtn.className = 'text-center mt-4';
                    addBtn.innerHTML = `
                        <button class="btn btn-primary btn-sm" onclick="suggestionsManager.addGroup()">
                            + Add New Group
                        </button>
                    `;
                    container.appendChild(addBtn);
                },

                getIconEmoji: function (icon) {
                    // Return SVG icons that match the Lucide React icons used in ChatRAG
                    const iconMap = {
                        'DollarSign': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>',
                        'Database': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>',
                        'BarChart': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>',
                        'Rocket': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>',
                        'FileText': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',
                        'ListTodo': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"></rect><path d="m3 17 2 2 4-4"></path><path d="M13 6h8"></path><path d="M13 12h8"></path><path d="M13 18h8"></path></svg>',
                        'Globe': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
                        'Paintbrush': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.37 2.63 14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3Z"></path><path d="M9 8c-2 3-4 3.5-7 4l8 10c2-1 6-5 6-7"></path><path d="M14.5 17.5 4.5 15"></path></svg>',
                        'Search': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>',
                        'Heart': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
                        'Star': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
                        'MessageCircle': '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
                    };
                    return iconMap[icon] || iconMap['FileText'];
                },

                addGroup: function () {
                    const newGroup = {
                        id: `group-${Date.now()}`,
                        label: 'New Group',
                        icon: 'DollarSign',
                        items: [
                            { text: 'Sample suggestion' }
                        ]
                    };
                    this.suggestionGroups.push(newGroup);
                    this.renderGroups();
                    this.saveGroups();
                },

                removeGroup: function (index) {
                    if (confirm('Are you sure you want to remove this suggestion group?')) {
                        this.suggestionGroups.splice(index, 1);
                        this.renderGroups();
                        this.saveGroups();
                    }
                },

                updateGroupLabel: function (index, value) {
                    this.suggestionGroups[index].label = value;
                    this.saveGroups();
                },

                updateGroupIcon: function (index, value) {
                    this.suggestionGroups[index].icon = value;
                    this.renderGroups();
                    this.saveGroups();
                },

                addItem: function (groupIndex) {
                    if (!this.suggestionGroups[groupIndex].items) {
                        this.suggestionGroups[groupIndex].items = [];
                    }
                    this.suggestionGroups[groupIndex].items.push({ text: '' });
                    this.renderGroups();
                    this.saveGroups();
                },

                removeItem: function (groupIndex, itemIndex) {
                    this.suggestionGroups[groupIndex].items.splice(itemIndex, 1);
                    this.renderGroups();
                    this.saveGroups();
                },

                updateItem: function (groupIndex, itemIndex, value) {
                    this.suggestionGroups[groupIndex].items[itemIndex].text = value;
                    this.saveGroups();
                },

                saveGroups: function () {
                    // Save the complete structure with metadata
                    const config = {
                        groups: this.suggestionGroups,
                        defaultLanguage: this.defaultLanguage,
                        currentLanguage: this.currentLanguage,
                        englishOriginal: this.englishOriginal,
                        customDefault: this.customDefault
                    };
                    const jsonStr = JSON.stringify(config);
                    configManager.updateConfig('NEXT_PUBLIC_SUGGESTION_GROUPS', jsonStr);

                    // Trigger auto-save
                    clearTimeout(configManager.saveTimeout);
                    configManager.saveTimeout = setTimeout(() => {
                        configManager.saveConfig();
                    }, 1000);
                },

                // Translation functionality
                translateAll: async function () {
                    const targetLanguage = document.getElementById('translationTargetLanguage').value.trim();
                    const provider = document.getElementById('translationProvider').value;

                    if (!targetLanguage) {
                        this.showTranslationStatus('Please enter a target language', 'error');
                        return;
                    }

                    // Ensure we have the English original stored before first translation
                    if (!this.englishOriginal) {
                        // Store current groups as English original if we don't have one yet
                        this.englishOriginal = JSON.parse(JSON.stringify(this.suggestionGroups));
                    }

                    // Collect all texts to translate
                    const textsToTranslate = [];
                    this.suggestionGroups.forEach(group => {
                        textsToTranslate.push(group.label);
                        if (group.items) {
                            group.items.forEach(item => {
                                textsToTranslate.push(item.text);
                            });
                        }
                    });

                    if (textsToTranslate.length === 0) {
                        this.showTranslationStatus('No texts to translate', 'error');
                        return;
                    }

                    // Show loading state
                    const translateBtn = document.getElementById('translateAllBtn');
                    const originalBtnText = translateBtn.innerHTML;
                    translateBtn.disabled = true;
                    translateBtn.innerHTML = '<span class="loading loading-spinner"></span> Translating...';
                    this.showTranslationStatus(`Translating ${textsToTranslate.length} texts to ${targetLanguage}...`, 'info');

                    try {
                        // Call translation API
                        const response = await fetch('/api/translate', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                targetLanguage,
                                texts: textsToTranslate,
                                provider
                            })
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(result.error || 'Translation failed');
                        }

                        // Map translations back to groups
                        let textIndex = 0;
                        this.suggestionGroups.forEach(group => {
                            group.label = result.translations[textIndex++];
                            if (group.items) {
                                group.items.forEach(item => {
                                    item.text = result.translations[textIndex++];
                                });
                            }
                        });

                        // Update UI and save
                        this.currentLanguage = targetLanguage;
                        this.renderGroups();
                        this.saveGroups();

                        // Update button states
                        this.updateButtonStates();

                        this.showTranslationStatus(`Successfully translated to ${targetLanguage}!`, 'success');

                    } catch (error) {
                        console.error('Translation error:', error);
                        this.showTranslationStatus(error.message || 'Translation failed', 'error');
                    } finally {
                        // Restore button state
                        translateBtn.disabled = false;
                        translateBtn.innerHTML = originalBtnText;
                    }
                },

                revertTranslation: function () {
                    // Determine what to revert to
                    let revertGroups;
                    let revertLanguage;

                    if (this.defaultLanguage === 'English') {
                        // Revert to English original
                        if (!this.englishOriginal) {
                            this.showTranslationStatus('No English original text found', 'error');
                            return;
                        }
                        revertGroups = this.englishOriginal;
                        revertLanguage = 'English';
                    } else {
                        // Revert to custom default
                        if (!this.customDefault) {
                            // Fallback to English if custom default is missing
                            if (!this.englishOriginal) {
                                this.showTranslationStatus('No default text to revert to', 'error');
                                return;
                            }
                            revertGroups = this.englishOriginal;
                            revertLanguage = 'English';
                        } else {
                            revertGroups = this.customDefault;
                            revertLanguage = this.defaultLanguage;
                        }
                    }

                    // Restore groups
                    this.suggestionGroups = JSON.parse(JSON.stringify(revertGroups));
                    this.currentLanguage = revertLanguage;

                    // Update UI and save
                    this.renderGroups();
                    this.saveGroups();
                    this.updateButtonStates();

                    // Clear translation input if reverting to default
                    if (this.currentLanguage === this.defaultLanguage) {
                        document.getElementById('translationTargetLanguage').value = '';
                    }

                    this.showTranslationStatus(`Reverted to ${revertLanguage}`, 'success');
                },

                showTranslationStatus: function (message, type = 'info') {
                    const statusDiv = document.getElementById('translationStatus');
                    const statusText = document.getElementById('translationStatusText');
                    const alertDiv = statusDiv.querySelector('.alert');

                    // Update message
                    statusText.textContent = message;

                    // Update alert class based on type
                    alertDiv.className = 'alert';
                    switch (type) {
                        case 'success':
                            alertDiv.classList.add('alert-success');
                            break;
                        case 'error':
                            alertDiv.classList.add('alert-error');
                            break;
                        default:
                            alertDiv.classList.add('alert-info');
                    }

                    // Show status
                    statusDiv.classList.remove('hidden');

                    // Auto-hide after 5 seconds for success/info
                    if (type !== 'error') {
                        setTimeout(() => {
                            statusDiv.classList.add('hidden');
                        }, 5000);
                    }
                },

                setAsDefault: function () {
                    if (this.currentLanguage === 'English') {
                        this.showTranslationStatus('Current language is already English (the original default)', 'info');
                        return;
                    }

                    // Save current groups as custom default
                    this.customDefault = JSON.parse(JSON.stringify(this.suggestionGroups));
                    this.defaultLanguage = this.currentLanguage;

                    // Save to config
                    this.saveGroups();

                    // Update UI
                    this.updateDefaultLanguageDisplay();
                    this.updateButtonStates();

                    this.showTranslationStatus(`${this.currentLanguage} is now set as the default language!`, 'success');
                },

                updateDefaultLanguageDisplay: function () {
                    const defaultLangText = document.getElementById('defaultLanguageText');
                    if (defaultLangText) {
                        defaultLangText.textContent = this.defaultLanguage;
                    }

                    // Update revert button text
                    const revertBtnText = document.getElementById('revertBtnText');
                    if (revertBtnText) {
                        revertBtnText.textContent = `Revert to ${this.defaultLanguage}`;
                    }
                },

                updateButtonStates: function () {
                    const setDefaultBtn = document.getElementById('setAsDefaultBtn');
                    const revertBtn = document.getElementById('revertTranslationBtn');

                    if (setDefaultBtn) {
                        // Enable "Set as Default" only if current language is different from default
                        // and we're not already on English (which is always the base default)
                        setDefaultBtn.disabled = this.currentLanguage === this.defaultLanguage ||
                            this.currentLanguage === 'English';
                    }

                    if (revertBtn) {
                        // Enable revert if current language is different from default
                        revertBtn.disabled = this.currentLanguage === this.defaultLanguage;
                    }
                },

                resetToDefaults: function () {
                    if (!confirm('This will reset all suggestions to the original English defaults. Are you sure?')) {
                        return;
                    }

                    // Hardcoded default English suggestion groups
                    const defaultEnglishGroups = [
                        {
                            id: 'pricing-ownership',
                            label: 'Pricing & Ownership',
                            icon: 'DollarSign',
                            items: [
                                { text: 'How much does ChatRAG cost?' },
                                { text: 'How many chatbots can I create?' },
                                { text: 'Do I own the code forever?' },
                                { text: 'Can I use ChatRAG for client projects?' }
                            ]
                        },
                        {
                            id: 'technical-foundation',
                            label: 'Technical Foundation',
                            icon: 'Database',
                            items: [
                                { text: 'What vector database does ChatRAG use?' },
                                { text: 'How does ChatRAG parse documents?' },
                                { text: 'What AI models does ChatRAG support?' },
                                { text: 'How fast is the vector search?' }
                            ]
                        },
                        {
                            id: 'chatrag-vs-others',
                            label: 'ChatRAG vs Others',
                            icon: 'BarChart',
                            items: [
                                { text: 'How does ChatRAG compare to Chatbase?' },
                                { text: 'Why choose ChatRAG over building from scratch?' },
                                { text: 'Who created ChatRAG?' },
                                { text: 'What features does ChatRAG have that competitors don\'t?' }
                            ]
                        },
                        {
                            id: 'key-features',
                            label: 'Key Features',
                            icon: 'Rocket',
                            items: [
                                { text: 'How can I install ChatRAG?' },
                                { text: 'How can I deploy ChatRAG to Vercel?' },
                                { text: 'Does ChatRAG support WhatsApp?' },
                                { text: 'Can I monetize chatbots with Stripe?' }
                            ]
                        }
                    ];

                    // Reset everything to defaults
                    this.suggestionGroups = JSON.parse(JSON.stringify(defaultEnglishGroups));
                    this.englishOriginal = JSON.parse(JSON.stringify(defaultEnglishGroups));
                    this.customDefault = null;
                    this.defaultLanguage = 'English';
                    this.currentLanguage = 'English';

                    // Update UI and save
                    this.renderGroups();
                    this.saveGroups();
                    this.updateDefaultLanguageDisplay();
                    this.updateButtonStates();

                    // Clear translation input
                    document.getElementById('translationTargetLanguage').value = '';

                    this.showTranslationStatus('Reset to original English defaults!', 'success');
                }
            };

            // Copy button event listeners
            var copyScriptBtn = document.getElementById('copyScriptBtn');
            if (copyScriptBtn) {
                copyScriptBtn.addEventListener('click', function () {
                    var code = document.getElementById('embedScriptCode');
                    if (code && embedManager.copyToClipboard) {
                        embedManager.copyToClipboard(code.textContent);
                    }
                });
            }

            var copyReactBtn = document.getElementById('copyReactBtn');
            if (copyReactBtn) {
                copyReactBtn.addEventListener('click', function () {
                    var code = document.getElementById('embedReactCode');
                    if (code && embedManager.copyToClipboard) {
                        embedManager.copyToClipboard(code.textContent);
                    }
                });
            }

            // Update embed codes when site URL changes
            var siteUrlInput = document.getElementById('NEXT_PUBLIC_SITE_URL');
            if (siteUrlInput) {
                siteUrlInput.addEventListener('input', function () {
                    if (embedManager.updateEmbedCodes) {
                        embedManager.updateEmbedCodes();
                    }
                });
            }

            // Update embed codes when model changes
            var modelSelect = document.getElementById('NEXT_PUBLIC_EMBED_MODEL');
            if (modelSelect) {
                modelSelect.addEventListener('change', function () {
                    if (embedManager.updateEmbedCodes) {
                        embedManager.updateEmbedCodes();
                    }
                });
            }

            // Initialize embed codes
            if (embedManager.updateEmbedCodes) {
                embedManager.updateEmbedCodes();
            }

            // Handle branding logo type switching
            const logoTypeSelect = document.getElementById('NEXT_PUBLIC_HEADER_LOGO_TYPE');
            const textGroup = document.getElementById('headerLogoTextGroup');
            const urlGroup = document.getElementById('headerLogoUrlGroup');

            function updateLogoFields() {
                const logoType = logoTypeSelect.value;
                if (logoType === 'text') {
                    textGroup.classList.remove('hidden');
                    urlGroup.classList.add('hidden');
                } else {
                    textGroup.classList.add('hidden');
                    urlGroup.classList.remove('hidden');
                }
            }

            if (logoTypeSelect) {
                logoTypeSelect.addEventListener('change', updateLogoFields);
                // Initialize on page load
                updateLogoFields();
            }

            // Handle file uploads for logos
            const headerLogoFile = document.getElementById('headerLogoFile');
            const aiLogoFile = document.getElementById('aiLogoFile');

            if (headerLogoFile) {
                headerLogoFile.addEventListener('change', function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            const headerLogoUrl = document.getElementById('NEXT_PUBLIC_HEADER_LOGO_URL');
                            if (headerLogoUrl) {
                                headerLogoUrl.value = e.target.result;
                                // Trigger config update
                                headerLogoUrl.dispatchEvent(new Event('change'));
                            }
                        };
                        reader.readAsDataURL(file);
                    }
                });
            }

            if (aiLogoFile) {
                aiLogoFile.addEventListener('change', async function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        // Upload file to server instead of just converting to base64
                        const formData = new FormData();
                        formData.append('logoFile', file);
                        formData.append('type', 'ai');

                        try {
                            console.log('[AI Logo] Uploading file to server:', file.name);
                            const response = await fetch('/api/config/upload-logo', {
                                method: 'POST',
                                body: formData
                            });

                            const result = await response.json();

                            if (result.success && result.filePath) {
                                console.log('[AI Logo] File uploaded successfully:', result.filePath);
                                const customAiLogoUrl = document.getElementById('customAiLogoUrl');
                                const aiLogoUrl = document.getElementById('NEXT_PUBLIC_AI_RESPONSE_LOGO_URL');

                                if (customAiLogoUrl && aiLogoUrl) {
                                    // Set the file path in DOM elements
                                    customAiLogoUrl.value = result.filePath;
                                    aiLogoUrl.value = result.filePath;
                                }

                                // CRITICAL: Update the configManager to persist to .env.local
                                if (window.configManager) {
                                    console.log('[AI Logo] Updating configManager with path:', result.filePath);
                                    window.configManager.updateConfig('NEXT_PUBLIC_AI_RESPONSE_LOGO_URL', result.filePath);
                                    window.configManager.updateConfig('NEXT_PUBLIC_AI_LOGO_TYPE', 'custom');
                                    window.configManager.updateConfig('NEXT_PUBLIC_USE_DEFAULT_AI_LOGO', 'false');
                                    // Auto-save the config
                                    await window.configManager.saveConfig();
                                    console.log('[AI Logo] Config saved successfully');
                                }

                                // Show success notification
                                if (typeof showToast === 'function') {
                                    showToast('AI logo uploaded and saved!', 'success');
                                }
                            } else {
                                console.error('[AI Logo] Upload failed:', result.error);
                                alert('Failed to upload logo: ' + (result.error || 'Unknown error'));
                            }
                        } catch (error) {
                            console.error('[AI Logo] Upload error:', error);
                            alert('Error uploading logo: ' + error.message);
                        }
                    }
                });
            }

            // Handle AI Logo Type Radio Buttons  
            const customAiLogoGroup = document.getElementById('customAiLogoGroup');
            const aiLogoTypeRadios = document.querySelectorAll('input[name="aiLogoType"]');

            // Handle showing/hiding the custom logo group and update hidden inputs
            const aiLogoTypeInput = document.getElementById('NEXT_PUBLIC_AI_LOGO_TYPE');
            const aiLogoUrlInput = document.getElementById('NEXT_PUBLIC_AI_RESPONSE_LOGO_URL');
            const customAiLogoUrlInput = document.getElementById('customAiLogoUrl');

            aiLogoTypeRadios.forEach(radio => {
                radio.addEventListener('change', function () {
                    const selectedType = this.value;

                    // Show/hide custom logo upload
                    if (customAiLogoGroup) {
                        if (selectedType === 'custom') {
                            customAiLogoGroup.classList.remove('hidden');
                        } else {
                            customAiLogoGroup.classList.add('hidden');
                        }
                    }

                    // Update hidden inputs to match
                    if (aiLogoTypeInput) {
                        aiLogoTypeInput.value = selectedType;
                    }

                    if (aiLogoUrlInput) {
                        if (selectedType === 'custom') {
                            aiLogoUrlInput.value = customAiLogoUrlInput ? customAiLogoUrlInput.value : '';
                        } else {
                            aiLogoUrlInput.value = `/logos/defaults/${selectedType}.svg`;
                        }
                    }
                });
            });

            // Handle custom logo URL input changes
            if (customAiLogoUrlInput) {
                customAiLogoUrlInput.addEventListener('input', function () {
                    if (aiLogoUrlInput) {
                        aiLogoUrlInput.value = this.value;
                    }
                });
            }

            // Handle Welcome Text Customization
            const welcomeTextInput = document.getElementById('NEXT_PUBLIC_WELCOME_TEXT');
            const welcomeTextGradient = document.getElementById('NEXT_PUBLIC_WELCOME_TEXT_GRADIENT');
            const welcomeTextPreview = document.getElementById('welcomeTextPreview');
            // Note: resetWelcomeTextBtn doesn't exist - using resetWelcomeMessagesBtn for both modes
            const translateWelcomeTextBtn = document.getElementById('translateWelcomeTextBtn');
            const welcomeTextModeIndicator = document.getElementById('welcomeTextModeIndicator');
            const welcomeTextTranslationStatus = document.getElementById('welcomeTextTranslationStatus');
            const translationStatusText = document.getElementById('translationStatusText');

            // Dynamic messages elements
            const welcomeTextModeSelect = document.getElementById('welcomeTextModeSelect');
            const singleWelcomeTextSection = document.getElementById('singleWelcomeTextSection');
            const dynamicMessagesSection = document.getElementById('dynamicMessagesSection');
            const welcomeMessagesList = document.getElementById('welcomeMessagesList');
            const messagesCountBadge = document.getElementById('messagesCountBadge');
            const newWelcomeMessageInput = document.getElementById('newWelcomeMessageInput');
            const addWelcomeMessageBtn = document.getElementById('addWelcomeMessageBtn');
            const resetWelcomeMessagesBtn = document.getElementById('resetWelcomeMessagesBtn');
            const generateWelcomeMessagesBtn = document.getElementById('generateWelcomeMessagesBtn');
            const translateWelcomeMessagesBtn = document.getElementById('translateWelcomeMessagesBtn');
            const welcomeMessagesStatus = document.getElementById('welcomeMessagesStatus');
            const welcomeMessagesStatusAlert = document.getElementById('welcomeMessagesStatusAlert');
            const welcomeMessagesStatusText = document.getElementById('welcomeMessagesStatusText');
            const refreshPreviewBtn = document.getElementById('refreshPreviewBtn');

            // Default welcome messages
            const defaultWelcomeMessages = [
                "Hey, {Username}! What can I help you with today?",
                "Ready when you are.",
                "Good to see you, {Username}.",
                "What's on your mind?",
                "Hi there, {Username}. How can I assist?",
                "Let's get started!",
                "Welcome back, {Username}!",
                "How can I help?",
                "Hey! Ready to dive in?",
                "Hi, {Username}. What would you like to explore today?"
            ];

            // Load welcome messages from config
            let welcomeMessages = [];
            try {
                const messagesStr = localStorage.getItem('NEXT_PUBLIC_WELCOME_MESSAGES') ||
                    this.config?.NEXT_PUBLIC_WELCOME_MESSAGES ||
                    '[]';
                welcomeMessages = JSON.parse(messagesStr);
                if (!Array.isArray(welcomeMessages) || welcomeMessages.length === 0) {
                    welcomeMessages = defaultWelcomeMessages;
                }
            } catch (e) {
                welcomeMessages = defaultWelcomeMessages;
            }

            // Initialize welcome mode sections on load
            const currentMode = localStorage.getItem('NEXT_PUBLIC_WELCOME_TEXT_MODE') || 'custom';
            if (welcomeTextModeSelect) {
                welcomeTextModeSelect.value = currentMode;
            }

            // Show/hide sections based on saved mode
            if (singleWelcomeTextSection) {
                singleWelcomeTextSection.style.display = currentMode === 'custom' ? 'block' : 'none';
            }
            if (dynamicMessagesSection) {
                dynamicMessagesSection.style.display = currentMode === 'dynamic' ? 'block' : 'none';
            }
            const manualUsernameSection = document.getElementById('manualUsernameSection');
            if (manualUsernameSection) {
                manualUsernameSection.style.display = currentMode === 'dynamic' ? 'block' : 'none';
            }

            // Function to render welcome messages list
            function renderWelcomeMessages() {
                if (!welcomeMessagesList) return;

                welcomeMessagesList.innerHTML = '';
                welcomeMessages.forEach((message, index) => {
                    const messageItem = document.createElement('div');
                    messageItem.className = 'flex items-center gap-2 p-2 bg-base-200 rounded-lg';
                    messageItem.innerHTML = `
                        <span class="flex-1 text-sm">${message.replace(/{Username}/g, '<span class="font-semibold text-primary">John</span>')}</span>
                        <button class="btn btn-xs btn-ghost" onclick="editWelcomeMessage(${index})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-xs btn-ghost text-error" onclick="deleteWelcomeMessage(${index})">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    `;
                    welcomeMessagesList.appendChild(messageItem);
                });

                // Update count badge
                if (messagesCountBadge) {
                    messagesCountBadge.textContent = `${welcomeMessages.length} message${welcomeMessages.length !== 1 ? 's' : ''}`;
                }
            }

            // Global functions for editing and deleting messages
            window.editWelcomeMessage = function (index) {
                const message = welcomeMessages[index];
                const newMessage = prompt('Edit message:', message);
                if (newMessage && newMessage.trim()) {
                    welcomeMessages[index] = newMessage.trim();
                    configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES', JSON.stringify(welcomeMessages));
                    renderWelcomeMessages();
                    updateWelcomePreview();
                }
            };

            window.deleteWelcomeMessage = function (index) {
                if (welcomeMessages.length <= 1) {
                    alert('You must have at least one welcome message.');
                    return;
                }
                if (confirm('Delete this message?')) {
                    welcomeMessages.splice(index, 1);
                    configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES', JSON.stringify(welcomeMessages));
                    renderWelcomeMessages();
                    updateWelcomePreview();
                }
            };

            // Function to update welcome preview
            function updateWelcomePreview() {
                if (!welcomeTextPreview) return;

                const mode = welcomeTextModeSelect?.value || 'dynamic';

                if (mode === 'dynamic' && welcomeMessages.length > 0) {
                    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
                    const message = welcomeMessages[randomIndex];
                    const displayMessage = message.replace(/{Username}/g, 'John');
                    welcomeTextPreview.textContent = displayMessage;
                } else if (mode === 'custom') {
                    welcomeTextPreview.textContent = welcomeTextInput?.value || 'What can I help with?';
                } else {
                    welcomeTextPreview.textContent = 'What can I help with?';
                }

                updateWelcomeTextPreview(); // Apply gradient
            }

            // Handle mode selection
            if (welcomeTextModeSelect) {
                welcomeTextModeSelect.addEventListener('change', function () {
                    const mode = this.value;
                    configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_MODE', mode);

                    // Show/hide sections based on mode
                    if (singleWelcomeTextSection) {
                        singleWelcomeTextSection.style.display = mode === 'custom' ? 'block' : 'none';
                    }
                    if (dynamicMessagesSection) {
                        dynamicMessagesSection.style.display = mode === 'dynamic' ? 'block' : 'none';
                    }
                    // Show manual username section only for dynamic mode
                    const manualUsernameSection = document.getElementById('manualUsernameSection');
                    if (manualUsernameSection) {
                        manualUsernameSection.style.display = mode === 'dynamic' ? 'block' : 'none';
                    }

                    updateWelcomePreview();
                });
            }

            // Handle add message button
            if (addWelcomeMessageBtn) {
                addWelcomeMessageBtn.addEventListener('click', function () {
                    const newMessage = newWelcomeMessageInput?.value?.trim();
                    if (newMessage) {
                        welcomeMessages.push(newMessage);
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES', JSON.stringify(welcomeMessages));
                        renderWelcomeMessages();
                        newWelcomeMessageInput.value = '';
                        updateWelcomePreview();
                    }
                });
            }

            // Handle refresh preview button
            if (refreshPreviewBtn) {
                refreshPreviewBtn.addEventListener('click', function () {
                    updateWelcomePreview();
                });
            }

            // Handle reset button (works for both single text and dynamic messages)
            if (resetWelcomeMessagesBtn) {
                resetWelcomeMessagesBtn.addEventListener('click', function () {
                    // Check current mode
                    const currentMode = welcomeTextModeSelect?.value || 'custom';

                    if (currentMode === 'custom') {
                        // Reset single welcome text
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_MODE', 'custom');
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT', 'What can I help with?');
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_TRANSLATIONS', '{}');

                        // Update UI immediately
                        if (welcomeTextInput) {
                            welcomeTextInput.value = 'What can I help with?';
                            welcomeTextInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                        if (welcomeTextPreview) {
                            welcomeTextPreview.textContent = 'What can I help with?';
                        }
                        updateModeIndicator('custom');

                        // Force broadcast
                        try {
                            const bc = new BroadcastChannel('chatrag-config');
                            bc.postMessage({ key: 'NEXT_PUBLIC_WELCOME_TEXT', value: 'What can I help with?' });
                            bc.postMessage({ key: 'NEXT_PUBLIC_WELCOME_TEXT_MODE', value: 'custom' });
                            bc.close();
                        } catch (e) {
                            console.error('Failed to broadcast:', e);
                        }

                        // Save config
                        setTimeout(() => {
                            configManager.saveConfig();
                        }, 100);
                    } else if (currentMode === 'dynamic') {
                        // Reset dynamic messages
                        if (confirm('Reset to default welcome messages?')) {
                            welcomeMessages = [...defaultWelcomeMessages];
                            configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES', JSON.stringify(welcomeMessages));
                            configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES_TRANSLATIONS', '{}');
                            renderWelcomeMessages();
                            updateWelcomePreview();
                        }
                    }
                });
            }

            // Initialize messages list
            renderWelcomeMessages();

            // Handle welcome text input change (for custom mode)
            if (welcomeTextInput) {
                welcomeTextInput.addEventListener('input', function () {
                    // Update preview text
                    if (welcomeTextPreview && welcomeTextModeSelect?.value === 'custom') {
                        welcomeTextPreview.textContent = this.value || 'What can I help with?';
                    }
                    // Update config
                    configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT', this.value);

                    // If text changes and we're not in default mode, switch to custom
                    const currentMode = localStorage.getItem('NEXT_PUBLIC_WELCOME_TEXT_MODE') || 'default';
                    if (currentMode === 'default' && this.value !== 'What can I help with?') {
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_MODE', 'custom');
                        updateModeIndicator('custom');
                    }
                });
            }

            // Handle gradient selection change
            if (welcomeTextGradient) {
                welcomeTextGradient.addEventListener('change', function () {
                    configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_GRADIENT', this.value);
                    updateWelcomeTextPreview();
                });
            }

            // Handle generate welcome messages button
            if (generateWelcomeMessagesBtn) {
                generateWelcomeMessagesBtn.addEventListener('click', async function () {
                    try {
                        // Show loading state
                        this.disabled = true;
                        const originalContent = this.innerHTML;
                        this.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Generating...';
                        welcomeMessagesStatus?.classList.remove('hidden');
                        welcomeMessagesStatusAlert?.classList.add('alert-info');
                        welcomeMessagesStatusAlert?.classList.remove('alert-success', 'alert-error');
                        if (welcomeMessagesStatusText) {
                            welcomeMessagesStatusText.textContent = 'Generating new welcome messages with AI...';
                        }

                        // Call generation API
                        const response = await fetch('/api/generate-welcome-messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                count: 10,
                                style: 'friendly and engaging',
                                includeUsername: true
                            })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.messages && Array.isArray(data.messages)) {
                                // Add new messages to existing ones
                                welcomeMessages = [...welcomeMessages, ...data.messages];
                                configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES', JSON.stringify(welcomeMessages));
                                renderWelcomeMessages();
                                updateWelcomePreview();

                                // Show success
                                welcomeMessagesStatusAlert?.classList.remove('alert-info', 'alert-error');
                                welcomeMessagesStatusAlert?.classList.add('alert-success');
                                if (welcomeMessagesStatusText) {
                                    welcomeMessagesStatusText.textContent = `Successfully generated ${data.messages.length} new messages!`;
                                }
                            }
                        } else {
                            throw new Error('Failed to generate messages');
                        }

                        // Reset button
                        this.innerHTML = originalContent;
                        this.disabled = false;

                        // Hide status after 3 seconds
                        setTimeout(() => {
                            welcomeMessagesStatus?.classList.add('hidden');
                        }, 3000);
                    } catch (error) {
                        console.error('Error generating messages:', error);
                        welcomeMessagesStatusAlert?.classList.remove('alert-info', 'alert-success');
                        welcomeMessagesStatusAlert?.classList.add('alert-error');
                        if (welcomeMessagesStatusText) {
                            welcomeMessagesStatusText.textContent = 'Failed to generate messages. Please try again.';
                        }
                        this.innerHTML = originalContent;
                        this.disabled = false;
                    }
                });
            }

            // Handle translate welcome messages button
            if (translateWelcomeMessagesBtn) {
                translateWelcomeMessagesBtn.addEventListener('click', async function () {
                    try {
                        // Show loading state
                        this.disabled = true;
                        const originalContent = this.innerHTML;
                        this.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Translating...';
                        welcomeMessagesStatus?.classList.remove('hidden');
                        welcomeMessagesStatusAlert?.classList.add('alert-info');
                        welcomeMessagesStatusAlert?.classList.remove('alert-success', 'alert-error');

                        const languages = ['es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'ar', 'lt'];
                        const languageNames = {
                            es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese',
                            ru: 'Russian', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
                            hi: 'Hindi', ar: 'Arabic', lt: 'Lithuanian'
                        };

                        const translations = { en: welcomeMessages };
                        let completed = 0;

                        for (const lang of languages) {
                            if (welcomeMessagesStatusText) {
                                welcomeMessagesStatusText.textContent = `Translating to ${languageNames[lang]}... (${completed + 1}/${languages.length})`;
                            }

                            const response = await fetch('/api/translate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    targetLanguage: languageNames[lang],
                                    texts: welcomeMessages,
                                    provider: 'openai'
                                })
                            });

                            if (response.ok) {
                                const data = await response.json();
                                if (data.translations && Array.isArray(data.translations)) {
                                    translations[lang] = data.translations;
                                }
                            }
                            completed++;
                        }

                        // Save translations
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_MESSAGES_TRANSLATIONS', JSON.stringify(translations));

                        // Show success
                        welcomeMessagesStatusAlert?.classList.remove('alert-info', 'alert-error');
                        welcomeMessagesStatusAlert?.classList.add('alert-success');
                        if (welcomeMessagesStatusText) {
                            welcomeMessagesStatusText.textContent = `Successfully translated to ${completed} languages!`;
                        }

                        // Reset button
                        this.innerHTML = originalContent;
                        this.disabled = false;

                        // Hide status after 3 seconds
                        setTimeout(() => {
                            welcomeMessagesStatus?.classList.add('hidden');
                        }, 3000);
                    } catch (error) {
                        console.error('Error translating messages:', error);
                        welcomeMessagesStatusAlert?.classList.remove('alert-info', 'alert-success');
                        welcomeMessagesStatusAlert?.classList.add('alert-error');
                        if (welcomeMessagesStatusText) {
                            welcomeMessagesStatusText.textContent = 'Failed to translate messages. Please try again.';
                        }
                        this.innerHTML = originalContent;
                        this.disabled = false;
                    }
                });
            }

            // Note: resetWelcomeTextBtn doesn't exist in HTML - functionality moved to resetWelcomeMessagesBtn above

            // Handle translate button
            if (translateWelcomeTextBtn) {
                translateWelcomeTextBtn.addEventListener('click', async function () {
                    const currentText = welcomeTextInput?.value || 'What can I help with?';

                    // Show loading state
                    this.disabled = true;
                    this.textContent = 'Translating...';
                    welcomeTextTranslationStatus?.classList.remove('hidden');

                    // Define all supported languages
                    const languages = ['es', 'fr', 'de', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'ar', 'lt'];
                    const languageNames = {
                        'es': 'Spanish',
                        'fr': 'French',
                        'de': 'German',
                        'pt': 'Portuguese',
                        'ru': 'Russian',
                        'zh': 'Chinese',
                        'ja': 'Japanese',
                        'ko': 'Korean',
                        'hi': 'Hindi',
                        'ar': 'Arabic',
                        'lt': 'Lithuanian'
                    };

                    const translations = { en: currentText };
                    let completed = 0;

                    try {
                        // Translate to each language
                        for (const lang of languages) {
                            if (translationStatusText) {
                                translationStatusText.textContent = `Translating to ${languageNames[lang]}... (${completed + 1}/${languages.length})`;
                            }

                            const response = await fetch('/api/translate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    targetLanguage: languageNames[lang],
                                    texts: [currentText],
                                    provider: 'openai'
                                })
                            });

                            if (response.ok) {
                                const result = await response.json();
                                if (result.translations && result.translations[0]) {
                                    translations[lang] = result.translations[0];
                                }
                            }

                            completed++;
                        }

                        // Save translations
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_MODE', 'custom');
                        configManager.updateConfig('NEXT_PUBLIC_WELCOME_TEXT_TRANSLATIONS', JSON.stringify(translations));
                        updateModeIndicator('custom');

                        // Save config
                        configManager.saveConfig();

                        // Show success
                        if (translationStatusText) {
                            translationStatusText.textContent = 'Translation completed successfully!';
                        }
                        setTimeout(() => {
                            welcomeTextTranslationStatus?.classList.add('hidden');
                        }, 3000);

                    } catch (error) {
                        console.error('Translation error:', error);
                        if (translationStatusText) {
                            translationStatusText.textContent = 'Translation failed. Please try again.';
                        }
                    } finally {
                        // Reset button
                        this.disabled = false;
                        this.textContent = 'Translate to All Languages';
                    }
                });
            }

            // Helper function to update mode indicator
            function updateModeIndicator(mode) {
                if (welcomeTextModeIndicator) {
                    welcomeTextModeIndicator.textContent = mode === 'default' ? 'Default' : 'Custom';
                    welcomeTextModeIndicator.className = mode === 'default'
                        ? 'badge badge-sm badge-primary'
                        : 'badge badge-sm badge-secondary';
                }
            }


            // Update welcome text preview function
            function updateWelcomeTextPreview() {
                if (!welcomeTextPreview) return;

                const gradientType = welcomeTextGradient?.value || 'none';

                if (gradientType === 'none') {
                    // Reset to default styles
                    welcomeTextPreview.style.background = '';
                    welcomeTextPreview.style.color = '';
                    welcomeTextPreview.style.webkitBackgroundClip = '';
                    welcomeTextPreview.style.webkitTextFillColor = '';
                    welcomeTextPreview.style.backgroundClip = '';
                } else {
                    // Apply gradient
                    const presets = {
                        sunset: 'linear-gradient(to right, #FF6B6B, #FFE66D)',
                        ocean: 'linear-gradient(to right, #4A90E2, #9B59B6)',
                        aurora: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
                        neon: 'linear-gradient(to right, #00FFF0, #FF00FF)',
                        solar: 'linear-gradient(to right, #FDB813, #FF6B6B)',
                        chatbuttons: 'linear-gradient(to right, #3B82F6, #EAB308, #EA580C, #EF4444, #A855F7)'
                    };

                    const gradientCSS = presets[gradientType];

                    if (gradientCSS) {
                        welcomeTextPreview.style.background = gradientCSS;
                        welcomeTextPreview.style.color = 'transparent';
                        welcomeTextPreview.style.webkitBackgroundClip = 'text';
                        welcomeTextPreview.style.webkitTextFillColor = 'transparent';
                        welcomeTextPreview.style.backgroundClip = 'text';
                    }
                }
            }

            // Initialize preview on load
            updateWelcomeTextPreview();

            // Handle favicon file upload
            const faviconFile = document.getElementById('faviconFile');
            if (faviconFile) {
                faviconFile.addEventListener('change', async function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        const formData = new FormData();
                        formData.append('favicon', file);

                        try {
                            // Upload the favicon to the server
                            const response = await fetch('/api/config/upload-favicon', {
                                method: 'POST',
                                body: formData
                            });

                            if (response.ok) {
                                const result = await response.json();
                                // Update the hidden input with the new favicon URL
                                const faviconUrl = document.getElementById('NEXT_PUBLIC_FAVICON_URL');
                                if (faviconUrl) {
                                    faviconUrl.value = result.url || `/favicon.${file.name.split('.').pop()}`;
                                    // Update preview
                                    const preview = document.getElementById('faviconPreview');
                                    if (preview) {
                                        preview.innerHTML = `<img src="${faviconUrl.value}?t=${Date.now()}" alt="Favicon preview" class="w-6 h-6">`;
                                    }
                                    // Update config manager with new favicon URL
                                    if (window.configManager) {
                                        window.configManager.updateConfig('NEXT_PUBLIC_FAVICON_URL', faviconUrl.value);
                                        window.configManager.saveConfig();
                                    }
                                }
                                showNotification('Favicon uploaded successfully', 'success');
                            } else {
                                throw new Error('Failed to upload favicon');
                            }
                        } catch (error) {
                            console.error('Error uploading favicon:', error);
                            showNotification('Failed to upload favicon', 'error');
                        }
                    }
                });
            }

            // Global functions for Live Preview (need to be global for onclick handlers)
            window.toggleInlineChat = function () {
                const inlineChatWidget = document.getElementById('inlineChatWidget');
                if (inlineChatWidget) {
                    if (inlineChatWidget.style.display === 'none' || !inlineChatWidget.style.display) {
                        inlineChatWidget.style.display = 'flex';
                        // Auto-focus the input
                        setTimeout(() => {
                            const chatInput = document.getElementById('chatInput');
                            if (chatInput) chatInput.focus();
                        }, 100);
                    } else {
                        inlineChatWidget.style.display = 'none';
                    }
                }
            };

            // Store message history for the Live Preview
            let livePreviewMessages = [];

            window.sendPreviewMessage = function () {
                const chatInput = document.getElementById('chatInput');
                const chatMessages = document.getElementById('chatMessages');

                if (!chatInput || !chatMessages || !chatInput.value.trim()) return;

                const userMessage = chatInput.value.trim();
                chatInput.value = '';

                // Add user message to display
                const userMessageDiv = document.createElement('div');
                userMessageDiv.style.cssText = `
                    margin-bottom: 12px;
                    text-align: right;
                `;

                const userLabel = document.createElement('div');
                userLabel.style.cssText = `
                    color: #666;
                    font-size: 12px;
                    margin-bottom: 4px;
                `;
                userLabel.textContent = 'You';

                const bubble = document.createElement('div');
                bubble.style.cssText = `
                    display: inline-block;
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 18px;
                    font-size: 14px;
                    line-height: 1.4;
                    background: #1a1a1a;
                    color: white;
                    border-bottom-right-radius: 4px;
                `;
                bubble.textContent = userMessage;

                userMessageDiv.appendChild(userLabel);
                userMessageDiv.appendChild(bubble);

                chatMessages.appendChild(userMessageDiv);

                // Auto-scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;

                // Send real message to ChatRAG API
                sendRealChatMessage(userMessage, chatMessages);
            };

            // Format message content: escape HTML, linkify, basic markdown (bold, code), and numeric lists
            function formatMessageWithLinks(text) {
                if (!text) return '';

                // Escape HTML
                const esc = (s) => s
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\"/g, '&quot;')
                    .replace(/'/g, '&#39;');

                // Linkify utility
                const linkify = (s) => s.replace(/(https?:\/\/[^\s<>"']+[^\s<>"'.,!?;:])/gi, (url) =>
                    `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; text-decoration: underline; cursor: pointer;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#1e40af'">${url}</a>`
                );

                // Email links
                const emailify = (s) => s.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi, (email) =>
                    `<a href="mailto:${email}" style="color: #1e40af; text-decoration: underline; cursor: pointer;" onmouseover="this.style.color='#1d4ed8'" onmouseout="this.style.color='#1e40af'">${email}</a>`
                );

                // Inline markdown
                const mdInline = (s) => s
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:2px 4px;border-radius:4px;">$1</code>');

                const lines = text.split(/\r?\n/);
                let out = '';
                let inOL = false; let olBuf = [];
                const flushOL = () => { if (inOL) { out += '<ol style="padding-left:1.25rem;margin:0 0 0.5rem 0;">' + olBuf.map(li => `<li>${li}</li>`).join('') + '</ol>'; inOL = false; olBuf = []; } };

                for (const raw of lines) {
                    const m = raw.match(/^\s*(\d+)\.\s+(.*)$/);
                    if (m) {
                        inOL = true;
                        olBuf.push(mdInline(emailify(linkify(esc(m[2])))));
                        continue;
                    }
                    flushOL();
                    if (raw.trim().length) {
                        out += `<div>${mdInline(emailify(linkify(esc(raw))))}</div>`;
                    }
                }
                flushOL();
                return out || mdInline(emailify(linkify(esc(text)))).replace(/\n/g, '<br>');
            }

            // Hide typing indicator (EXACT original function)
            function hideTypingIndicator() {
                const typingIndicator = document.getElementById('typingIndicator');
                if (typingIndicator) {
                    typingIndicator.remove();
                }
            }

            function getConfiguredChatRagAppUrl() {
                const configuredUrl =
                    document.getElementById('CHATRAG_APP_URL')?.value ||
                    document.getElementById('NEXT_PUBLIC_SITE_URL')?.value;

                if (configuredUrl && configuredUrl.trim()) {
                    return configuredUrl.trim().replace(/\/+$/, '');
                }

                if (window.location.port === '3333') {
                    return `${window.location.protocol}//${window.location.hostname}:3000`;
                }

                return window.location.origin;
            }
            window.getConfiguredChatRagAppUrl = getConfiguredChatRagAppUrl;

            // Send real chat message to ChatRAG API
            async function sendRealChatMessage(userMessage, chatMessages) {
                // Remove any existing typing indicator (use original function)
                hideTypingIndicator();

                // Add loading indicator matching production widget
                const loadingDiv = document.createElement('div');
                loadingDiv.id = 'typingIndicator';
                loadingDiv.style.cssText = `
                    margin-bottom: 12px;
                    display: flex;
                    justify-content: flex-start;
                `;

                const typingBubble = document.createElement('div');
                typingBubble.style.cssText = `
                    padding: 12px 16px;
                    border-radius: 18px;
                    background: white;
                    border: 1px solid #eee;
                    border-bottom-left-radius: 4px;
                    font-size: 14px;
                    color: #666;
                `;
                typingBubble.innerHTML = 'Typing<span style="animation: blink 1.4s infinite;">...</span>';

                loadingDiv.appendChild(typingBubble);

                // Add typing animation CSS if not already present
                if (!document.getElementById('typingAnimation')) {
                    const style = document.createElement('style');
                    style.id = 'typingAnimation';
                    style.textContent = `
                        @keyframes blink {
                            0%, 50% { opacity: 1; }
                            51%, 100% { opacity: 0; }
                        }
                    `;
                    document.head.appendChild(style);
                }

                chatMessages.appendChild(loadingDiv);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                try {
                    // Prefer direct call to the configured Next app; fallback to proxy if it fails
                    const directUrl = `${getConfiguredChatRagAppUrl()}/api/embed/chat`;
                    const payload = {
                        messages: [
                            { role: 'user', content: userMessage }
                        ],
                        model: (document.getElementById('NEXT_PUBLIC_EMBED_MODEL')?.value || 'openai/gpt-4o-mini')
                    };

                    let chatResponse;
                    try {
                        chatResponse = await fetch(directUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
                            body: JSON.stringify(payload),
                            mode: 'cors'
                        });
                        console.log('[Embed Preview] Using direct endpoint', directUrl, 'status', chatResponse.status);
                        if (!chatResponse.ok) throw new Error(`Direct fetch failed ${chatResponse.status}`);
                    } catch (e) {
                        // Fallback to config server proxy
                        console.log('[Embed Preview] Falling back to proxy /api/embed/chat/proxy due to', e?.message);
                        chatResponse = await fetch('/api/embed/chat/proxy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Accept': 'text/plain' },
                            body: JSON.stringify(payload)
                        });
                        console.log('[Embed Preview] Proxy status', chatResponse.status);
                    }

                    if (!chatResponse.ok) {
                        throw new Error(`HTTP error! status: ${chatResponse.status}`);
                    }

                    // Remove loading indicator (use original function)
                    hideTypingIndicator();

                    // Create assistant message div for streaming response
                    const assistantMessageDiv = document.createElement('div');
                    assistantMessageDiv.style.cssText = `
                        margin-bottom: 12px;
                    `;

                    const assistantLabel = document.createElement('div');
                    assistantLabel.style.cssText = `
                        color: #666;
                        font-size: 12px;
                        margin-bottom: 4px;
                    `;
                    assistantLabel.textContent = 'Assistant';

                    const bubble = document.createElement('div');
                    bubble.style.cssText = `
                        display: inline-block;
                        max-width: 80%;
                        padding: 12px 16px;
                        border-radius: 18px;
                        font-size: 14px;
                        line-height: 1.4;
                        background: white;
                        color: #333;
                        border: 1px solid #eee;
                        border-bottom-left-radius: 4px;
                    `;

                    const contentDiv = document.createElement('div');
                    contentDiv.id = 'streaming-content';
                    bubble.appendChild(contentDiv);

                    assistantMessageDiv.appendChild(assistantLabel);
                    assistantMessageDiv.appendChild(bubble);

                    chatMessages.appendChild(assistantMessageDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;

                    // Handle streaming response (same format as original implementation)
                    // If body streaming is unavailable, fall back to full text and parse once
                    if (!chatResponse.body) {
                        const text = await chatResponse.text();
                        console.log('[Embed Preview] Non-streaming response head:', text.slice(0, 200));
                        const matchAll = text.match(/\n?0:\s*("(?:[^"\\]|\\.)*")/g) || [];
                        let combined = '';
                        for (const m of matchAll) {
                            try { combined += JSON.parse(m.replace(/^\s*0:\s*/, '')); } catch { }
                        }
                        if (combined) {
                            contentDiv.innerHTML = formatMessageWithLinks(combined);
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                            return;
                        }
                        throw new Error('Non-streaming response with no parsable frames');
                    }
                    const reader = chatResponse.body.getReader();
                    const decoder = new TextDecoder();
                    let assistantMessage = '';
                    // Buffer to handle partial lines across chunks
                    let buffer = '';
                    // Raw accumulator for fallback parsing after streaming ends
                    let rawStream = '';

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        rawStream += chunk;
                        buffer += chunk;
                        let lines = buffer.split('\n');
                        // Keep the last partial line in the buffer
                        buffer = lines.pop() || '';

                        for (const lineRaw of lines) {
                            const line = lineRaw.trim();
                            if (line === '') continue;

                            try {
                                // Handle AI SDK streaming format
                                if (/^\s*0:/.test(line)) {
                                    // Text content: 0:"content"
                                    const jsonPart = line.slice(2);
                                    const textDelta = JSON.parse(jsonPart);
                                    assistantMessage += textDelta;
                                    if (contentDiv) {
                                        contentDiv.innerHTML = formatMessageWithLinks(assistantMessage);
                                    }
                                    chatMessages.scrollTop = chatMessages.scrollHeight;
                                } else if (/^\s*3:/.test(line)) {
                                    // Error message: 3:"error"
                                    const jsonPart = line.slice(2);
                                    const errorMessage = JSON.parse(jsonPart);
                                    throw new Error(errorMessage);
                                } else if (line.startsWith('data: ')) {
                                    // SSE fallback (supports OpenAI deltas and Vercel AI SDK events)
                                    const data = line.slice(6);
                                    if (data && data !== '[DONE]') {
                                        try {
                                            const parsed = JSON.parse(data);
                                            let content = '';
                                            // OpenAI streaming shape
                                            if (parsed?.choices?.[0]?.delta?.content) {
                                                content = parsed.choices[0].delta.content;
                                            }
                                            // Vercel AI SDK event stream
                                            if (!content && (parsed?.type || parsed?.event)) {
                                                const t = parsed.type || parsed.event;
                                                if (t === 'text-delta') {
                                                    content = parsed.delta ?? parsed.textDelta ?? parsed.content ?? parsed.data?.delta ?? '';
                                                } else if (t === 'text') {
                                                    content = parsed.text ?? '';
                                                }
                                            }
                                            if (typeof content === 'string' && content.length > 0) {
                                                assistantMessage += content;
                                                if (contentDiv) {
                                                    contentDiv.innerHTML = formatMessageWithLinks(assistantMessage);
                                                }
                                                chatMessages.scrollTop = chatMessages.scrollHeight;
                                            }
                                        } catch (e) {
                                            console.debug('Could not parse SSE data:', data, e);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log('Could not parse line:', line, e);
                            }
                        }
                    }

                    // Flush any remaining buffered line
                    if (/^\s*0:/.test(buffer.trim())) {
                        try {
                            const textDelta = JSON.parse(buffer.trim().slice(2));
                            assistantMessage += textDelta;
                            if (contentDiv) {
                                contentDiv.innerHTML = formatMessageWithLinks(assistantMessage);
                            }
                        } catch { }
                    }

                    // Fallback: try to extract all 0:"..." JSON string segments from the raw stream
                    if (!assistantMessage.trim() && rawStream) {
                        try {
                            const regex = /\n?0:\s*("(?:[^"\\]|\\.)*")/g;
                            let m;
                            while ((m = regex.exec(rawStream)) !== null) {
                                try {
                                    assistantMessage += JSON.parse(m[1]);
                                } catch { }
                            }
                            if (assistantMessage && contentDiv) {
                                contentDiv.innerHTML = formatMessageWithLinks(assistantMessage);
                            }
                        } catch { }
                    }

                    // If still empty, show a fallback
                    if (!assistantMessage.trim()) {
                        if (contentDiv) {
                            contentDiv.textContent = 'Sorry, I received an empty response. Please try again.';
                        }
                        console.log('Preview stream was empty; raw length =', rawStream?.length || 0, 'head:', (rawStream || '').slice(0, 200));
                    }

                } catch (error) {
                    console.error('Error sending chat message:', error);

                    // Remove loading indicator (use original function)
                    hideTypingIndicator();

                    // Show error message
                    const errorDiv = document.createElement('div');
                    errorDiv.style.cssText = `
                        margin-bottom: 12px;
                        display: flex;
                        justify-content: flex-start;
                    `;

                    const errorBubble = document.createElement('div');
                    errorBubble.style.cssText = `
                        max-width: 80%;
                        padding: 12px 16px;
                        border-radius: 18px;
                        font-size: 14px;
                        line-height: 1.4;
                        background: #fee;
                        color: #333;
                        border: 1px solid #fcc;
                        border-bottom-left-radius: 4px;
                    `;

                    errorBubble.innerHTML = `
                        Sorry, I'm having trouble connecting to the chat service. This could be because:
                        <br>• The chat API is not configured yet
                        <br>• The server is not running
                        <br>• Network connectivity issues
                        <br><br>Please check your configuration or try again later.
                    `;

                    errorDiv.appendChild(errorBubble);
                    chatMessages.appendChild(errorDiv);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }

            // Update preview styling and positioning in real-time
            function updateLivePreview() {
                const embedButton = document.getElementById('embedPreviewButton');
                const chatHeader = document.getElementById('chatHeader');
                const chatTitle = document.getElementById('chatTitle');
                const chatLogo = document.getElementById('chatLogo');
                const welcomeMessage = document.getElementById('welcomeMessage');
                const sendButton = document.querySelector('#inlineChatWidget button[onclick="sendPreviewMessage()"]');
                const inlineChatWidget = document.getElementById('inlineChatWidget');

                // Get current values
                const title = document.getElementById('NEXT_PUBLIC_EMBED_TITLE')?.value || 'ChatRAG Assistant';
                const greeting = document.getElementById('NEXT_PUBLIC_EMBED_GREETING')?.value || 'Hello! Development help you today?';
                const primaryColor = document.getElementById('NEXT_PUBLIC_EMBED_PRIMARY_COLOR')?.value || '#FF6417';
                const position = document.getElementById('NEXT_PUBLIC_EMBED_POSITION')?.value || 'bottom-right';
                const faviconUrl = document.getElementById('NEXT_PUBLIC_FAVICON_URL')?.value || '/favicon.svg';

                // Update colors - using configured primary color
                if (embedButton) embedButton.style.background = primaryColor;
                if (chatHeader) chatHeader.style.background = primaryColor;
                if (sendButton) sendButton.style.background = primaryColor;

                // Update logo
                if (chatLogo && faviconUrl) {
                    chatLogo.src = faviconUrl;
                    chatLogo.style.display = 'block';
                }

                // Update text content
                if (chatTitle) chatTitle.textContent = title;
                if (welcomeMessage) welcomeMessage.textContent = greeting;

                // Update position
                if (embedButton && inlineChatWidget) {
                    // Reset all positions
                    embedButton.style.top = 'auto';
                    embedButton.style.bottom = 'auto';
                    embedButton.style.left = 'auto';
                    embedButton.style.right = 'auto';

                    inlineChatWidget.style.top = 'auto';
                    inlineChatWidget.style.bottom = 'auto';
                    inlineChatWidget.style.left = 'auto';
                    inlineChatWidget.style.right = 'auto';

                    switch (position) {
                        case 'bottom-right':
                            embedButton.style.bottom = '20px';
                            embedButton.style.right = '20px';
                            inlineChatWidget.style.bottom = '90px';
                            inlineChatWidget.style.right = '20px';
                            break;
                        case 'bottom-left':
                            embedButton.style.bottom = '20px';
                            embedButton.style.left = '20px';
                            inlineChatWidget.style.bottom = '90px';
                            inlineChatWidget.style.left = '20px';
                            break;
                        case 'top-right':
                            embedButton.style.top = '20px';
                            embedButton.style.right = '20px';
                            inlineChatWidget.style.top = '90px';
                            inlineChatWidget.style.right = '20px';
                            break;
                        case 'top-left':
                            embedButton.style.top = '20px';
                            embedButton.style.left = '20px';
                            inlineChatWidget.style.top = '90px';
                            inlineChatWidget.style.left = '20px';
                            break;
                    }
                }
            }

            // Add event listeners for real-time preview updates
            const previewUpdateFields = [
                'NEXT_PUBLIC_EMBED_TITLE',
                'NEXT_PUBLIC_EMBED_GREETING',
                'NEXT_PUBLIC_EMBED_PRIMARY_COLOR',
                'NEXT_PUBLIC_EMBED_POSITION'
            ];

            previewUpdateFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('input', () => {
                        updateLivePreview();
                        if (embedManager.updateEmbedCodes) {
                            embedManager.updateEmbedCodes();
                        }
                    });
                    field.addEventListener('change', () => {
                        updateLivePreview();
                        if (embedManager.updateEmbedCodes) {
                            embedManager.updateEmbedCodes();
                        }
                    });
                }
            });

            // Initialize live preview
            setTimeout(updateLivePreview, 500);

            // Initialize RAG Settings functionality
            initRagSettings();

            // Initialize Document Processing functionality
            initDocumentProcessing();
        });

        // RAG Settings initialization and functionality
        function initRagSettings() {
            console.log('Initializing RAG Settings...');

            // Initialize slider value displays
            // updateSliderValues(); // Function was removed with optimization features

            // Initialize tooltip system
            initTooltips();

            // Initialize model cards
            updateModelCards();

            // Also update model cards after a delay to ensure config is loaded
            setTimeout(() => {
                updateModelCards();
            }, 100);

            // Initialize parsing mode info
            updateParsingModeInfo();

            // Initialize configuration preview
            updateConfigPreview();

            // Initialize performance indicators
            updatePerformanceIndicators();

            // Add event listeners for sliders
            const chunkSizeSlider = document.getElementById('LLAMACLOUD_CHUNK_SIZE');
            const chunkOverlapSlider = document.getElementById('LLAMACLOUD_CHUNK_OVERLAP');

            if (chunkSizeSlider) {
                chunkSizeSlider.addEventListener('input', function () {
                    document.getElementById('chunk-size-value').textContent = this.value;
                    updateConfigPreview();
                    updatePerformanceIndicators();
                });
            }

            if (chunkOverlapSlider) {
                chunkOverlapSlider.addEventListener('input', function () {
                    document.getElementById('chunk-overlap-value').textContent = this.value;
                    updateConfigPreview();
                    updatePerformanceIndicators();
                });
            }

            // Add event listeners for other RAG settings
            const ragSettingFields = [
                'LLAMACLOUD_PARSING_MODE',
                'LLAMACLOUD_CHUNK_STRATEGY',
                'OPENAI_EMBEDDING_MODEL'
            ];

            ragSettingFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.addEventListener('change', function () {
                        updateConfigPreview();
                        updatePerformanceIndicators();
                        if (fieldId === 'OPENAI_EMBEDDING_MODEL') {
                            updateModelCards();
                        }
                        if (fieldId === 'LLAMACLOUD_PARSING_MODE') {
                            updateParsingModeInfo();
                        }
                    });
                }
            });
        }

        // Initialize tooltip system
        function initTooltips() {
            const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');

            tooltipTriggers.forEach(trigger => {
                let tooltip = null;

                trigger.addEventListener('mouseenter', function () {
                    const tooltipId = this.getAttribute('data-tooltip');
                    const tooltipContent = document.getElementById(`tooltip-${tooltipId}`);

                    if (tooltipContent) {
                        // Create tooltip element
                        tooltip = document.createElement('div');
                        tooltip.className = 'fixed z-50 p-3 bg-base-100 border border-base-300 rounded-lg shadow-lg text-sm max-w-xs';
                        tooltip.innerHTML = tooltipContent.innerHTML;
                        tooltip.style.visibility = 'hidden'; // Hide initially to calculate dimensions

                        document.body.appendChild(tooltip);

                        // Position tooltip with smart positioning
                        const rect = this.getBoundingClientRect();
                        const tooltipRect = tooltip.getBoundingClientRect();
                        const tooltipWidth = tooltipRect.width;
                        const tooltipHeight = tooltipRect.height;
                        const padding = 10;

                        // Default position: to the right of the element
                        let left = rect.right + padding;
                        let top = rect.top + (rect.height / 2) - (tooltipHeight / 2); // Center vertically

                        // Check if tooltip would go off right edge
                        if (left + tooltipWidth > window.innerWidth - padding) {
                            // Position to the left instead
                            left = rect.left - tooltipWidth - padding;
                        }

                        // Check if tooltip would still go off left edge
                        if (left < padding) {
                            // Position below the element instead
                            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                            top = rect.bottom + padding;

                            // Check if it would go off bottom
                            if (top + tooltipHeight > window.innerHeight - padding) {
                                // Position above the element
                                top = rect.top - tooltipHeight - padding;
                            }
                        }

                        // Ensure tooltip stays within viewport bounds
                        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
                        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

                        // Apply positioning and show tooltip
                        tooltip.style.left = left + 'px';
                        tooltip.style.top = top + 'px';
                        tooltip.style.visibility = 'visible';
                    }
                });

                trigger.addEventListener('mouseleave', function () {
                    if (tooltip) {
                        tooltip.remove();
                        tooltip = null;
                    }
                });
            });
        }

        // Update model cards highlighting
        function updateModelCards() {
            const selectedModel = document.getElementById('OPENAI_EMBEDDING_MODEL')?.value;
            const modelCards = document.querySelectorAll('.model-card');

            modelCards.forEach(card => {
                const cardModel = card.getAttribute('data-model');
                if (cardModel === selectedModel) {
                    card.classList.remove('border-base-300');
                    card.classList.add('border-primary');
                } else {
                    card.classList.remove('border-primary');
                    card.classList.add('border-base-300');
                }
            });
        }

        // LlamaCloud Model Cost Information (matching LlamaCloud exactly)
        const llamaCloudModelCosts = {
            'openai-gpt-4-1-mini': { credits: 10, name: 'OpenAI GPT-4.1 Mini', badge: '💰 Most Economical' },
            'gemini-2.0-flash': { credits: 30, name: 'Gemini 2.0 Flash', badge: '⚡ Fast & Affordable' },
            'openai-gpt-4-1': { credits: 45, name: 'OpenAI GPT-4.1', badge: '🎯 Balanced' },
            'anthropic-sonnet-3.5': { credits: 45, name: 'Anthropic Sonnet 3.5', badge: '🚀 High Performance' },
            'gemini-2.5-pro': { credits: 45, name: 'Gemini 2.5 Pro', badge: '⭐ Premium' },
            'anthropic-sonnet-4.0': { credits: 90, name: 'Anthropic Sonnet 4.0', badge: '🔮 Most Advanced' }
        };

        // Update model cost display when selection changes
        function updateModelCostDisplay() {
            const modelSelect = document.getElementById('LLAMACLOUD_PARSE_MODEL');
            const costDisplay = document.getElementById('model-cost-display');
            const qualityDisplay = document.getElementById('model-quality-display');

            if (!modelSelect) return;

            const selectedModel = modelSelect.value;
            const modelInfo = llamaCloudModelCosts[selectedModel];

            if (modelInfo) {
                // Update the cost display
                if (costDisplay) {
                    costDisplay.textContent = `Cost: ${modelInfo.credits} credits/page`;
                }

                // Update the quality display
                if (qualityDisplay) {
                    const qualityText = {
                        '💰 Most Economical': 'Most economical choice',
                        '⚡ Fast & Affordable': 'Fast and affordable',
                        '🎯 Balanced': 'Balanced performance',
                        '🚀 High Performance': 'High performance',
                        '⭐ Premium': 'Premium quality',
                        '🔮 Most Advanced': 'Most advanced capabilities'
                    };
                    qualityDisplay.textContent = qualityText[modelInfo.badge] || 'Quality parsing';
                }

                // Also update in the info area if it exists
                const infoArea = document.querySelector('.parsing-model-info');
                if (infoArea) {
                    infoArea.innerHTML = `
                        <div class="alert alert-info mt-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>
                                <div class="font-semibold">Selected Model: ${modelInfo.name}</div>
                                <div class="text-sm">Cost: ${modelInfo.credits} credits per page processed</div>
                                <div class="text-xs mt-1">${modelInfo.badge}</div>
                            </div>
                        </div>
                    `;
                }
            }
        }

        // Initialize model cost display and parse mode on page load
        document.addEventListener('DOMContentLoaded', () => {
            const modelSelect = document.getElementById('LLAMACLOUD_PARSE_MODEL');
            const parseModeSelect = document.getElementById('LLAMACLOUD_PARSE_MODE');

            if (modelSelect) {
                modelSelect.addEventListener('change', updateModelCostDisplay);
            }

            if (parseModeSelect) {
                parseModeSelect.addEventListener('change', () => {
                    updateParsingModeInfo();
                    // Update config when parse mode changes
                    if (window.configManager) {
                        window.configManager.updateConfig('LLAMACLOUD_PARSE_MODE', parseModeSelect.value);
                    }
                });
            }

            // Initial updates
            updateParsingModeInfo();
            updateModelCostDisplay();
        });

        // Update parsing mode information
        function updateParsingModeInfo() {
            const parseModeSelect = document.getElementById('LLAMACLOUD_PARSE_MODE');
            const descriptionElement = document.getElementById('parse-mode-description');
            const modelSelectDiv = document.getElementById('LLAMACLOUD_PARSE_MODEL')?.parentElement;

            if (!parseModeSelect) return;

            const parseMode = parseModeSelect.value;

            const modeInfo = {
                'parse_page_with_agent': {
                    description: 'AI-powered parsing with OCR, plus image and table extraction. Complex documents with tables and images.',
                    showModelSelect: true,
                    creditsRange: '10-90 credits/page depending on model'
                },
                'parse_page_with_llm': {
                    description: 'Cost-effective parsing for documents with images. Best for simple documents.',
                    showModelSelect: false,
                    creditsRange: '3 credits/page'
                },
                'parse_page_without_llm': {
                    description: 'Fastest mode - plain text extraction without AI processing. Best for simple text-only documents.',
                    showModelSelect: false,
                    creditsRange: 'Minimal credits'
                }
            };

            const info = modeInfo[parseMode] || modeInfo['parse_page_with_agent'];

            if (descriptionElement) {
                descriptionElement.textContent = info.description;
            }

            // Show/hide model selection based on parse mode
            if (modelSelectDiv) {
                modelSelectDiv.style.display = info.showModelSelect ? 'block' : 'none';
            }

            // Update cost display
            const costDisplay = document.getElementById('model-cost-display');
            if (costDisplay && parseMode === 'parse_page_with_llm') {
                costDisplay.textContent = 'Cost: 3 credits/page';
            } else if (parseMode === 'parse_page_without_llm') {
                if (costDisplay) costDisplay.textContent = 'Cost: Minimal credits';
            } else if (parseMode === 'parse_page_with_agent') {
                updateModelCostDisplay(); // Update based on selected model
            }
        }

        // Update parsing mode information (legacy function for compatibility)
        function updateParsingModeInfoLegacy() {
            const parsingMode = document.getElementById('LLAMACLOUD_PARSING_MODE')?.value || 'balanced';
            const costElement = document.getElementById('parsing-mode-cost');
            const descriptionElement = document.getElementById('parsing-mode-description-legacy');

            const modeInfo = {
                fast: {
                    cost: '~$0.045/page',
                    description: 'Text-only extraction, no multimodal processing'
                },
                balanced: {
                    cost: '~$0.003/page',
                    description: 'LLM processing with basic table support'
                },
                premium: {
                    cost: '~$0.075/page',
                    description: 'Full multimodal with advanced visual processing'
                }
            };

            if (costElement && descriptionElement) {
                costElement.textContent = modeInfo[parsingMode].cost;
                descriptionElement.textContent = modeInfo[parsingMode].description;
            }
        }

        // Update configuration preview
        function updateConfigPreview() {
            const parsingMode = document.getElementById('LLAMACLOUD_PARSING_MODE')?.value || 'balanced';
            const strategy = document.getElementById('LLAMACLOUD_CHUNK_STRATEGY')?.value || 'sentence';
            const chunkSize = document.getElementById('LLAMACLOUD_CHUNK_SIZE')?.value || '768';
            const chunkOverlap = document.getElementById('LLAMACLOUD_CHUNK_OVERLAP')?.value || '416';
            const embeddingModel = document.getElementById('OPENAI_EMBEDDING_MODEL')?.value || 'text-embedding-3-small';

            // Update preview text
            const parsingModeText = parsingMode.charAt(0).toUpperCase() + parsingMode.slice(1);
            const strategyText = strategy === 'sentence' ? 'Sentence-based' :
                strategy === 'element' ? 'Element-based' : 'Basic';
            const modelText = embeddingModel.includes('3-small') ? '3-small' :
                embeddingModel.includes('3-large') ? '3-large' : 'Ada-002';

            if (document.getElementById('config-preview-parsing')) {
                document.getElementById('config-preview-parsing').textContent = parsingModeText;
            }
            if (document.getElementById('config-preview-strategy')) {
                document.getElementById('config-preview-strategy').textContent = strategyText;
            }
            if (document.getElementById('config-preview-size')) {
                document.getElementById('config-preview-size').textContent = chunkSize + ' chars';
            }
            if (document.getElementById('config-preview-overlap')) {
                document.getElementById('config-preview-overlap').textContent = chunkOverlap + ' chars';
            }
            if (document.getElementById('config-preview-model')) {
                document.getElementById('config-preview-model').textContent = modelText;
            }
        }

        // Update performance indicators
        function updatePerformanceIndicators() {
            const parsingMode = document.getElementById('LLAMACLOUD_PARSING_MODE')?.value || 'balanced';
            const chunkSize = parseInt(document.getElementById('LLAMACLOUD_CHUNK_SIZE')?.value || '768');
            const chunkOverlap = parseInt(document.getElementById('LLAMACLOUD_CHUNK_OVERLAP')?.value || '416');
            const strategy = document.getElementById('LLAMACLOUD_CHUNK_STRATEGY')?.value || 'sentence';
            const embeddingModel = document.getElementById('OPENAI_EMBEDDING_MODEL')?.value || 'text-embedding-3-small';

            // Calculate performance scores (simplified algorithm)
            let speed = 100;
            let precision = 50;
            let cost = 100;

            // Chunk size impact
            if (chunkSize <= 512) {
                speed += 15;
                precision += 20;
                cost += 10;
            } else if (chunkSize >= 1536) {
                speed -= 10;
                precision += 15;
                cost -= 5;
            }

            // Chunk overlap impact
            if (chunkOverlap === 0) {
                speed += 20;
                cost += 15;
                precision -= 10;
            } else if (chunkOverlap >= 256) {
                speed -= 15;
                cost -= 20;
                precision += 15;
            }

            // Strategy impact
            if (strategy === 'sentence') {
                precision += 20;
                speed -= 5;
            } else if (strategy === 'element') {
                precision += 35;  // Best for structured docs
                speed -= 10;      // Slightly slower due to structure analysis
            }

            // Model impact
            if (embeddingModel.includes('3-small')) {
                cost += 30;
                precision += 10;
            } else if (embeddingModel.includes('3-large')) {
                cost -= 20;
                precision += 25;
                speed -= 5;
            } else if (embeddingModel.includes('ada-002')) {
                cost -= 10;
                precision -= 5;
            }

            // Parsing mode impact
            if (parsingMode === 'fast') {
                speed += 25;
                cost += 20;
                precision -= 15;
            } else if (parsingMode === 'premium') {
                speed -= 25;
                cost -= 30;
                precision += 25;
            }

            // Normalize scores (0-100)
            speed = Math.max(0, Math.min(100, speed));
            precision = Math.max(0, Math.min(100, precision));
            cost = Math.max(0, Math.min(100, cost));

            // Update indicators
            updateIndicator('speed', speed);
            updateIndicator('precision', precision);
            updateIndicator('cost', cost);
        }

        // Update individual performance indicator
        function updateIndicator(type, value) {
            const indicator = document.getElementById(`${type}-indicator`);
            const bar = document.getElementById(`${type}-bar`);

            if (indicator) {
                indicator.textContent = Math.round(value) + '%';
            }
            if (bar) {
                bar.style.width = value + '%';

                // Update color based on performance
                bar.className = bar.className.replace(/bg-(success|warning|error)/, '');
                if (value >= 80) {
                    bar.classList.add('bg-success');
                } else if (value >= 60) {
                    bar.classList.add('bg-warning');
                } else {
                    bar.classList.add('bg-error');
                }
            }
        }

        // Document Processing functionality
        function initDocumentProcessing() {
            console.log('Initializing Document Processing...');

            // Initialize document processor
            window.documentProcessor = new DocumentProcessor();

            // Initialize drag and drop
            initDragAndDrop();

            // Initialize event listeners
            initDocumentEventListeners();

            // Initialize monitor toggle
            initMonitorToggle();
        }

        // Document processor class
        class DocumentProcessor {
            constructor() {
                this.queue = [];
                this.processing = false;
                this.currentFile = null;
                this.results = [];
                this.stats = {
                    processedToday: 0,
                    successRate: 100
                };
                // Multi-tenant workspace management
                this.workspaces = {
                    personal: [],
                    teams: [],
                    isMultiTenant: false,
                    currentSelection: null // null = flat personal workspace
                };
            }

            async loadWorkspaces() {
                console.log('🔄 loadWorkspaces: Starting...');

                // Check if multi-tenant mode is enabled
                const deploymentMode = window.currentConfig?.NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE ||
                    window.currentConfig?.CHATRAG_DEPLOYMENT_MODE ||
                    'single-tenant';

                console.log('📋 loadWorkspaces: Deployment mode from config:', deploymentMode);
                console.log('📋 loadWorkspaces: Full config keys:', Object.keys(window.currentConfig || {}));

                this.workspaces.isMultiTenant = deploymentMode === 'multi-tenant';

                if (!this.workspaces.isMultiTenant) {
                    console.log('ℹ️ loadWorkspaces: Single-tenant mode, hiding workspace selector');
                    // Hide workspace selector in single-tenant mode
                    const container = document.getElementById('workspace-selector-container');
                    if (container) container.classList.add('hidden');
                    return;
                }

                console.log('✅ loadWorkspaces: Multi-tenant mode detected, fetching organizations...');

                // Fetch organizations from API
                try {
                    const response = await fetch('/api/organizations', {
                        credentials: 'same-origin'
                    });

                    console.log('📡 loadWorkspaces: API response status:', response.status);

                    if (!response.ok) {
                        console.error('❌ loadWorkspaces: Failed to fetch organizations:', response.status, response.statusText);
                        let errorMessage = await this.readResponseError(response);

                        if (response.status === 401) {
                            const appUrl = window.getConfiguredChatRagAppUrl ? window.getConfiguredChatRagAppUrl() : window.location.origin;
                            errorMessage += ` In multi-tenant mode, sign in to the main ChatRAG app at ${appUrl} in this browser, then refresh the Config UI.`;
                        }

                        console.error('❌ loadWorkspaces: Error response:', errorMessage);
                        this.showError(errorMessage);
                        return;
                    }

                    const data = await response.json();
                    console.log('📦 loadWorkspaces: Raw API response:', data);
                    console.log('📦 loadWorkspaces: data.all:', data.all);
                    console.log('📦 loadWorkspaces: data.all length:', data.all?.length);

                    this.workspaces.personal = data.all?.filter(o => o.is_personal) || [];
                    this.workspaces.teams = data.all?.filter(o => !o.is_personal) || [];

                    console.log('💼 loadWorkspaces: Personal workspaces:', this.workspaces.personal.length);
                    console.log('🏢 loadWorkspaces: Team workspaces:', this.workspaces.teams.length);

                    this.populateWorkspaceSelector();
                } catch (error) {
                    console.error('❌ loadWorkspaces: Error:', error);
                }
            }

            populateWorkspaceSelector() {
                const selector = document.getElementById('workspace-selector');
                const container = document.getElementById('workspace-selector-container');

                if (!selector || !container) return;

                // Show the selector
                container.classList.remove('hidden');

                // Build options
                const options = [];

                // Always add default workspace option (no organization - user_id isolation only)
                options.push('<option value="">👤 Default Workspace</option>');

                // Add personal workspaces section
                if (this.workspaces.personal.length > 0) {
                    options.push('<option disabled>───────────────────</option>');
                    options.push('<option disabled>💼 Personal Workspaces</option>');
                    this.workspaces.personal.forEach(org => {
                        options.push(`<option value="${org.id}">  💼 ${org.name}</option>`);
                    });
                }

                // Add team workspaces section
                if (this.workspaces.teams.length > 0) {
                    options.push('<option disabled>───────────────────</option>');
                    options.push('<option disabled>🏢 Team Workspaces</option>');
                    this.workspaces.teams.forEach(org => {
                        options.push(`<option value="${org.id}">  🏢 ${org.name}</option>`);
                    });
                }

                selector.innerHTML = options.join('');

                // Listen for changes
                selector.addEventListener('change', (e) => {
                    this.workspaces.currentSelection = e.target.value || null;
                    console.log('Workspace selection changed:',
                        this.workspaces.currentSelection ?
                            this.getWorkspaceName(this.workspaces.currentSelection) :
                            'Default Workspace');

                    // Sync with document manager to refresh document list
                    if (window.documentManager) {
                        window.documentManager.setWorkspace(this.workspaces.currentSelection);
                    }
                });
            }

            getWorkspaceName(orgId) {
                if (!orgId) return 'Default Workspace';
                const org = [...this.workspaces.personal, ...this.workspaces.teams]
                    .find(o => o.id === orgId);
                return org ? org.name : 'Unknown Workspace';
            }

            addFiles(files) {
                for (const file of files) {
                    if (this.validateFile(file)) {
                        const fileItem = {
                            id: Date.now() + Math.random(),
                            file: file,
                            name: file.name,
                            size: this.formatFileSize(file.size),
                            status: 'queued',
                            progress: 0,
                            error: null
                        };
                        this.queue.push(fileItem);
                    }
                }
                this.updateQueueDisplay();
                this.updateStatus();
            }

            validateFile(file) {
                const maxSize = 20 * 1024 * 1024; // 20MB
                const allowedTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'text/plain',
                    'text/markdown',
                    'application/rtf',
                    'application/vnd.oasis.opendocument.text'
                ];

                if (file.size > maxSize) {
                    this.showError(`File ${file.name} is too large (max 20MB)`);
                    return false;
                }

                if (!allowedTypes.includes(file.type) && !this.isTextFile(file.name)) {
                    this.showError(`File type not supported: ${file.name}`);
                    return false;
                }

                return true;
            }

            isTextFile(filename) {
                const textExtensions = ['.txt', '.md', '.rtf', '.odt'];
                return textExtensions.some(ext => filename.toLowerCase().endsWith(ext));
            }

            formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            escapeHtml(text) {
                const map = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };
                return String(text ?? '').replace(/[&<>"']/g, m => map[m]);
            }

            async readResponseError(response) {
                const fallback = `HTTP ${response.status}: ${response.statusText}`;
                const responseText = await response.text().catch(() => '');

                if (!responseText) {
                    return fallback;
                }

                try {
                    const data = JSON.parse(responseText);
                    return data.error || data.details || data.message || fallback;
                } catch (_) {
                    return responseText || fallback;
                }
            }

            async startProcessing() {
                if (this.processing || this.queue.length === 0) return;

                this.processing = true;
                this.updateStatus();
                this.logActivity('Started processing queue');

                while (this.queue.length > 0 && this.processing) {
                    const fileItem = this.queue.shift();
                    await this.processFile(fileItem);
                }

                this.processing = false;
                this.currentFile = null;
                this.updateStatus();
                this.updateQueueDisplay();
                this.updateCurrentProcessing();
                this.logActivity('Finished processing queue');
            }

            async processFile(fileItem) {
                this.currentFile = fileItem;
                fileItem.status = 'processing';
                this.updateQueueDisplay();
                this.updateCurrentProcessing();

                const workspaceName = this.getWorkspaceName(this.workspaces.currentSelection);
                this.logActivity(`Processing ${fileItem.name} → ${workspaceName}`);

                try {
                    const formData = new FormData();
                    formData.append('file', fileItem.file);

                    // Add organization context for multi-tenant mode
                    // If currentSelection is null → saves to flat personal workspace (user_id, org_id=NULL)
                    // If currentSelection has value → saves to that organization (personal project or team)
                    if (this.workspaces.isMultiTenant && this.workspaces.currentSelection) {
                        formData.append('organization_id', this.workspaces.currentSelection);
                    }

                    const response = await fetch('/api/process-document', {
                        method: 'POST',
                        body: formData
                    });

                    if (response.ok) {
                        const result = await response.json();
                        fileItem.status = 'completed';
                        fileItem.progress = 100;
                        this.results.push({
                            ...fileItem,
                            result: result,
                            timestamp: new Date().toLocaleString()
                        });
                        this.stats.processedToday++;
                        this.logActivity(`✅ Successfully processed ${fileItem.name}`);

                        // Refresh document list to show newly processed document
                        if (window.documentManager) {
                            window.documentManager.refresh();
                        }
                    } else {
                        let errorMessage = await this.readResponseError(response);

                        if (response.status === 401 && this.workspaces.isMultiTenant) {
                            const appUrl = window.getConfiguredChatRagAppUrl ? window.getConfiguredChatRagAppUrl() : window.location.origin;
                            errorMessage += ` In multi-tenant mode, sign in to the main ChatRAG app at ${appUrl} in this browser, then retry the upload from the Config UI.`;
                        }

                        throw new Error(errorMessage);
                    }
                } catch (error) {
                    fileItem.status = 'failed';
                    fileItem.error = error.message;
                    this.results.push({
                        ...fileItem,
                        result: null,
                        timestamp: new Date().toLocaleString()
                    });
                    this.logActivity(`❌ Failed to process ${fileItem.name}: ${error.message}`);
                    this.updateSuccessRate();
                    this.updateQueueDisplay();
                    this.updateCurrentProcessing();
                    this.updateResultsDisplay();
                    this.updateStatus();
                    return false;
                }

                this.updateQueueDisplay();
                this.updateCurrentProcessing();
                this.updateResultsDisplay();
                this.updateStatus();
                return fileItem.status === 'completed';
            }

            pauseProcessing() {
                this.processing = false;
                this.logActivity('Processing paused');
                this.updateStatus();
            }

            resumeProcessing() {
                if (this.queue.length > 0) {
                    this.startProcessing();
                }
            }

            clearQueue() {
                this.queue = [];
                this.currentFile = null;
                this.processing = false;
                this.updateQueueDisplay();
                this.updateStatus();
                this.updateCurrentProcessing();
                this.logActivity('Queue cleared');
            }

            clearResults() {
                this.results = [];
                this.updateResultsDisplay();
                this.logActivity('Results history cleared');
            }

            updateStatus() {
                document.getElementById('queue-status').textContent =
                    this.processing ? 'Processing' : 'Ready';
                document.getElementById('files-in-queue').textContent = this.queue.length;
                document.getElementById('processed-today').textContent = this.stats.processedToday;
                document.getElementById('success-rate').textContent = this.stats.successRate + '%';

                // Update button states
                const startBtn = document.getElementById('start-processing-btn');
                const clearBtn = document.getElementById('clear-queue-btn');
                const pauseBtn = document.getElementById('pause-btn');
                const resumeBtn = document.getElementById('resume-btn');

                startBtn.disabled = this.queue.length === 0 || this.processing;
                clearBtn.disabled = this.queue.length === 0 && !this.processing;

                if (this.processing) {
                    pauseBtn.classList.remove('hidden');
                    resumeBtn.classList.add('hidden');
                } else {
                    pauseBtn.classList.add('hidden');
                    resumeBtn.classList.add('hidden');
                }
            }

            updateQueueDisplay() {
                const emptyState = document.getElementById('queue-empty-state');
                const queueItems = document.getElementById('queue-items');

                if (this.queue.length === 0 && !this.currentFile) {
                    emptyState.classList.remove('hidden');
                    queueItems.classList.add('hidden');
                } else {
                    emptyState.classList.add('hidden');
                    queueItems.classList.remove('hidden');

                    queueItems.innerHTML = this.queue.map(item => this.createQueueItemHTML(item)).join('');
                }
            }

            createQueueItemHTML(item) {
                const safeName = this.escapeHtml(item.name);
                const safeSize = this.escapeHtml(item.size);
                const safeError = item.error ? this.escapeHtml(item.error) : '';
                const statusIcon = {
                    'queued': '⏳',
                    'processing': '🔄',
                    'completed': '✅',
                    'failed': '❌'
                }[item.status];

                const statusColor = {
                    'queued': 'text-warning',
                    'processing': 'text-info',
                    'completed': 'text-success',
                    'failed': 'text-error'
                }[item.status];

                return `
                    <div class="bg-base-100 p-4 rounded-lg">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <span class="text-lg">${statusIcon}</span>
                                <div>
                                    <div class="font-medium">${safeName}</div>
                                    <div class="text-sm text-base-content/60">${safeSize}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="${statusColor} font-medium capitalize">${item.status}</div>
                                ${safeError ? `<div class="text-xs text-error">${safeError}</div>` : ''}
                            </div>
                        </div>
                        ${item.status === 'processing' ? `
                        <div class="w-full bg-base-300 rounded-full h-2 mt-2">
                            <div class="bg-primary h-2 rounded-full transition-all duration-300" style="width: ${item.progress}%"></div>
                        </div>
                        ` : ''}
                    </div>
                `;
            }

            updateCurrentProcessing() {
                const currentProcessing = document.getElementById('current-processing');

                if (this.currentFile) {
                    currentProcessing.classList.remove('hidden');
                    document.getElementById('current-file-name').textContent = this.currentFile.name;
                } else {
                    currentProcessing.classList.add('hidden');
                }
            }

            updateResultsDisplay() {
                const emptyState = document.getElementById('results-empty-state');
                const resultsList = document.getElementById('results-list');

                if (this.results.length === 0) {
                    emptyState.classList.remove('hidden');
                    resultsList.classList.add('hidden');
                } else {
                    emptyState.classList.add('hidden');
                    resultsList.classList.remove('hidden');

                    resultsList.innerHTML = this.results.map(result => this.createResultHTML(result)).join('');
                }
            }

            createResultHTML(result) {
                const safeName = this.escapeHtml(result.name);
                const safeTimestamp = this.escapeHtml(result.timestamp);
                const safeError = result.error ? this.escapeHtml(result.error) : '';
                const statusIcon = result.status === 'completed' ? '✅' : '❌';
                const statusColor = result.status === 'completed' ? 'text-success' : 'text-error';

                return `
                    <div class="bg-base-100 p-4 rounded-lg">
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3">
                                <span class="text-lg">${statusIcon}</span>
                                <div>
                                    <div class="font-medium">${safeName}</div>
                                    <div class="text-sm text-base-content/60">${safeTimestamp}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="${statusColor} font-medium capitalize">${result.status}</div>
                                ${safeError ? `<div class="text-xs text-error">${safeError}</div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }

            updateSuccessRate() {
                const total = this.results.length;
                if (total > 0) {
                    const successful = this.results.filter(r => r.status === 'completed').length;
                    this.stats.successRate = Math.round((successful / total) * 100);
                }
            }

            logActivity(message) {
                const activityLog = document.getElementById('activity-log');
                const timestamp = new Date().toLocaleTimeString();
                const logEntry = document.createElement('div');
                logEntry.className = 'text-sm mb-1';
                logEntry.innerHTML = `<span class="text-base-content/60">[${timestamp}]</span> ${message}`;

                if (activityLog.children.length > 0 && activityLog.children[0].textContent.includes('No activity yet')) {
                    activityLog.innerHTML = '';
                }

                activityLog.insertBefore(logEntry, activityLog.firstChild);

                // Keep only last 50 entries
                while (activityLog.children.length > 50) {
                    activityLog.removeChild(activityLog.lastChild);
                }
            }

            showError(message) {
                console.error('Document Processing Error:', message);
                this.logActivity(`❌ Error: ${message}`);
            }
        }

        // Initialize drag and drop functionality
        function initDragAndDrop() {
            const dropZone = document.getElementById('drop-zone');
            const fileInput = document.getElementById('file-input');

            // Click to select files
            dropZone.addEventListener('click', () => fileInput.click());

            // Drag and drop events
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-primary', 'bg-primary/10');
            });

            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/10');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/10');

                const files = Array.from(e.dataTransfer.files);
                window.documentProcessor.addFiles(files);
            });

            // File input change
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                window.documentProcessor.addFiles(files);
                e.target.value = ''; // Reset input
            });
        }

        // Initialize event listeners
        function initDocumentEventListeners() {
            document.getElementById('select-files-btn').addEventListener('click', () => {
                document.getElementById('file-input').click();
            });

            document.getElementById('start-processing-btn').addEventListener('click', () => {
                window.documentProcessor.startProcessing();
            });

            document.getElementById('clear-queue-btn').addEventListener('click', () => {
                window.documentProcessor.clearQueue();
            });

            document.getElementById('pause-btn').addEventListener('click', () => {
                window.documentProcessor.pauseProcessing();
            });

            document.getElementById('resume-btn').addEventListener('click', () => {
                window.documentProcessor.resumeProcessing();
            });

            document.getElementById('clear-history-btn').addEventListener('click', () => {
                window.documentProcessor.clearResults();
            });
        }

        // Initialize monitor toggle
        function initMonitorToggle() {
            const toggleBtn = document.getElementById('toggle-monitor');
            const monitorPanel = document.getElementById('monitor-panel');

            toggleBtn.addEventListener('click', () => {
                if (monitorPanel.classList.contains('hidden')) {
                    monitorPanel.classList.remove('hidden');
                    toggleBtn.textContent = '📊 Hide Details';
                } else {
                    monitorPanel.classList.add('hidden');
                    toggleBtn.textContent = '📊 Show Details';
                }
            });

            // Initialize enhanced monitor features
            initEnhancedMonitor();
        }

        // Enhanced monitoring features
        function initEnhancedMonitor() {
            let activityLog = [];
            let processingStats = {
                startTime: null,
                processedDocs: 0,
                totalDocs: 0
            };

            // Export log functionality
            const exportBtn = document.getElementById('export-log-btn');
            if (exportBtn) {
                exportBtn.addEventListener('click', () => {
                    const dataStr = JSON.stringify(activityLog, null, 2);
                    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
                    const exportFileDefaultName = `processing-log-${new Date().toISOString()}.json`;

                    const linkElement = document.createElement('a');
                    linkElement.setAttribute('href', dataUri);
                    linkElement.setAttribute('download', exportFileDefaultName);
                    linkElement.click();
                });
            }

            // Clear log functionality
            const clearBtn = document.getElementById('clear-log-btn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (confirm('Clear all activity logs?')) {
                        activityLog = [];
                        const logDiv = document.getElementById('activity-log');
                        logDiv.innerHTML = '<div class="text-sm text-base-content/60">No activity yet</div>';
                    }
                });
            }

            // Removed cancel button since processing is too fast to cancel

            // Update processing speed
            function updateProcessingSpeed() {
                const speedElement = document.getElementById('processing-speed');
                if (speedElement && processingStats.startTime && processingStats.processedDocs > 0) {
                    const elapsed = (Date.now() - processingStats.startTime) / 60000; // minutes
                    const speed = (processingStats.processedDocs / elapsed).toFixed(1);
                    speedElement.textContent = `Speed: ${speed} docs/min`;
                }
            }

            // Update last update timestamp
            function updateLastUpdate() {
                const element = document.getElementById('last-update');
                if (element) {
                    const now = new Date().toLocaleTimeString();
                    element.textContent = `Last update: ${now}`;
                }
            }

            // Add activity to log with color coding
            window.updateActivityLog = function (message, type = 'info') {
                const logDiv = document.getElementById('activity-log');
                const timestamp = new Date().toLocaleTimeString();

                // Add to log array
                activityLog.push({ timestamp, message, type });

                // Create colored log entry
                const colors = {
                    'info': 'text-base-content',
                    'success': 'text-success',
                    'error': 'text-error',
                    'warning': 'text-warning',
                    'processing': 'text-info'
                };

                const entry = document.createElement('div');
                entry.className = `text-sm ${colors[type] || colors.info} mb-1`;
                entry.innerHTML = `<span class="text-xs opacity-60">[${timestamp}]</span> ${message}`;

                // Clear "No activity" message if present
                if (logDiv.querySelector('.text-base-content\\/60')) {
                    logDiv.innerHTML = '';
                }

                logDiv.appendChild(entry);
                logDiv.scrollTop = logDiv.scrollHeight;

                updateLastUpdate();
                updateProcessingSpeed();
            };

            // Simulate webhook status updates
            function updateWebhookStatus(connected) {
                const statusBadge = document.getElementById('webhook-status');
                if (statusBadge) {
                    const indicator = statusBadge.querySelector('.rounded-full');
                    if (connected) {
                        indicator.className = 'w-2 h-2 rounded-full bg-success mr-1 animate-pulse';
                        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-success mr-1 animate-pulse"></span>Connected';
                        statusBadge.className = 'badge badge-sm badge-success';
                    } else {
                        indicator.className = 'w-2 h-2 rounded-full bg-gray-400 mr-1';
                        statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-gray-400 mr-1"></span>Disconnected';
                        statusBadge.className = 'badge badge-sm';
                    }
                }
            }

            // Simplified - no longer tracking stages, progress, or ETA
            window.updateProcessingFile = function (fileName) {
                const fileNameElement = document.getElementById('current-file-name');
                if (fileNameElement) {
                    fileNameElement.textContent = fileName;
                }
            };

            // Hook into document processor events
            if (window.documentProcessor) {
                const originalProcess = window.documentProcessor.processFile;
                window.documentProcessor.processFile = async function (fileItem) {
                    updateActivityLog(`Starting: ${fileItem.file.name}`, 'processing');
                    processingStats.totalDocs++;
                    if (!processingStats.startTime) {
                        processingStats.startTime = Date.now();
                    }

                    try {
                        const result = await originalProcess.call(this, fileItem);
                        if (fileItem.status === 'completed') {
                            processingStats.processedDocs++;
                            updateActivityLog(`✓ Completed: ${fileItem.file.name}`, 'success');

                            // Auto-refresh document list after successful processing
                            if (window.documentManager && window.documentManager.loadDocuments) {
                                setTimeout(() => {
                                    window.documentManager.loadDocuments();
                                    updateActivityLog('📋 Document list refreshed', 'info');
                                }, 1000); // Small delay to ensure database is updated
                            }
                        } else {
                            updateActivityLog(`✗ Failed: ${fileItem.file.name} - ${fileItem.error || 'Unknown error'}`, 'error');
                        }

                        return result;
                    } catch (error) {
                        updateActivityLog(`✗ Failed: ${fileItem.file.name} - ${error.message}`, 'error');
                        throw error;
                    }
                };

                // Also hook into the startProcessing method to detect batch completion
                const originalStart = window.documentProcessor.startProcessing;
                window.documentProcessor.startProcessing = async function () {
                    const completedBefore = this.results.filter(r => r.status === 'completed').length;
                    const failedBefore = this.results.filter(r => r.status === 'failed').length;
                    const result = await originalStart.call(this);
                    const completedAfter = this.results.filter(r => r.status === 'completed').length;
                    const failedAfter = this.results.filter(r => r.status === 'failed').length;
                    const newCompleted = completedAfter - completedBefore;
                    const newFailures = failedAfter - failedBefore;

                    // Batch processing completed - report actual outcome.
                    if (newFailures > 0) {
                        updateActivityLog(`⚠️ Processing finished with ${newFailures} failed document(s)`, 'warning');
                    } else {
                        updateActivityLog('✅ All documents processed', 'success');
                    }

                    if (newCompleted > 0 && window.documentManager && window.documentManager.loadDocuments) {
                        setTimeout(() => {
                            window.documentManager.loadDocuments();
                            updateActivityLog('📋 Final document list refresh', 'info');
                        }, 1500);
                    }

                    return result;
                };
            }

            // Initial webhook status
            updateWebhookStatus(false);

            // Simulate webhook connection after 2 seconds (for demo)
            setTimeout(() => {
                updateWebhookStatus(true);
                updateActivityLog('Webhook connected to LlamaCloud', 'success');
            }, 2000);
        }

        // =========== RAG System Prompt functionality - SPLIT INTERFACE ===========
        // Initialize the RAG system prompt tab with split interface
        const ragPreContextArea = document.getElementById('RAG_PRE_CONTEXT');
        const ragPostContextArea = document.getElementById('RAG_POST_CONTEXT');
        const ragLivePreview = document.getElementById('PROMPT_LIVE_PREVIEW');
        const savePromptBtn = document.getElementById('savePromptBtn');
        const resetPromptBtn = document.getElementById('resetPromptBtn');
        const loadTemplateBtn = document.getElementById('loadTemplateBtn');
        const templateModal = document.getElementById('templateModal');
        const applyTemplateBtn = document.getElementById('applyTemplateBtn');
        const cancelTemplateBtn = document.getElementById('cancelTemplateBtn');
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');
        const saveTemplateModal = document.getElementById('saveTemplateModal');
        const confirmSaveTemplateBtn = document.getElementById('confirmSaveTemplateBtn');
        const cancelSaveTemplateBtn = document.getElementById('cancelSaveTemplateBtn');
        const templateName = document.getElementById('templateName');
        const templateDescription = document.getElementById('templateDescription');

        // Template definitions
        const promptTemplates = {
            helpful: {
                preContext: `You are a helpful and friendly AI assistant. Your primary goal is to provide accurate, useful information based on the documents and knowledge available to you.

When answering questions:
1. ALWAYS check the context first for relevant information
2. Use a warm, approachable tone while maintaining professionalism
3. Cite specific documents or sources when referencing the context
4. Break down complex topics into easy-to-understand explanations
5. If information isn't in the context, acknowledge this clearly`,
                postContext: `Based on the context provided, offer comprehensive and helpful answers. If specific information is missing, suggest how the user might rephrase their question or what additional information would be helpful.`
            },
            professional: {
                preContext: `You are a professional business consultant and expert advisor. Your role is to provide formal, precise, and business-oriented guidance.

When providing information:
1. ALWAYS reference the context for business data and insights
2. Maintain a formal, professional tone throughout
3. Structure answers with clear logical organization
4. Cite specific sources and documents from the context
5. Focus on actionable insights and practical recommendations
6. Use industry-standard terminology and best practices`,
                postContext: `Based on the business context provided, deliver data-driven recommendations. If the context lacks specific information, professionally indicate this and suggest appropriate business channels for obtaining the required data.`
            },
            educational: {
                preContext: `You are an experienced educator and tutor. Your mission is to help users learn and understand topics thoroughly using available educational resources.

When teaching:
1. FIRST consult the context for educational materials and information
2. Use clear language appropriate for the learner's level
3. Provide step-by-step explanations for complex topics
4. Include examples and analogies from the context
5. Reference specific educational sources
6. Break down information into digestible segments
7. Encourage critical thinking`,
                postContext: `Using the educational context provided, create engaging learning experiences. If specific information is missing from the context, guide learners toward appropriate resources and encourage focused questions.`
            },
            technical: {
                preContext: `You are a senior technical specialist and software development expert. Your responses must be precise, accurate, and technically sound.

When providing technical guidance:
1. ALWAYS consult the context for technical documentation first
2. Use precise technical terminology and industry standards
3. Provide code examples from the context when available
4. Reference official documentation and sources
5. Include implementation details and best practices
6. Highlight potential pitfalls to avoid
7. Structure responses clearly (overview, implementation, examples)`,
                postContext: `Based on the technical context provided, deliver accurate solutions and implementations. If specific technical details are missing, recommend official documentation or suggest more targeted technical queries.`
            },
            chatragSales: {
                preContext: `You are ChatRAG Sales Assistant, representing the ChatRAG intelligent document management platform.

When engaging with prospects:
1. ALWAYS reference the context for product details, pricing, and features
2. Highlight ChatRAG's capabilities: RAG technology, document processing, vector search
3. Use specific examples and case studies from the context
4. Address security and privacy concerns with facts from documentation
5. Explain pricing tiers clearly using context information
6. Guide prospects through deployment options
7. Maintain enthusiastic yet professional tone
8. Provide personalized recommendations based on needs`,
                postContext: `Using the product context provided, demonstrate ChatRAG's value proposition. If specific details are missing from the context, offer to connect prospects with our sales team for personalized demonstrations.`
            },
            customerSupport: {
                preContext: `You are a dedicated customer support specialist. Your mission is to resolve issues quickly and effectively with empathy.

When assisting customers:
1. FIRST search the context for solutions and documentation
2. Begin with empathy and acknowledge concerns
3. Use context to find solutions to issues
4. Provide clear, step-by-step instructions
5. Anticipate and address follow-up questions
6. Maintain patient, understanding tone
7. Cite relevant documentation from context
8. Escalate complex issues when appropriate`,
                postContext: `Using the support context provided, resolve customer issues effectively. If solutions aren't in the context, provide alternative support channels and ensure customers feel heard and valued.`
            },
            researchAssistant: {
                preContext: `You are an academic research assistant conducting thorough, objective research.

When supporting research:
1. PRIMARILY use the context for research materials and data
2. Approach topics with academic rigor and objectivity
3. Identify relevant papers and studies from the context
4. Critically evaluate source credibility
5. Synthesize information from multiple sources
6. Use proper academic citations for context sources
7. Highlight methodologies and limitations
8. Maintain scholarly objectivity`,
                postContext: `Based on the research context provided, synthesize findings objectively. If the context lacks specific information, identify gaps and suggest academic databases or methodologies to fill them.`
            },
            codeAssistant: {
                preContext: `You are an expert software development assistant helping developers write better code.

When assisting with code:
1. ALWAYS check the context for documentation and examples first
2. Analyze problems systematically using context information
3. Provide clean code examples from the context
4. Explain reasoning behind solutions
5. Consider performance, security, and maintainability
6. Reference official documentation from context
7. Suggest multiple approaches with trade-offs
8. Include error handling considerations`,
                postContext: `Using the technical context provided, deliver robust code solutions. If specific examples are missing from the context, suggest official documentation and general best practices.`
            },
            legalAnalyst: {
                preContext: `You are a legal document analyst providing information (not legal advice) based on available resources.

When analyzing legal content:
1. IMPORTANT: Use only the context - this is information, not legal advice
2. Identify relevant legal concepts from the context
3. Break down complex legal language clearly
4. Highlight important clauses and conditions
5. Reference specific document sections from context
6. Identify areas of importance
7. Maintain objectivity
8. Emphasize need for qualified legal counsel`,
                postContext: `Based on the legal context provided, explain concepts clearly. If information is missing from the context, strongly recommend consulting qualified legal professionals for advice.`
            },
            medicalInformation: {
                preContext: `You are a medical information specialist providing educational health information ONLY (not medical advice).

When discussing health topics:
1. DISCLAIMER: This is educational information from the context only - NOT medical advice
2. Use only evidence-based information from the context
3. Explain medical concepts in accessible language
4. Reference medical sources from the context
5. Emphasize consulting healthcare professionals
6. Never diagnose or recommend treatments
7. Present balanced medical perspectives
8. Include statistics from context only`,
                postContext: `Based strictly on the medical context provided, offer educational information. If the context lacks specific health information, emphasize consulting qualified healthcare professionals immediately.`
            },
            whatsappConversational: {
                preContext: `You are a friendly WhatsApp AI assistant. Keep responses mobile-friendly and concise.

When messaging:
1. CHECK the context first for information
2. Keep responses short for mobile reading
3. Use simple, conversational language
4. Break info into brief paragraphs
5. Prefer numbered lists over bullets
6. Summarize instead of long URLs
7. Present context info clearly and briefly
8. Occasional emoji is okay 😊`,
                postContext: `Using the context, provide brief, helpful answers. If information isn't in the context, acknowledge briefly and suggest simpler phrasing.`
            }
        };

        // Safe decode function to handle multiple layers of URL encoding
        function safeDecodeText(text) {
            if (!text) return text;
            try {
                // Recursively decode until no more encoding detected
                let decoded = text;
                let previous = '';
                let iterations = 0;
                const maxIterations = 10; // Prevent infinite loops

                while (decoded !== previous && decoded.includes('%') && iterations < maxIterations) {
                    previous = decoded;
                    try {
                        decoded = decodeURIComponent(decoded);
                        iterations++;
                    } catch (e) {
                        console.warn('Decoding iteration failed:', e);
                        break;
                    }
                }

                if (iterations > 0) {
                    console.log(`[safeDecodeText] Successfully decoded text after ${iterations} iterations`);
                }

                return decoded;
            } catch (e) {
                console.warn('Safe decoding failed, returning original text:', e);
                return text;
            }
        }

        // Load the RAG system prompt with split interface
        function fetchRagPrompt() {
            fetch('/api/config/rag-prompt')
                .then(response => response.json())
                .then(data => {
                    console.log('Fetched RAG prompt data:', data);

                    if (data.warning) {
                        showToast(data.warning, 'warning');
                    }

                    // Populate the split interface with safe decoding
                    if (ragPreContextArea) {
                        const decodedPreContext = safeDecodeText(data.preContext || '');
                        ragPreContextArea.value = decodedPreContext;
                        console.log('[fetchRagPrompt] Pre-context decoded and populated');
                    }
                    if (ragPostContextArea) {
                        const decodedPostContext = safeDecodeText(data.postContext || '');
                        ragPostContextArea.value = decodedPostContext;
                        console.log('[fetchRagPrompt] Post-context decoded and populated');
                    }

                    // Update live preview
                    updateLivePreview();
                })
                .catch(error => {
                    console.error('Error fetching RAG system prompt:', error);
                    showToast('Error loading RAG system prompt', 'error');

                    // Set default values
                    if (ragPreContextArea) {
                        ragPreContextArea.value = `You are a helpful AI assistant with access to a knowledge base. When answering questions:

1. If the context contains relevant information, use it to provide accurate and specific answers
2. If information is not available in the context, say so clearly and suggest alternative approaches  
3. Always cite your sources when referencing specific documents
4. Provide balanced, objective information rather than opinions
5. For technical topics, include practical steps or examples when appropriate`;
                    }
                    if (ragPostContextArea) {
                        ragPostContextArea.value = '';
                    }
                    updateLivePreview();
                });
        }

        // Update the live preview
        function updateLivePreview() {
            if (!ragLivePreview) {
                console.warn('Live preview element not found');
                return;
            }

            const preContext = ragPreContextArea?.value.trim() || '';
            const postContext = ragPostContextArea?.value.trim() || '';

            let fullPrompt = preContext;
            if (fullPrompt) fullPrompt += '\n\n';
            fullPrompt += 'Context:\n{{context}}';
            if (postContext) {
                fullPrompt += '\n\n' + postContext;
            }

            ragLivePreview.textContent = fullPrompt;
            console.log('Live preview updated with content:', fullPrompt.length, 'characters');
        }

        // Save the RAG system prompt with split interface
        async function saveRagPrompt(showSuccessToast = true) {
            const preContext = ragPreContextArea?.value.trim() || '';
            const postContext = ragPostContextArea?.value.trim() || '';

            if (!preContext) {
                showToast('Pre-context instructions are required', 'error');
                return false;
            }

            try {
                const response = await fetch('/api/config/rag-prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        preContext: preContext,
                        postContext: postContext
                    })
                });

                // Check if the response is OK before parsing JSON
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (data.success) {
                    if (showSuccessToast) {
                        showToast('RAG system prompt saved successfully!', 'success');
                    }
                    updateLivePreview();
                    return true;
                } else {
                    console.error('[saveRagPrompt] Save failed:', data.error);
                    showToast('Error saving RAG system prompt: ' + (data.error || 'Unknown error'), 'error');
                    return false;
                }
            } catch (error) {
                console.error('[saveRagPrompt] Error saving RAG system prompt:', error);
                showToast('Error saving RAG system prompt: ' + error.message, 'error');
                return false;
            }
        }

        // Reset the RAG system prompt to default
        function resetRagPrompt() {
            if (confirm('Are you sure you want to reset the RAG system prompt to the default?')) {
                if (ragPreContextArea) {
                    ragPreContextArea.value = `You are a helpful AI assistant with access to a knowledge base. When answering questions:

1. If the context contains relevant information, use it to provide accurate and specific answers
2. If information is not available in the context, say so clearly and suggest alternative approaches
3. Always cite your sources when referencing specific documents
4. Provide balanced, objective information rather than opinions
5. For technical topics, include practical steps or examples when appropriate`;
                }
                if (ragPostContextArea) {
                    ragPostContextArea.value = `Based on the context provided, deliver clear and comprehensive answers. If the requested information is not available in the context, acknowledge this limitation and suggest alternative approaches or clarify what additional information would be needed.`;
                }
                updateLivePreview();
                saveRagPrompt().then(success => {
                    if (success) {
                        console.log('[resetRagPrompt] Default prompt saved successfully');
                    }
                });
            }
        }

        // Template modal functions
        function showTemplateModal() {
            if (templateModal) {
                templateModal.classList.add('modal-open');

                // Clear previous selections
                document.querySelectorAll('.template-option').forEach(option => {
                    option.classList.remove('border-primary', 'bg-primary/10');
                });

                // Load custom templates
                refreshCustomTemplatesDisplay();
            }
        }

        function hideTemplateModal() {
            const modal = document.getElementById('templateModal');
            if (modal) {
                modal.classList.remove('modal-open');
                // Force close by removing any inline styles that might have been added
                modal.style.display = '';
                modal.style.opacity = '';
                modal.style.visibility = '';
                // Ensure body scroll is restored
                document.body.style.overflow = '';
                // Find and click the backdrop if it exists (DaisyUI modals use this)
                const backdrop = modal.querySelector('.modal-backdrop');
                if (backdrop) {
                    backdrop.click();
                }
            }
        }

        // Custom template management functions
        function getCustomTemplates() {
            const stored = localStorage.getItem('ragCustomTemplates');
            return stored ? JSON.parse(stored) : {};
        }

        function saveCustomTemplate(name, description, preContext, postContext) {
            const customTemplates = getCustomTemplates();
            const templateId = 'custom_' + Date.now();

            customTemplates[templateId] = {
                name: name,
                description: description || '',
                preContext: preContext,
                postContext: postContext,
                created: new Date().toISOString()
            };

            localStorage.setItem('ragCustomTemplates', JSON.stringify(customTemplates));
            return templateId;
        }

        function deleteCustomTemplate(templateId) {
            const customTemplates = getCustomTemplates();
            delete customTemplates[templateId];
            localStorage.setItem('ragCustomTemplates', JSON.stringify(customTemplates));
        }

        function refreshCustomTemplatesDisplay() {
            const customTemplates = getCustomTemplates();
            const customSection = document.getElementById('customTemplatesSection');
            const customContainer = document.getElementById('customTemplatesContainer');

            if (Object.keys(customTemplates).length > 0) {
                customSection.classList.remove('hidden');
                customContainer.innerHTML = Object.entries(customTemplates).map(([id, template]) => `
                    <div class="template-option card bg-base-200 cursor-pointer hover:bg-base-300 transition-colors" data-template="${id}">
                        <div class="card-body py-3">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-medium">${template.name}</div>
                                    <div class="text-sm text-base-content/70">${template.description}</div>
                                </div>
                                <button class="btn btn-ghost btn-xs text-error" onclick="deleteCustomTemplateAndRefresh('${id}')">✕</button>
                            </div>
                        </div>
                    </div>
                `).join('');
            } else {
                customSection.classList.add('hidden');
            }
        }

        function deleteCustomTemplateAndRefresh(templateId) {
            if (confirm('Delete this custom template?')) {
                deleteCustomTemplate(templateId);
                refreshCustomTemplatesDisplay();
            }
        }

        function showSaveTemplateModal() {
            if (templateName) templateName.value = '';
            if (templateDescription) templateDescription.value = '';
            if (saveTemplateModal) saveTemplateModal.classList.add('modal-open');
        }

        function hideSaveTemplateModal() {
            if (saveTemplateModal) saveTemplateModal.classList.remove('modal-open');
        }

        function confirmSaveTemplate() {
            const name = templateName?.value?.trim();
            const description = templateDescription?.value?.trim();
            const preContext = ragPreContextArea?.value?.trim();
            const postContext = ragPostContextArea?.value?.trim();

            if (!name) {
                showToast('Please enter a template name', 'warning');
                return;
            }

            if (!preContext && !postContext) {
                showToast('Please enter some content for the template', 'warning');
                return;
            }

            try {
                const templateId = saveCustomTemplate(name, description, preContext || '', postContext || '');
                hideSaveTemplateModal();
                refreshCustomTemplatesDisplay();
                showToast('Template saved successfully!', 'success');
            } catch (error) {
                console.error('Error saving template:', error);
                showToast('Error saving template', 'error');
            }
        }

        // Export templates functionality
        function exportTemplates() {
            try {
                const customTemplates = getCustomTemplates();
                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    templates: customTemplates
                };

                const dataStr = JSON.stringify(exportData, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `chatrag-templates-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showToast(`Exported ${Object.keys(customTemplates).length} templates`, 'success');
            } catch (error) {
                console.error('Error exporting templates:', error);
                showToast('Error exporting templates', 'error');
            }
        }

        // Import templates functionality
        function handleImportTemplates(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const importData = JSON.parse(e.target.result);

                    // Validate import data structure
                    if (!importData.templates || typeof importData.templates !== 'object') {
                        throw new Error('Invalid template file format');
                    }

                    const currentTemplates = getCustomTemplates();
                    const importedTemplates = importData.templates;
                    let importCount = 0;
                    let skipCount = 0;

                    // Process each imported template
                    for (const [id, template] of Object.entries(importedTemplates)) {
                        // Check if template already exists by name
                        const existingTemplate = Object.values(currentTemplates).find(
                            t => t.name === template.name
                        );

                        if (existingTemplate) {
                            // Ask user about overwriting
                            if (confirm(`Template "${template.name}" already exists. Overwrite?`)) {
                                // Find and remove existing template
                                const existingId = Object.keys(currentTemplates).find(
                                    key => currentTemplates[key].name === template.name
                                );
                                if (existingId) {
                                    delete currentTemplates[existingId];
                                }
                                currentTemplates[id] = template;
                                importCount++;
                            } else {
                                skipCount++;
                            }
                        } else {
                            currentTemplates[id] = template;
                            importCount++;
                        }
                    }

                    // Save updated templates
                    localStorage.setItem('ragCustomTemplates', JSON.stringify(currentTemplates));
                    refreshCustomTemplatesDisplay();

                    let message = `Imported ${importCount} templates`;
                    if (skipCount > 0) {
                        message += ` (skipped ${skipCount} existing)`;
                    }
                    showToast(message, 'success');

                } catch (error) {
                    console.error('Error importing templates:', error);
                    showToast('Error importing templates: ' + error.message, 'error');
                }
            };

            reader.readAsText(file);
            // Reset the file input
            event.target.value = '';
        }

        // Share current prompt functionality
        function shareCurrentPrompt() {
            try {
                const preContext = ragPreContextArea?.value?.trim() || '';
                const postContext = ragPostContextArea?.value?.trim() || '';

                if (!preContext && !postContext) {
                    showToast('No prompt content to share', 'warning');
                    return;
                }

                const shareData = {
                    preContext: preContext,
                    postContext: postContext,
                    timestamp: new Date().toISOString()
                };

                // Compress and encode the data
                const jsonStr = JSON.stringify(shareData);
                const compressed = btoa(encodeURIComponent(jsonStr));

                // Create shareable URL
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('sharedPrompt', compressed);

                // Copy to clipboard
                navigator.clipboard.writeText(currentUrl.toString()).then(() => {
                    showToast('Share link copied to clipboard!', 'success');

                    // Also show a modal with the link
                    showShareModal(currentUrl.toString());
                }).catch((err) => {
                    console.error('Failed to copy to clipboard:', err);
                    // Fallback: show modal with link for manual copying
                    showShareModal(currentUrl.toString());
                });

            } catch (error) {
                console.error('Error sharing prompt:', error);
                showToast('Error creating share link', 'error');
            }
        }

        // Show share modal with link
        function showShareModal(shareUrl) {
            // Create a simple modal to display the share link
            const modal = document.createElement('div');
            modal.className = 'modal modal-open';
            modal.innerHTML = `
                <div class="modal-box">
                    <h3 class="font-bold text-lg mb-4">Share System Prompt</h3>
                    <p class="mb-4">Share this link to let others use your system prompt:</p>
                    <div class="form-control">
                        <input type="text" value="${shareUrl}" class="input input-bordered" readonly>
                    </div>
                    <div class="modal-action">
                        <button class="btn btn-primary" onclick="navigator.clipboard.writeText('${shareUrl}').then(() => showToast('Copied!', 'success'))">Copy Link</button>
                        <button class="btn" onclick="this.closest('.modal').remove()">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        // Check for shared template in URL
        function checkForSharedTemplate() {
            const urlParams = new URLSearchParams(window.location.search);
            const sharedPrompt = urlParams.get('sharedPrompt');

            if (sharedPrompt) {
                try {
                    // Decode and decompress the data
                    const decoded = decodeURIComponent(atob(sharedPrompt));
                    const shareData = JSON.parse(decoded);

                    // Show confirmation modal
                    const modal = document.createElement('div');
                    modal.className = 'modal modal-open';
                    modal.innerHTML = `
                        <div class="modal-box">
                            <h3 class="font-bold text-lg mb-4">Import Shared System Prompt?</h3>
                            <p class="mb-4">Someone shared a system prompt with you. Would you like to load it?</p>
                            <div class="bg-base-200 p-4 rounded-lg mb-4">
                                <p class="text-sm text-base-content/70 mb-2">Preview:</p>
                                <p class="text-sm whitespace-pre-wrap max-h-32 overflow-auto">${shareData.preContext.substring(0, 200)}${shareData.preContext.length > 200 ? '...' : ''}</p>
                            </div>
                            <div class="modal-action">
                                <button class="btn btn-primary" id="acceptSharedPrompt">Load Prompt</button>
                                <button class="btn" id="rejectSharedPrompt">Cancel</button>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(modal);

                    // Handle acceptance
                    document.getElementById('acceptSharedPrompt').addEventListener('click', () => {
                        // Switch to the System Prompt tab
                        const promptTab = document.querySelector('[data-tab="rag-prompt"]');
                        if (promptTab) {
                            promptTab.click();
                        }

                        // Load the shared prompt
                        if (ragPreContextArea) ragPreContextArea.value = shareData.preContext || '';
                        if (ragPostContextArea) ragPostContextArea.value = shareData.postContext || '';
                        updateLivePreview();

                        modal.remove();
                        showToast('Shared prompt loaded successfully!', 'success');

                        // Remove the parameter from URL
                        urlParams.delete('sharedPrompt');
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.replaceState({}, '', newUrl);
                    });

                    // Handle rejection
                    document.getElementById('rejectSharedPrompt').addEventListener('click', () => {
                        modal.remove();
                        // Remove the parameter from URL
                        urlParams.delete('sharedPrompt');
                        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
                        window.history.replaceState({}, '', newUrl);
                    });

                } catch (error) {
                    console.error('Error loading shared prompt:', error);
                    showToast('Error loading shared prompt', 'error');
                }
            }
        }

        // System Prompt Translation Manager (Inline Version)
        const systemPromptTranslationManager = {
            translatedContent: null,

            async translateCurrentPrompt() {
                const targetLanguage = document.getElementById('promptTranslationLanguage').value.trim();
                const provider = document.getElementById('promptTranslationProvider').value;
                const preContext = document.getElementById('RAG_PRE_CONTEXT').value;
                const postContext = document.getElementById('RAG_POST_CONTEXT').value;

                if (!targetLanguage) {
                    throw new Error('Please enter a target language');
                }

                if (!preContext && !postContext) {
                    throw new Error('No prompt content to translate');
                }

                // Check if running on config server
                const isConfigServer = window.location.port === '3333';

                if (isConfigServer) {
                    // Use the config server's /api/translate endpoint
                    const textsToTranslate = [];
                    if (preContext) textsToTranslate.push(preContext);
                    if (postContext) textsToTranslate.push(postContext);

                    const response = await fetch('/api/translate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            targetLanguage,
                            texts: textsToTranslate,
                            provider
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Translation failed');
                    }

                    const result = await response.json();

                    // Reassemble the translated parts
                    let translatedPreContext = '';
                    let translatedPostContext = '';

                    if (preContext && result.translations[0]) {
                        translatedPreContext = result.translations[0];
                    }

                    if (postContext && result.translations[preContext ? 1 : 0]) {
                        translatedPostContext = result.translations[preContext ? 1 : 0];
                    }

                    // Ensure {{context}} placeholder is preserved
                    const hasContextInOriginal = preContext.includes('{{context}}') || postContext?.includes('{{context}}');
                    const hasContextInTranslation = translatedPreContext.includes('{{context}}') || translatedPostContext.includes('{{context}}');

                    if (hasContextInOriginal && !hasContextInTranslation) {
                        // If context was lost in translation, add it back
                        if (preContext.includes('{{context}}') && !translatedPreContext.includes('{{context}}')) {
                            translatedPreContext += '\n\nContext:\n{{context}}';
                        }
                    }

                    // Return in the same format as the main app endpoint
                    return {
                        success: true,
                        translated: {
                            preContext: translatedPreContext,
                            postContext: translatedPostContext
                        },
                        metadata: {
                            hasContext: translatedPreContext.includes('{{context}}') || translatedPostContext.includes('{{context}}')
                        }
                    };

                } else {
                    // Use the main app's specialized endpoint
                    const requestBody = {
                        templateKey: 'current',
                        targetLanguage,
                        provider,
                        preContext: preContext || '',
                        postContext: postContext || ''
                    };

                    const response = await fetch('/api/config/system-prompts/translate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.error || 'Translation failed');
                    }

                    const result = await response.json();
                    return result;
                }
            },

            // New inline translation methods
            async performInlineTranslation() {
                const translateBtn = document.getElementById('translatePromptBtn');
                const statusDiv = document.getElementById('promptTranslationStatus');
                const statusText = document.getElementById('promptTranslationMessage');  // Fixed ID
                const previewDiv = document.getElementById('promptTranslationPreview');
                const previewContent = document.getElementById('promptTranslationResult');  // Fixed ID
                const applyBtn = document.getElementById('applyTranslationBtn');
                const cancelBtn = document.getElementById('cancelTranslationBtn');

                try {
                    // Update UI for loading state
                    translateBtn.disabled = true;
                    translateBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Translating...';
                    statusDiv.classList.remove('hidden');
                    statusDiv.querySelector('.alert').className = 'alert alert-info';
                    statusText.textContent = 'Translating system prompt...';

                    // Perform translation using existing method
                    const result = await this.translateCurrentPrompt();

                    // Store translated content
                    this.translatedContent = result.translated;

                    // Show preview - combine pre and post context for display
                    let fullTranslatedPrompt = '';
                    const preContext = result.translated.preContext || '';
                    const postContext = result.translated.postContext || '';

                    // Check if {{context}} exists in either part
                    const hasContextPlaceholder = preContext.includes('{{context}}') || postContext.includes('{{context}}');

                    if (hasContextPlaceholder) {
                        // If {{context}} exists, highlight it
                        fullTranslatedPrompt = preContext + (postContext ? '\n\n' + postContext : '');
                        fullTranslatedPrompt = fullTranslatedPrompt.replace(
                            /\{\{context\}\}/g,
                            '<span class="bg-yellow-300 text-black px-1 rounded font-semibold">{{context}}</span>'
                        );
                    } else {
                        // If no {{context}} placeholder, add a visual separator showing where it would go
                        fullTranslatedPrompt = preContext;
                        if (preContext && postContext) {
                            fullTranslatedPrompt += '\n\n<div class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-semibold my-2">[CONTEXT WILL BE INSERTED HERE]</div>\n\n';
                            fullTranslatedPrompt += postContext;
                        } else if (preContext && !postContext) {
                            fullTranslatedPrompt += '\n\n<div class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-semibold my-2">[CONTEXT WILL BE INSERTED HERE]</div>';
                        } else if (!preContext && postContext) {
                            fullTranslatedPrompt = '<div class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-center font-semibold my-2">[CONTEXT WILL BE INSERTED HERE]</div>\n\n' + postContext;
                        }
                    }

                    previewContent.innerHTML = fullTranslatedPrompt;
                    previewDiv.classList.remove('hidden');

                    // Update status
                    statusDiv.querySelector('.alert').className = 'alert alert-success';
                    const targetLanguage = document.getElementById('promptTranslationLanguage').value;
                    statusText.textContent = `Successfully translated to ${targetLanguage}`;

                    // Show action buttons
                    applyBtn.classList.remove('hidden');
                    cancelBtn.classList.remove('hidden');
                    translateBtn.classList.add('hidden');

                } catch (error) {
                    console.error('Translation error:', error);
                    statusDiv.querySelector('.alert').className = 'alert alert-error';
                    statusText.textContent = `Translation failed: ${error.message}`;
                    translateBtn.disabled = false;
                    translateBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg> Translate';
                }
            },

            applyInlineTranslation() {
                if (!this.translatedContent) return;

                // Apply translated content to the form fields
                const preContextArea = document.getElementById('RAG_PRE_CONTEXT');
                const postContextArea = document.getElementById('RAG_POST_CONTEXT');

                if (preContextArea) {
                    preContextArea.value = this.translatedContent.preContext || '';
                }

                if (postContextArea) {
                    postContextArea.value = this.translatedContent.postContext || '';
                }

                // Update live preview
                updateLivePreview();

                // Reset translation UI
                this.cancelInlineTranslation();

                // Show success message
                showToast('Translation applied successfully', 'success');
            },

            cancelInlineTranslation() {
                // Reset UI elements
                const translateBtn = document.getElementById('translatePromptBtn');
                const applyBtn = document.getElementById('applyTranslationBtn');
                const cancelBtn = document.getElementById('cancelTranslationBtn');
                const previewDiv = document.getElementById('promptTranslationPreview');
                const statusDiv = document.getElementById('promptTranslationStatus');

                // Reset buttons
                translateBtn.classList.remove('hidden');
                translateBtn.disabled = false;
                translateBtn.innerHTML = '<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg> Translate';
                applyBtn.classList.add('hidden');
                cancelBtn.classList.add('hidden');

                // Hide preview and status
                previewDiv.classList.add('hidden');
                statusDiv.classList.add('hidden');

                // Clear stored translation
                this.translatedContent = null;
            },

            showTranslateModal(templateKey) {
                const modal = document.getElementById('translateTemplateModal');
                const label = document.getElementById('translatingTemplateLabel');

                // Get template data
                const template = promptTemplates[templateKey];
                if (!template) {
                    showToast('Template not found', 'error');
                    return;
                }

                this.currentTemplate = { key: templateKey, data: template };

                // Update modal UI
                const templateNames = {
                    helpful: 'Helpful Assistant',
                    professional: 'Professional Expert',
                    educational: 'Educational Tutor',
                    technical: 'Technical Specialist',
                    chatragSales: 'ChatRAG Sales Assistant',
                    customerSupport: 'Customer Support Specialist',
                    researchAssistant: 'Research Assistant',
                    codeAssistant: 'Code Assistant',
                    legalAnalyst: 'Legal Document Analyst',
                    medicalInformation: 'Medical Information Specialist',
                    whatsappConversational: 'WhatsApp Conversational'
                };

                label.textContent = templateNames[templateKey] || templateKey;

                // Reset modal state
                document.getElementById('translateTargetLanguage').value = '';
                document.getElementById('translateProvider').value = 'openai';
                document.getElementById('translateStatus').classList.add('hidden');
                document.getElementById('translatePreview').classList.add('hidden');
                document.getElementById('applyTranslationBtn').classList.add('hidden');
                document.getElementById('performTranslateBtn').classList.remove('hidden');
                document.getElementById('performTranslateBtnText').textContent = 'Translate';

                // Show modal
                modal.classList.add('modal-open');
            },

            hideTranslateModal() {
                const modal = document.getElementById('translateTemplateModal');
                modal.classList.remove('modal-open');
                this.currentTemplate = null;
                this.translatedContent = null;
            },

            async performTranslation() {
                if (!this.currentTemplate) return;

                const performBtn = document.getElementById('performTranslateBtn');
                const performBtnText = document.getElementById('performTranslateBtnText');
                const statusDiv = document.getElementById('translateStatus');
                const statusText = document.getElementById('translateStatusText');
                const previewDiv = document.getElementById('translatePreview');
                const previewContent = document.getElementById('translatedPromptPreview');
                const applyBtn = document.getElementById('applyTranslationBtn');

                try {
                    // Update UI for loading state
                    performBtn.disabled = true;
                    performBtnText.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Translating...';
                    statusDiv.classList.remove('hidden');
                    statusDiv.querySelector('.alert').className = 'alert alert-info';
                    statusText.textContent = 'Translating template...';

                    // Perform translation
                    const result = await this.translateTemplate(
                        this.currentTemplate.key,
                        this.currentTemplate.data
                    );

                    // Store translated content
                    this.translatedContent = result.translated;

                    // Show preview
                    const assembledPrompt = result.translated.preContext +
                        (result.translated.postContext ? '\n\n' + result.translated.postContext : '');
                    previewContent.textContent = assembledPrompt;
                    previewDiv.classList.remove('hidden');

                    // Update status
                    statusDiv.querySelector('.alert').className = 'alert alert-success';
                    statusText.textContent = `Successfully translated to ${document.getElementById('translateTargetLanguage').value}`;

                    // Show apply button, hide translate button
                    applyBtn.classList.remove('hidden');
                    performBtn.classList.add('hidden');

                } catch (error) {
                    console.error('Translation error:', error);
                    statusDiv.querySelector('.alert').className = 'alert alert-error';
                    statusText.textContent = `Translation failed: ${error.message}`;
                    performBtn.disabled = false;
                    performBtnText.textContent = 'Translate';
                }
            },

            applyTranslation() {
                if (!this.translatedContent) return;

                // Apply translated content to the form
                const preContextArea = document.getElementById('RAG_PRE_CONTEXT');
                const postContextArea = document.getElementById('RAG_POST_CONTEXT');

                if (preContextArea) {
                    preContextArea.value = this.translatedContent.preContext;
                }
                if (postContextArea) {
                    postContextArea.value = this.translatedContent.postContext;
                }

                // Update live preview
                updateLivePreview();

                // Close modal
                this.hideTranslateModal();

                // Show success message
                const targetLang = document.getElementById('translateTargetLanguage').value;
                showToast(`Applied ${targetLang} translation. Remember to save your changes!`, 'success');
            }
        };

        // Track initialization to prevent multiple calls
        let systemPromptInitialized = false;

        // Initialize System Prompt functionality
        function initSystemPrompt() {
            if (systemPromptInitialized) {
                console.log('System Prompt already initialized, updating preview');
                updateLivePreview();
                return;
            }

            console.log('Initializing System Prompt functionality');
            systemPromptInitialized = true;

            // Set initial preview immediately (even before API loads)
            updateLivePreview();

            // Load current prompt on tab activation
            fetchRagPrompt();

            // Add event listeners for live preview updates
            if (ragPreContextArea) {
                ragPreContextArea.addEventListener('input', updateLivePreview);
            }
            if (ragPostContextArea) {
                ragPostContextArea.addEventListener('input', updateLivePreview);
            }

            // Button event listeners
            if (savePromptBtn) {
                savePromptBtn.addEventListener('click', async () => {
                    // Disable button and show loading state
                    const originalHTML = savePromptBtn.innerHTML;
                    savePromptBtn.disabled = true;
                    savePromptBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Saving...';

                    try {
                        // Save the prompt
                        await saveRagPrompt();
                    } catch (error) {
                        console.error('[savePromptBtn] Error during save:', error);
                    } finally {
                        // Always re-enable button and restore text
                        savePromptBtn.disabled = false;
                        savePromptBtn.innerHTML = originalHTML;
                    }
                });
            }
            if (resetPromptBtn) {
                resetPromptBtn.addEventListener('click', resetRagPrompt);
            }
            if (loadTemplateBtn) {
                loadTemplateBtn.addEventListener('click', showTemplateModal);
            }
            if (saveTemplateBtn) {
                saveTemplateBtn.addEventListener('click', showSaveTemplateModal);
            }

            // Template modal event listeners
            if (cancelTemplateBtn) {
                cancelTemplateBtn.addEventListener('click', hideTemplateModal);
            }

            // Translation button event listeners
            document.querySelectorAll('.translate-template-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const templateKey = btn.dataset.template;
                    systemPromptTranslationManager.showTranslateModal(templateKey);
                });
            });

            // Translation modal event listeners
            const performTranslateBtn = document.getElementById('performTranslateBtn');
            const applyTranslationBtn = document.getElementById('applyTranslationBtn');
            const cancelTranslateBtn = document.getElementById('cancelTranslateBtn');

            if (performTranslateBtn) {
                performTranslateBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.performTranslation();
                });
            }

            if (applyTranslationBtn) {
                applyTranslationBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.applyTranslation();
                });
            }

            if (cancelTranslateBtn) {
                cancelTranslateBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.hideTranslateModal();
                });
            }

            // Inline translation event listeners for System Prompt section
            const translatePromptBtn = document.getElementById('translatePromptBtn');
            const applyInlineTranslationBtn = document.getElementById('applyTranslationBtn');
            const cancelInlineTranslationBtn = document.getElementById('cancelTranslationBtn');

            if (translatePromptBtn) {
                translatePromptBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.performInlineTranslation();
                });
            }

            if (applyInlineTranslationBtn) {
                applyInlineTranslationBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.applyInlineTranslation();
                });
            }

            if (cancelInlineTranslationBtn) {
                cancelInlineTranslationBtn.addEventListener('click', () => {
                    systemPromptTranslationManager.cancelInlineTranslation();
                });
            }

            if (applyTemplateBtn) {
                applyTemplateBtn.addEventListener('click', async () => {
                    const selectedOption = document.querySelector('.template-option.border-primary');
                    if (!selectedOption) {
                        showToast('Please select a template first', 'warning');
                        return;
                    }

                    const templateType = selectedOption.dataset.template;
                    const originalText = applyTemplateBtn.textContent;

                    // Enhanced logging for debugging
                    console.log('[applyTemplate] Starting template application:', {
                        templateType,
                        selectedOption: selectedOption.textContent?.trim(),
                        timestamp: new Date().toISOString()
                    });

                    try {
                        // Disable the button and show enhanced loading state
                        applyTemplateBtn.disabled = true;
                        applyTemplateBtn.innerHTML = '<span class="loading loading-spinner loading-sm"></span> Applying...';

                        // Load template content
                        let template = null;
                        if (templateType.startsWith('custom_')) {
                            // Custom template
                            const customTemplates = getCustomTemplates();
                            template = customTemplates[templateType];
                            console.log('[applyTemplate] Loading custom template:', templateType, template ? 'found' : 'not found');
                        } else {
                            // Built-in template
                            template = promptTemplates[templateType];
                            console.log('[applyTemplate] Loading built-in template:', templateType, template ? 'found' : 'not found');
                        }

                        if (!template) {
                            throw new Error(`Template "${templateType}" not found`);
                        }

                        // Apply template content to form fields
                        const preContext = template.preContext || '';
                        const postContext = template.postContext || '';

                        console.log('[applyTemplate] Applying template content:', {
                            preContextLength: preContext.length,
                            postContextLength: postContext.length,
                            hasPreContext: !!preContext,
                            hasPostContext: !!postContext
                        });

                        ragPreContextArea.value = preContext;
                        ragPostContextArea.value = postContext;

                        // Update live preview
                        updateLivePreview();

                        // Show saving indicator
                        showToast('Template loaded - now saving...', 'info');

                        // Hide modal first
                        hideTemplateModal();

                        // Enhanced saving with retry mechanism
                        const maxRetries = 3;
                        let saveSuccess = false;
                        let lastError = null;

                        for (let attempt = 1; attempt <= maxRetries; attempt++) {
                            try {
                                console.log(`[applyTemplate] Save attempt ${attempt}/${maxRetries}`);
                                applyTemplateBtn.innerHTML = `<span class="loading loading-spinner loading-sm"></span> Saving (${attempt}/${maxRetries})...`;

                                // Add timeout to prevent hanging
                                const savePromise = saveRagPrompt(false);
                                const timeoutPromise = new Promise((_, reject) => {
                                    setTimeout(() => reject(new Error('Save operation timed out')), 10000);
                                });

                                saveSuccess = await Promise.race([savePromise, timeoutPromise]);

                                if (saveSuccess) {
                                    console.log(`[applyTemplate] Save successful on attempt ${attempt}`);
                                    break;
                                } else {
                                    lastError = new Error(`Save failed on attempt ${attempt}`);
                                    console.warn(`[applyTemplate] Save failed on attempt ${attempt}, retrying...`);
                                }
                            } catch (error) {
                                lastError = error;
                                console.error(`[applyTemplate] Save error on attempt ${attempt}:`, error);

                                if (attempt < maxRetries) {
                                    // Wait before retrying
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        }

                        // Verify save by reading back the data
                        if (saveSuccess) {
                            try {
                                console.log('[applyTemplate] Verifying save by reading back data...');
                                const verifyResponse = await fetch('/api/config/rag-prompt', {
                                    method: 'GET',
                                    headers: { 'Content-Type': 'application/json' }
                                });

                                if (verifyResponse.ok) {
                                    const verifyData = await verifyResponse.json();
                                    const isVerified = verifyData.preContext === preContext && verifyData.postContext === postContext;

                                    console.log('[applyTemplate] Save verification:', {
                                        isVerified,
                                        expectedPreLength: preContext.length,
                                        actualPreLength: verifyData.preContext?.length || 0,
                                        expectedPostLength: postContext.length,
                                        actualPostLength: verifyData.postContext?.length || 0
                                    });

                                    if (isVerified) {
                                        showToast(`✅ "${selectedOption.textContent?.trim()}" template applied and saved successfully!`, 'success');
                                    } else {
                                        showToast('⚠️ Template applied but save verification failed. Please check the settings.', 'warning');
                                    }
                                } else {
                                    console.warn('[applyTemplate] Save verification request failed');
                                    showToast('✅ Template applied and saved (verification unavailable)', 'success');
                                }
                            } catch (verifyError) {
                                console.error('[applyTemplate] Save verification error:', verifyError);
                                showToast('✅ Template applied and saved (verification failed)', 'success');
                            }
                        } else {
                            console.error('[applyTemplate] All save attempts failed:', lastError);
                            showToast(`❌ Template applied but failed to save after ${maxRetries} attempts. Please try saving manually.`, 'error');
                        }

                    } catch (error) {
                        console.error('[applyTemplate] Critical error during template application:', {
                            error: error.message,
                            stack: error.stack,
                            templateType,
                            timestamp: new Date().toISOString()
                        });

                        // Show detailed error information
                        const errorMessage = error.message || 'Unknown error occurred';
                        showToast(`❌ Error applying template: ${errorMessage}`, 'error');

                        // Try to restore the original form state if possible
                        try {
                            fetchRagPrompt();
                        } catch (restoreError) {
                            console.error('[applyTemplate] Failed to restore original state:', restoreError);
                        }

                    } finally {
                        // Always restore button state
                        if (applyTemplateBtn) {
                            applyTemplateBtn.disabled = false;
                            applyTemplateBtn.innerHTML = originalText;
                        }

                        console.log('[applyTemplate] Template application completed:', {
                            templateType,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }

            // Save template modal event listeners
            if (cancelSaveTemplateBtn) {
                cancelSaveTemplateBtn.addEventListener('click', hideSaveTemplateModal);
            }
            if (confirmSaveTemplateBtn) {
                confirmSaveTemplateBtn.addEventListener('click', confirmSaveTemplate);
            }

            // New export/import/share event listeners
            const exportTemplatesBtn = document.getElementById('exportTemplatesBtn');
            const importTemplatesBtn = document.getElementById('importTemplatesBtn');
            const shareCurrentBtn = document.getElementById('shareCurrentBtn');
            const importTemplateFile = document.getElementById('importTemplateFile');

            if (exportTemplatesBtn) {
                exportTemplatesBtn.addEventListener('click', exportTemplates);
            }
            if (importTemplatesBtn) {
                importTemplatesBtn.addEventListener('click', () => {
                    importTemplateFile.click();
                });
            }
            if (importTemplateFile) {
                importTemplateFile.addEventListener('change', handleImportTemplates);
            }
            if (shareCurrentBtn) {
                shareCurrentBtn.addEventListener('click', shareCurrentPrompt);
            }

            // Check for shared template in URL on page load
            checkForSharedTemplate();

            // Template selection handling
            document.addEventListener('click', (e) => {
                if (e.target.closest('.template-option')) {
                    // Clear previous selections
                    document.querySelectorAll('.template-option').forEach(option => {
                        option.classList.remove('border-primary', 'bg-primary/10');
                    });

                    // Select clicked template
                    const option = e.target.closest('.template-option');
                    option.classList.add('border-primary', 'bg-primary/10');
                }
            });

            // Modal backdrop close handling
            if (templateModal) {
                templateModal.addEventListener('click', (e) => {
                    if (e.target === templateModal) {
                        hideTemplateModal();
                    }
                });
            }
            if (saveTemplateModal) {
                saveTemplateModal.addEventListener('click', (e) => {
                    if (e.target === saveTemplateModal) {
                        hideSaveTemplateModal();
                    }
                });
            }

            console.log('System Prompt functionality initialized');
        }

        // System Prompt initialization is now handled by tab switching
        // No automatic initialization - only when user opens the tab

        // =========== End RAG System Prompt functionality ===========

        // =========== WhatsApp Configuration functionality ===========
        let whatsappConfigInitialized = false;

        // Initialize WhatsApp configuration
        function initWhatsAppConfig() {
            if (whatsappConfigInitialized) {
                console.log('WhatsApp config already initialized, refreshing values');
                loadWhatsAppConfig();
                return;
            }

            console.log('Initializing WhatsApp configuration');
            whatsappConfigInitialized = true;

            // Load current configuration
            loadWhatsAppConfig();
        }

        // Handle provider toggle
        function toggleWhatsAppProvider() {
            const provider = document.getElementById('whatsapp-provider').value;
            const koyebConfig = document.getElementById('koyeb-config');
            const flyioConfig = document.getElementById('flyio-config');
            const flyioApiKeySection = document.getElementById('flyio-api-key-section');

            if (provider === 'koyeb') {
                koyebConfig.classList.remove('hidden');
                flyioConfig.classList.add('hidden');
                if (flyioApiKeySection) {
                    flyioApiKeySection.classList.add('hidden');
                }
            } else if (provider === 'flyio') {
                koyebConfig.classList.add('hidden');
                flyioConfig.classList.remove('hidden');
                if (flyioApiKeySection) {
                    flyioApiKeySection.classList.remove('hidden');
                }
            }
        }

        // Load WhatsApp configuration values
        async function loadWhatsAppConfig() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();
                const config = data.config || {};

                // Set provider dropdown
                const providerSelect = document.getElementById('whatsapp-provider');
                if (providerSelect) {
                    providerSelect.value = config.WHATSAPP_PROVIDER || 'koyeb';
                    toggleWhatsAppProvider(); // Update visibility
                }

                // Set checkbox values
                const whatsappEnabled = document.getElementById('whatsapp-enabled');
                if (whatsappEnabled) {
                    whatsappEnabled.checked = config.NEXT_PUBLIC_WHATSAPP_ENABLED === 'true';
                }

                const mcpEnabled = document.getElementById('whatsapp-enable-mcp');
                if (mcpEnabled) {
                    mcpEnabled.checked = config.WHATSAPP_ENABLE_MCP === 'true';
                }

                const webSearchEnabled = document.getElementById('whatsapp-enable-web-search');
                if (webSearchEnabled) {
                    webSearchEnabled.checked = config.WHATSAPP_ENABLE_WEB_SEARCH === 'true';
                }

                // Set text input values
                const fields = [
                    'koyeb-baileys-url',
                    'koyeb-api-key',
                    'flyio-baileys-url',
                    'flyio-api-key',
                    'whatsapp-webhook-secret',
                    'whatsapp-webhook-url',
                    'whatsapp-max-tokens',
                    'whatsapp-system-prompt-suffix',
                    'whatsapp-max-sessions',
                    'whatsapp-queue-size'
                ];

                fields.forEach(fieldId => {
                    const element = document.getElementById(fieldId);
                    if (element) {
                        const key = element.getAttribute('data-key');
                        if (key && config[key]) {
                            element.value = config[key];
                        }
                    }
                });

                // Set model dropdown
                const modelSelect = document.getElementById('whatsapp-default-model');
                if (modelSelect && config.WHATSAPP_DEFAULT_MODEL) {
                    modelSelect.value = config.WHATSAPP_DEFAULT_MODEL;
                }

            } catch (error) {
                console.error('Error loading WhatsApp configuration:', error);
                showToast('Failed to load WhatsApp configuration', 'error');
            }
        }

        // Save WhatsApp configuration
        async function saveWhatsAppConfig() {
            // Get button reference at the start
            const saveButton = document.querySelector('#whatsapp button.btn-primary');
            let originalText = 'Save WhatsApp Configuration';

            try {
                // Show loading state
                if (saveButton) {
                    originalText = saveButton.textContent;
                    saveButton.disabled = true;
                    saveButton.textContent = 'Saving...';
                }

                // Collect all WhatsApp-related values
                const updates = {};

                // Get checkbox values
                const whatsappEnabled = document.getElementById('whatsapp-enabled');
                if (whatsappEnabled) {
                    updates.NEXT_PUBLIC_WHATSAPP_ENABLED = whatsappEnabled.checked ? 'true' : 'false';
                }

                const mcpEnabled = document.getElementById('whatsapp-enable-mcp');
                if (mcpEnabled) {
                    updates.WHATSAPP_ENABLE_MCP = mcpEnabled.checked ? 'true' : 'false';
                }

                const webSearchEnabled = document.getElementById('whatsapp-enable-web-search');
                if (webSearchEnabled) {
                    updates.WHATSAPP_ENABLE_WEB_SEARCH = webSearchEnabled.checked ? 'true' : 'false';
                }

                // Get provider value
                const providerSelect = document.getElementById('whatsapp-provider');
                if (providerSelect) {
                    updates.WHATSAPP_PROVIDER = providerSelect.value;
                }

                // Get text input values
                const fields = [
                    'koyeb-baileys-url',
                    'koyeb-api-key',
                    'flyio-baileys-url',
                    'flyio-api-key',
                    'whatsapp-webhook-secret',
                    'whatsapp-webhook-url',
                    'whatsapp-max-tokens',
                    'whatsapp-system-prompt-suffix',
                    'whatsapp-max-sessions',
                    'whatsapp-queue-size'
                ];

                fields.forEach(fieldId => {
                    const element = document.getElementById(fieldId);
                    if (element) {
                        const key = element.getAttribute('data-key');
                        if (key) {
                            updates[key] = element.value || '';
                        }
                    }
                });

                // Get model dropdown value
                const modelSelect = document.getElementById('whatsapp-default-model');
                if (modelSelect) {
                    updates.WHATSAPP_DEFAULT_MODEL = modelSelect.value;
                }

                // Update ConfigManager's internal config to prevent stale values
                if (window.configManager) {
                    Object.assign(window.configManager.config, updates);
                }

                // Save configuration
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updates)
                });

                if (!response.ok) {
                    throw new Error('Failed to save configuration');
                }

                const result = await response.json();

                // Show success message
                showToast('WhatsApp configuration saved successfully!', 'success');

                // Dispatch custom event to notify components
                window.dispatchEvent(new Event('whatsapp-config-changed'));
                window.dispatchEvent(new Event('config-saved'));

                // Restore button state
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText;
                }

            } catch (error) {
                console.error('Error saving WhatsApp configuration:', error);
                showToast('Failed to save WhatsApp configuration: ' + error.message, 'error');

                // Restore button state
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = originalText;
                }
            }
        }

        // Make saveWhatsAppConfig available globally
        window.saveWhatsAppConfig = saveWhatsAppConfig;

        // =========== End WhatsApp Configuration functionality ===========

        // === Shared helpers ===

        // =========== Admin Management functionality ===========
        let adminManagementInitialized = false;

        // Initialize admin management functionality
        function initAdminManagement() {
            // Elements (declared before the early return so the hoisted helpers below can use them)
            const adminUsersList = document.getElementById('adminUsersList');
            const adminSetupStatus = document.getElementById('adminSetupStatus');
            const adminCountStatus = document.getElementById('adminCountStatus');
            const checkAdminBtn = document.getElementById('checkAdminBtn');
            const adminActionResult = document.getElementById('adminActionResult');
            const addAdminForm = document.getElementById('addAdminForm');
            const setupAdminBtn = document.getElementById('setupAdminBtn');
            const setupAdminResult = document.getElementById('setupAdminResult');

            if (adminManagementInitialized) {
                console.log('Admin management already initialized, checking status');
                checkAdminStatus();
                fetchAdminUsers();
                return;
            }

            console.log('Initializing admin management functionality');
            adminManagementInitialized = true;

            // Check admin status immediately
            checkAdminStatus();

            // Setup event listeners
            if (checkAdminBtn) {
                checkAdminBtn.addEventListener('click', runCheckAdmin);
            }

            if (setupAdminBtn) {
                setupAdminBtn.addEventListener('click', handleSetupAdmin);
            }

            if (addAdminForm) {
                console.log('Setting up add admin form handler');
                addAdminForm.addEventListener('submit', handleAddAdmin);
            }

            // Fetch admin users
            fetchAdminUsers();

            async function checkAdminStatus() {
                try {
                    console.log('Checking admin status...');
                    updateStatusIndicator(adminSetupStatus, 'loading', 'Checking...');
                    updateStatusIndicator(adminCountStatus, 'loading', 'Checking...');

                    const response = await fetch('/api/config/admin/status');
                    console.log('Admin status response received');

                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('Admin status data:', data);

                    // Update status indicators
                    updateStatusIndicator(adminSetupStatus,
                        data.isSetup ? 'success' : 'error',
                        data.isSetup ? 'Configured' : 'Not Configured');

                    updateStatusIndicator(adminCountStatus,
                        data.adminCount > 0 ? 'success' : 'warning',
                        `${data.adminCount} admin(s)`);

                    // If there's an error, display it
                    if (data.hasError) {
                        console.warn('Admin status check reported an error:', data.errorMessage);
                        showAdminResult(`Status Check Error: ${data.errorMessage}`, 'error');
                    }

                } catch (error) {
                    console.error('Error checking admin status:', error);
                    updateStatusIndicator(adminSetupStatus, 'error', 'Error');
                    updateStatusIndicator(adminCountStatus, 'error', 'Error');
                    showAdminResult(`Error checking admin status: ${error.message}`, 'error');
                }
            }

            function updateStatusIndicator(element, status, text) {
                if (!element) {
                    console.error('Status element not found');
                    return;
                }

                // Clear existing content
                element.innerHTML = '';

                // Add status indicator
                if (status === 'loading') {
                    element.innerHTML = `
                        <span class="loading loading-spinner loading-xs"></span>
                        <span class="ml-2">${text}</span>
                    `;
                    element.className = 'stat-value text-sm text-warning';
                } else if (status === 'success') {
                    element.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="ml-2">${text}</span>
                    `;
                    element.className = 'stat-value text-sm text-success';
                } else if (status === 'error') {
                    element.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span class="ml-2">${text}</span>
                    `;
                    element.className = 'stat-value text-sm text-error';
                } else if (status === 'warning') {
                    element.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        <span class="ml-2">${text}</span>
                    `;
                    element.className = 'stat-value text-sm text-warning';
                }
            }

            async function fetchAdminUsers() {
                try {
                    console.log('Fetching admin users...');
                    if (!adminUsersList) {
                        console.error('Admin users list element not found');
                        return;
                    }

                    adminUsersList.innerHTML = `
                        <div class="flex items-center gap-2 text-sm text-base-content/60">
                            <span class="loading loading-spinner loading-xs"></span>
                            Loading admin users...
                        </div>
                    `;

                    const response = await fetch('/api/config/admin/users');
                    console.log('Admin users response received');

                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log('Admin users data:', data);

                    if (data.error) {
                        adminUsersList.innerHTML = `<div class="text-error text-sm">Error: ${data.error}</div>`;
                        return;
                    }

                    if (data.users && data.users.length > 0) {
                        adminUsersList.innerHTML = '';
                        data.users.forEach(user => {
                            const userDiv = document.createElement('div');
                            userDiv.className = 'flex justify-between items-center p-3 bg-base-100 rounded-lg border';
                            userDiv.innerHTML = `
                                <div class="flex-1">
                                    <div class="font-medium text-sm">${user.email || 'Unknown Email'}</div>
                                    <div class="text-xs text-base-content/60">ID: ${user.id}</div>
                                </div>
                                <div class="flex-shrink-0">
                                    <button class="btn btn-outline btn-xs text-error" 
                                            ${user.id === 'from-env-file' ? 'disabled title="Cannot remove primary admin"' : `onclick="removeAdmin('${user.id}', '${user.email}')"`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        Remove
                                    </button>
                                </div>
                            `;
                            adminUsersList.appendChild(userDiv);
                        });
                    } else {
                        adminUsersList.innerHTML = '<div class="text-base-content/60 text-sm">No admin users found.</div>';
                    }

                    // Show partial data warning if needed
                    if (data.isPartial) {
                        const warningDiv = document.createElement('div');
                        warningDiv.className = 'text-warning text-sm mt-2';
                        warningDiv.textContent = `Note: Showing partial data. ${data.message || ''}`;
                        adminUsersList.appendChild(warningDiv);
                    }
                } catch (error) {
                    console.error('Error fetching admin users:', error);
                    adminUsersList.innerHTML = `<div class="text-error text-sm">Error loading admin users: ${error.message}</div>`;
                }
            }

            async function runAdminScript(script, loadingText) {
                try {
                    console.log(`Running admin script: ${script}`);

                    // Show loading state
                    showAdminResult(loadingText, 'loading');

                    // Disable buttons while script is running
                    setAdminButtonsDisabled(true);

                    const response = await fetch('/api/config/admin/script', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ script })
                    });

                    const data = await response.json();
                    console.log(`Script ${script} response:`, data);

                    if (response.ok) {
                        showAdminResult(data.output || 'Operation completed successfully', 'success');

                        // Refresh status and user list after operations
                        setTimeout(() => {
                            checkAdminStatus();
                            fetchAdminUsers();
                        }, 1000);
                    } else {
                        showAdminResult(`Error: ${data.error || 'Unknown error'}`, 'error');
                    }

                } catch (error) {
                    console.error(`Error running ${script}:`, error);
                    showAdminResult(`Error: ${error.message || 'Failed to execute script'}`, 'error');
                } finally {
                    // Re-enable buttons
                    setAdminButtonsDisabled(false);
                }
            }

            function setAdminButtonsDisabled(disabled) {
                if (checkAdminBtn) {
                    checkAdminBtn.disabled = disabled;
                }
            }

            function showAdminResult(message, type = 'info') {
                if (!adminActionResult) return;

                adminActionResult.classList.remove('hidden');
                adminActionResult.innerHTML = '';

                let icon = '';
                let className = 'p-4 bg-base-100 rounded-lg border';

                if (type === 'success') {
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success inline mr-2"><polyline points="20 6 9 17 4 12"/></svg>';
                    className += ' border-success';
                } else if (type === 'error') {
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error inline mr-2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                    className += ' border-error';
                } else if (type === 'loading') {
                    icon = '<span class="loading loading-spinner loading-sm text-warning inline mr-2"></span>';
                    className += ' border-warning';
                } else {
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-info inline mr-2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
                    className += ' border-info';
                }

                adminActionResult.className = className;
                adminActionResult.innerHTML = `${icon}<span class="text-sm">${message}</span>`;
            }

            // Admin operation functions
            async function runCheckAdmin() {
                await runAdminScript('check-admin', 'Checking admin setup...');
            }

            async function handleSetupAdmin() {
                const emailField = document.getElementById('ADMIN_EMAIL');
                const passwordField = document.getElementById('ADMIN_PASSWORD');

                if (!emailField || !passwordField) {
                    showSetupResult('Email and password fields not found', 'error');
                    return;
                }

                const email = emailField.value.trim();
                const password = passwordField.value.trim();

                if (!email || !password) {
                    showSetupResult('Please enter both email and password', 'error');
                    return;
                }

                try {
                    // Disable button and show loading
                    setupAdminBtn.disabled = true;
                    setupAdminBtn.innerHTML = `
                        <span class="loading loading-spinner loading-xs"></span>
                        <span class="ml-2">Setting up admin...</span>
                    `;

                    showSetupResult('Setting up primary admin...', 'loading');

                    const response = await fetch('/api/admin/setup', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });

                    const data = await response.json();
                    console.log('Setup admin response:', data);

                    if (response.ok) {
                        showSetupResult(data.message || 'Admin setup successfully!', 'success');

                        // Refresh admin status
                        setTimeout(() => {
                            checkAdminStatus();
                            fetchAdminUsers();
                        }, 1000);
                    } else {
                        showSetupResult(`Error: ${data.error || 'Unknown error'}`, 'error');
                    }

                } catch (error) {
                    console.error('Error setting up admin:', error);
                    showSetupResult(`Error: ${error.message}`, 'error');
                } finally {
                    // Re-enable button
                    setupAdminBtn.disabled = false;
                    setupAdminBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        Setup Primary Admin
                    `;
                }
            }

            function showSetupResult(message, type) {
                const resultDiv = setupAdminResult;
                if (!resultDiv) return;

                resultDiv.classList.remove('hidden');

                let icon = '';
                let className = 'border-base-300 bg-base-100';

                if (type === 'success') {
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success inline mr-2"><polyline points="20 6 9 17 4 12"/></svg>';
                    className = 'border-success bg-success/10';
                } else if (type === 'error') {
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error inline mr-2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                    className = 'border-error bg-error/10';
                } else if (type === 'loading') {
                    icon = '<span class="loading loading-spinner loading-xs mr-2"></span>';
                    className = 'border-warning bg-warning/10';
                }

                resultDiv.className = `mt-4 p-4 rounded-lg border ${className}`;
                resultDiv.innerHTML = `${icon}<span class="text-sm">${message}</span>`;
            }

            // Password reset function removed - no longer needed in passwordless system

            async function handleAddAdmin(e) {
                e.preventDefault();
                console.log('Add admin form submitted');

                const emailField = document.getElementById('newAdminEmail');

                if (!emailField) {
                    showAdminResult('Email field not found', 'error');
                    return;
                }

                const email = emailField.value.trim();

                if (!email) {
                    showAdminResult('Email is required', 'error');
                    return;
                }

                try {
                    showAdminResult('Adding new admin...', 'loading');

                    const response = await fetch('/api/config/admin/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ email })
                    });

                    const data = await response.json();
                    console.log('Add admin response:', data);

                    if (response.ok) {
                        showAdminResult('Admin user added successfully!', 'success');
                        emailField.value = '';

                        // Refresh admin users list
                        setTimeout(() => {
                            fetchAdminUsers();
                            checkAdminStatus();
                        }, 1000);
                    } else {
                        showAdminResult(`Error adding admin: ${data.error || 'Unknown error'}`, 'error');
                    }

                } catch (error) {
                    console.error('Error adding admin:', error);
                    showAdminResult(`Error adding admin: ${error.message}`, 'error');
                }
            }

            // Make removeAdmin global so it can be called from inline onclick
            window.removeAdmin = async function (adminId, email) {
                if (!adminId) {
                    showAdminResult('Admin ID is required', 'error');
                    return;
                }

                if (!confirm(`Are you sure you want to remove admin ${email}?`)) {
                    return;
                }

                try {
                    showAdminResult('Removing admin...', 'loading');

                    const response = await fetch('/api/config/admin/remove', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ adminId })
                    });

                    const data = await response.json();
                    console.log('Remove admin response:', data);

                    if (response.ok) {
                        showAdminResult('Admin user removed successfully!', 'success');

                        // Refresh admin users list
                        setTimeout(() => {
                            fetchAdminUsers();
                            checkAdminStatus();
                        }, 1000);
                    } else {
                        showAdminResult(`Error removing admin: ${data.error || 'Unknown error'}`, 'error');
                    }

                } catch (error) {
                    console.error('Error removing admin:', error);
                    showAdminResult(`Error removing admin: ${error.message}`, 'error');
                }
            };

            console.log('Admin management functionality initialized');
        }

        // =========== End Admin Management functionality ===========

        // =========== Deployment Mode Management functionality ===========
        let deploymentModeInitialized = false;

        function initDeploymentMode() {
            if (deploymentModeInitialized) {
                console.log('Deployment Mode already initialized');
                return;
            }

            console.log('Initializing Deployment Mode functionality');
            deploymentModeInitialized = true;

            const radioButtons = document.querySelectorAll('input[name="NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE"]');
            const singleTenantInstructions = document.getElementById('single-tenant-instructions');
            const multiTenantInstructions = document.getElementById('multi-tenant-instructions');

            // Function to update instructions visibility
            function updateInstructions() {
                const selectedMode = document.querySelector('input[name="NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE"]:checked')?.value;

                if (selectedMode === 'single-tenant') {
                    singleTenantInstructions?.classList.remove('hidden');
                    multiTenantInstructions?.classList.add('hidden');
                } else if (selectedMode === 'multi-tenant') {
                    singleTenantInstructions?.classList.add('hidden');
                    multiTenantInstructions?.classList.remove('hidden');
                }
            }

            // Add change event listeners to radio buttons
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function () {
                    console.log('Deployment mode changed to:', this.value);
                    updateInstructions();
                    // Auto-save the deployment mode
                    if (window.configManager) {
                        window.configManager.saveConfig();
                    }
                });
            });

            // Add change event listeners to feature flag checkboxes
            const featureFlagCheckboxes = document.querySelectorAll(
                'input[name="ENABLE_ORGANIZATIONS"], input[name="ENABLE_TEAM_INVITES"], input[name="ENABLE_STORAGE_QUOTAS"], input[name="ENABLE_USAGE_ANALYTICS"]'
            );

            featureFlagCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function () {
                    console.log('Feature flag changed:', this.name, '=', this.checked);
                    // Update config with the new value
                    if (window.configManager) {
                        window.configManager.updateConfig(this.name, this.checked.toString());
                        // Auto-save when feature flags change
                        window.configManager.saveConfig();
                    }
                });
            });

            // Load current deployment mode from config
            async function loadDeploymentMode() {
                try {
                    const response = await fetch('/api/config');
                    const data = await response.json();
                    const config = data.config || {};

                    const deploymentMode = config.NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE || 'single-tenant';
                    const radioToCheck = document.querySelector(`input[name="NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE"][value="${deploymentMode}"]`);

                    if (radioToCheck) {
                        radioToCheck.checked = true;
                        updateInstructions();
                    }

                    // Load multi-tenant feature flags
                    const enableOrgs = config.ENABLE_ORGANIZATIONS === 'true';
                    const enableInvites = config.ENABLE_TEAM_INVITES === 'true';
                    const enableQuotas = config.ENABLE_STORAGE_QUOTAS === 'true';
                    const enableAnalytics = config.ENABLE_USAGE_ANALYTICS === 'true';

                    const orgsCheckbox = document.querySelector('input[name="ENABLE_ORGANIZATIONS"]');
                    const invitesCheckbox = document.querySelector('input[name="ENABLE_TEAM_INVITES"]');
                    const quotasCheckbox = document.querySelector('input[name="ENABLE_STORAGE_QUOTAS"]');
                    const analyticsCheckbox = document.querySelector('input[name="ENABLE_USAGE_ANALYTICS"]');

                    if (orgsCheckbox) orgsCheckbox.checked = enableOrgs;
                    if (invitesCheckbox) invitesCheckbox.checked = enableInvites;
                    if (quotasCheckbox) quotasCheckbox.checked = enableQuotas;
                    if (analyticsCheckbox) analyticsCheckbox.checked = enableAnalytics;
                } catch (error) {
                    console.error('Error loading deployment mode:', error);
                    // Default to single-tenant on error
                    const defaultRadio = document.querySelector('input[name="NEXT_PUBLIC_CHATRAG_DEPLOYMENT_MODE"][value="single-tenant"]');
                    if (defaultRadio) {
                        defaultRadio.checked = true;
                        updateInstructions();
                    }
                }
            }

            // Initial load
            loadDeploymentMode();
            updateInstructions();

            console.log('Deployment Mode functionality initialized');
        }

        // =========== End Deployment Mode Management functionality ===========

        // =========== MCP Config Management functionality ===========
        let mcpConfigInitialized = false;

        // Initialize MCP Config functionality
        function initMcpConfig() {
            if (mcpConfigInitialized) {
                console.log('MCP Config already initialized, refreshing data');
                if (window.mcpConfig) {
                    window.mcpConfig.loadServers();
                    window.mcpConfig.renderServerList();
                    updateMcpStats();
                }
                return;
            }

            console.log('Initializing MCP Config functionality');
            mcpConfigInitialized = true;

            // Wait for MCP Config manager to be available
            if (typeof McpConfigManager === 'undefined') {
                console.log('MCP Config Manager not available, waiting...');
                setTimeout(() => {
                    initMcpConfig();
                }, 500);
                return;
            }

            // Initialize MCP Config Manager if not already done
            if (!window.mcpConfig) {
                window.mcpConfig = new McpConfigManager();

                // Add discover built-in servers function
                window.mcpConfig.discoverBuiltinServers = function () {
                    this.showInfo('Built-in servers (Zapier) can be configured via environment variables. Check your .env.local file for MCP_ZAPIER_ENDPOINT settings.');
                };

                console.log('MCP Config Manager initialized');
            } else {
                // If already initialized, refresh the data
                window.mcpConfig.loadServers().then(() => {
                    window.mcpConfig.renderServerList();
                    updateMcpStats();
                });
            }
        }

        // Update MCP statistics in the dashboard
        function updateMcpStats() {
            if (!window.mcpConfig) return;

            // Use the counts stored from the API response
            const totalServers = window.mcpConfig.totalCount || 0;
            const builtinServers = window.mcpConfig.builtinCount || 0;

            // Calculate active servers from the servers array
            const servers = window.mcpConfig.servers || [];
            const activeServers = servers.filter(s => s.enabled).length;

            // Update the DOM elements
            const totalElement = document.getElementById('mcp-total-servers');
            const activeElement = document.getElementById('mcp-active-servers');
            const builtinElement = document.getElementById('mcp-builtin-servers');

            if (totalElement) totalElement.textContent = totalServers;
            if (activeElement) activeElement.textContent = activeServers;
            if (builtinElement) builtinElement.textContent = builtinServers;

            console.log(`[MCP Stats] Total: ${totalServers}, Active: ${activeServers}, Built-in: ${builtinServers}`);
        }

        // =========== End Suggestions Configuration Management ===========

        // =========== AI Model Configuration Management ===========
        let modelConfig = {
            provider: 'openrouter',
            openaiModels: [],
            openrouterModels: [],
            groqModels: []
        };

        // Initialize model configuration when AI tab is opened
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-tab="ai"]') || e.target.closest('[data-tab="ai"]')) {
                setTimeout(() => {
                    initModelConfiguration();
                }, 100);
            }
        });

        async function initModelConfiguration() {
            try {
                // Load current configuration - use relative URL to work on any port
                const response = await fetch('../api/config/models');
                if (!response.ok) {
                    // If API fails, use defaults from environment
                    console.warn('API not available, using default configuration');

                    // Get defaults from the config manager if available
                    const defaultProvider = window.configManager?.config?.NEXT_PUBLIC_AI_PROVIDER || 'openrouter';
                    const defaultOpenAIModels = window.configManager?.config?.NEXT_PUBLIC_OPENAI_MODELS || JSON.stringify([
                        { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                        { id: 'gpt-4.1', displayName: 'GPT-4.1' },
                        { id: 'o3', displayName: 'o3' },
                        { id: 'o4-mini', displayName: 'o4 Mini' }
                    ]);
                    const defaultOpenRouterModels = window.configManager?.config?.NEXT_PUBLIC_OPENROUTER_MODELS || JSON.stringify([
                        { id: 'anthropic/claude-sonnet-4.5', displayName: 'Claude Sonnet 4.5', isDefault: true },
                        { id: 'openai/gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                        { id: 'openai/gpt-4.1', displayName: 'GPT-4.1' },
                        { id: 'anthropic/claude-opus-4.1', displayName: 'Claude Opus 4.1' },
                        { id: 'google/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite' },
                        { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                        { id: 'meta-llama/llama-4-maverick', displayName: 'Llama 4 Maverick', isOpenSource: true },
                        { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', displayName: 'Venice: Uncensored', isFree: true, isOpenSource: true, isUncensored: true }
                    ]);
                    const defaultGroqModels = window.configManager?.config?.NEXT_PUBLIC_GROQ_MODELS || JSON.stringify([
                        { id: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B Versatile' },
                        { id: 'openai/gpt-oss-120b', displayName: 'GPT-OSS 120B' },
                        { id: 'groq/compound', displayName: 'Groq Compound' },
                        { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'Kimi K2 Instruct' }
                    ]);

                    // Safe JSON parsing helper
                    const safeJsonParse = (value, fallback = []) => {
                        if (typeof value === 'object' && value !== null) {
                            return value; // Already parsed
                        }
                        if (typeof value === 'string') {
                            try {
                                return JSON.parse(value);
                            } catch (e) {
                                console.warn('Failed to parse JSON value:', value, e);
                                return fallback;
                            }
                        }
                        return fallback;
                    };

                    modelConfig = {
                        provider: defaultProvider,
                        openaiModels: safeJsonParse(defaultOpenAIModels, [
                            { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                            { id: 'gpt-4.1', displayName: 'GPT-4.1' },
                            { id: 'o3', displayName: 'o3' },
                            { id: 'o4-mini', displayName: 'o4 Mini' }
                        ]),
                        openrouterModels: safeJsonParse(defaultOpenRouterModels, [
                            { id: 'anthropic/claude-sonnet-4.5', displayName: 'Claude Sonnet 4.5', isDefault: true },
                            { id: 'openai/gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                            { id: 'openai/gpt-4.1', displayName: 'GPT-4.1' },
                            { id: 'anthropic/claude-opus-4.1', displayName: 'Claude Opus 4.1' },
                            { id: 'google/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite' },
                            { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                            { id: 'meta-llama/llama-4-maverick', displayName: 'Llama 4 Maverick', isOpenSource: true },
                            { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', displayName: 'Venice: Uncensored', isFree: true, isOpenSource: true, isUncensored: true }
                        ]),
                        groqModels: safeJsonParse(defaultGroqModels, [
                            { id: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B Versatile' },
                            { id: 'openai/gpt-oss-120b', displayName: 'GPT-OSS 120B' },
                            { id: 'groq/compound', displayName: 'Groq Compound' },
                            { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'Kimi K2 Instruct' }
                        ])
                    };
                } else {
                    modelConfig = await response.json();
                }

                // Set provider selector
                const providerSelect = document.getElementById('ai-provider-select');
                if (providerSelect) {
                    providerSelect.value = modelConfig.provider;
                    // Remove existing listeners to avoid duplicates
                    const newSelect = providerSelect.cloneNode(true);
                    providerSelect.parentNode.replaceChild(newSelect, providerSelect);

                    newSelect.addEventListener('change', (e) => {
                        modelConfig.provider = e.target.value;
                        renderModels();
                    });
                }

                // Render models
                renderModels();
            } catch (error) {
                console.error('Failed to load model configuration:', error);

                // Determine error type for better user feedback
                let errorMessage = 'Using default model configuration';
                if (error.name === 'SyntaxError') {
                    errorMessage = 'JSON parsing error - using defaults. Check .env.local model configurations.';
                } else if (error.message?.includes('fetch')) {
                    errorMessage = 'API connection error - using defaults. Check if server is running.';
                } else {
                    errorMessage = `Configuration error: ${error.message} - using defaults.`;
                }

                // Use defaults on error
                modelConfig = {
                    provider: 'openrouter',
                    openaiModels: [
                        { id: 'gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                        { id: 'gpt-4.1', displayName: 'GPT-4.1' },
                        { id: 'o3', displayName: 'o3' },
                        { id: 'o4-mini', displayName: 'o4 Mini' }
                    ],
                    openrouterModels: [
                        { id: 'anthropic/claude-sonnet-4.5', displayName: 'Claude Sonnet 4.5', isDefault: true },
                        { id: 'openai/gpt-4.1-mini', displayName: 'GPT-4.1 Mini' },
                        { id: 'openai/gpt-4.1', displayName: 'GPT-4.1' },
                        { id: 'anthropic/claude-opus-4.1', displayName: 'Claude Opus 4.1' },
                        { id: 'google/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite' },
                        { id: 'google/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                        { id: 'meta-llama/llama-4-maverick', displayName: 'Llama 4 Maverick', isOpenSource: true },
                        { id: 'cognitivecomputations/dolphin-mistral-24b-venice-edition:free', displayName: 'Venice: Uncensored', isFree: true, isOpenSource: true, isUncensored: true }
                    ],
                    groqModels: [
                        { id: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B Versatile' },
                        { id: 'openai/gpt-oss-120b', displayName: 'GPT-OSS 120B' },
                        { id: 'groq/compound', displayName: 'Groq Compound' },
                        { id: 'moonshotai/kimi-k2-instruct-0905', displayName: 'Kimi K2 Instruct' }
                    ]
                };

                renderModels();
                showToast(errorMessage, 'warning');

                // Add error indicator to the UI
                const providerSelect = document.getElementById('ai-provider-select');
                if (providerSelect) {
                    providerSelect.style.borderColor = '#f59e0b'; // warning color
                    providerSelect.title = 'Configuration loaded with defaults due to: ' + error.message;
                }
            }
        }

        // Drag and Drop State
        let draggedElement = null;
        let draggedIndex = null;

        function handleDragStart(e) {
            draggedElement = e.currentTarget;
            draggedIndex = parseInt(draggedElement.dataset.index);
            draggedElement.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', draggedElement.innerHTML);
        }

        function handleDragEnd(e) {
            e.currentTarget.classList.remove('dragging');

            // Remove all drag-over classes
            document.querySelectorAll('.model-item').forEach(item => {
                item.classList.remove('drag-over');
            });
        }

        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleDragEnter(e) {
            if (e.currentTarget !== draggedElement) {
                e.currentTarget.classList.add('drag-over');
            }
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('drag-over');
        }

        function handleDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            const dropTarget = e.currentTarget;
            const dropIndex = parseInt(dropTarget.dataset.index);

            // Don't do anything if dropping on itself
            if (draggedIndex === dropIndex) {
                return false;
            }

            // Get the models array
            let models;
            if (modelConfig.provider === 'openai') {
                models = modelConfig.openaiModels;
            } else if (modelConfig.provider === 'groq') {
                models = modelConfig.groqModels;
            } else {
                models = modelConfig.openrouterModels;
            }

            // Remove dragged item and insert at new position
            const draggedModel = models.splice(draggedIndex, 1)[0];
            models.splice(dropIndex, 0, draggedModel);

            // Update the modelConfig
            if (modelConfig.provider === 'openai') {
                modelConfig.openaiModels = models;
            } else if (modelConfig.provider === 'groq') {
                modelConfig.groqModels = models;
            } else {
                modelConfig.openrouterModels = models;
            }

            // Re-render models with new order
            renderModels();

            // Show feedback
            showToast('Models reordered! Click "Save Model Configuration" to persist changes.', 'info');

            return false;
        }

        function renderModels() {
            const container = document.getElementById('models-container');
            if (!container) return;

            let models;
            if (modelConfig.provider === 'openai') {
                models = modelConfig.openaiModels;
            } else if (modelConfig.provider === 'groq') {
                models = modelConfig.groqModels;
            } else {
                models = modelConfig.openrouterModels;
            }

            container.innerHTML = '';

            if (models.length === 0) {
                container.innerHTML = '<p class="text-base-content/70">No models configured for this provider.</p>';
                return;
            }

            models.forEach((model, index) => {
                const modelDiv = document.createElement('div');
                const isDefault = model.isDefault === true;
                modelDiv.className = `model-item flex items-center gap-2 p-2 rounded ${isDefault ? 'bg-primary/10 border-2 border-primary' : 'bg-base-300'}`;
                modelDiv.draggable = true;
                modelDiv.dataset.index = index;

                // Define theme-aware colors FIRST (before using them)
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                const purpleColor = isDark ? '#c084fc' : '#9333ea';
                const blueColor = isDark ? '#60a5fa' : '#2563eb';
                const redColor = isDark ? '#f472b6' : '#dc2626';
                const orangeColor = isDark ? '#fb923c' : '#ea580c';

                // Add brain icon for reasoning models (SVG to match other icons)
                const reasoningIndicator = model.supportsReasoning
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block ml-2" style="color: ${orangeColor}; vertical-align: middle;" title="Supports ${model.reasoningMethod || 'reasoning'}"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`
                    : '';

                // Add gift icon for free models (using SVG to match main app)
                const freeIndicator = model.isFree
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block ml-2" style="color: ${purpleColor}; vertical-align: middle;" title="Free on OpenRouter"><path d="M12 7v14"/><path d="M16 3a4 4 0 0 0-8 0"/><path d="M7 12h10"/><rect x="3" y="7" width="18" height="14" rx="2"/></svg>`
                    : '';
                const openSourceIndicator = model.isOpenSource
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block ml-2" style="color: ${blueColor}; vertical-align: middle;" title="Open Source"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`
                    : '';
                const uncensoredIndicator = model.isUncensored
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block ml-2" style="color: ${redColor}; vertical-align: middle;" title="Uncensored Model"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="8" y1="12" y2="12"/><line x1="16" x2="16" y1="12" y2="12"/></svg>`
                    : '';

                // Default indicator (star icon for first model)
                const defaultBadge = isDefault
                    ? `<span class="badge badge-primary badge-sm ml-2" title="Default Model">⭐ Default</span>`
                    : '';

                // Set as default button (only show for non-default models)
                const setDefaultButton = !isDefault
                    ? `<button onclick="setAsDefault(${index})" class="btn btn-sm btn-outline" title="Set as default model">⭐ Set Default</button>`
                    : '';

                modelDiv.innerHTML = `
                    <div class="drag-handle mr-2" style="font-size: 1.2rem; line-height: 1;" title="Drag to reorder">
                        ☰
                    </div>
                    <div class="flex-1">
                        <span class="font-medium">${model.displayName}</span>
                        <span class="text-sm text-base-content/70 ml-2">(${model.id})</span>
                        ${reasoningIndicator}
                        ${freeIndicator}
                        ${openSourceIndicator}
                        ${uncensoredIndicator}
                        ${defaultBadge}
                    </div>
                    <div class="flex gap-2">
                        ${setDefaultButton}
                        <button onclick="removeModel(${index})" class="btn btn-sm btn-error btn-outline">Remove</button>
                    </div>
                `;

                // Add drag event listeners
                modelDiv.addEventListener('dragstart', handleDragStart);
                modelDiv.addEventListener('dragend', handleDragEnd);
                modelDiv.addEventListener('dragover', handleDragOver);
                modelDiv.addEventListener('drop', handleDrop);
                modelDiv.addEventListener('dragenter', handleDragEnter);
                modelDiv.addEventListener('dragleave', handleDragLeave);

                container.appendChild(modelDiv);
            });
        }

        function toggleTokenLimitSettings() {
            const checkbox = document.getElementById('USE_CUSTOM_TOKEN_LIMIT');
            const settings = document.getElementById('token-limit-settings');

            if (checkbox && settings) {
                settings.style.display = checkbox.checked ? 'block' : 'none';
            }
        }

        // =========== Auto-Fetch Model Info Functions ===========

        function toggleReasoningConfig() {
            const checkbox = document.getElementById('new-model-reasoning');
            const config = document.getElementById('reasoning-config');

            if (checkbox && config) {
                config.style.display = checkbox.checked ? 'block' : 'none';
            }
        }

        async function fetchModelInfo() {
            const idInput = document.getElementById('new-model-id');
            const fetchBtn = document.getElementById('fetch-model-btn');
            const fetchBtnText = document.getElementById('fetch-btn-text');
            const statusDiv = document.getElementById('model-fetch-status');

            if (!idInput || !fetchBtn || !fetchBtnText || !statusDiv) return;

            const modelId = idInput.value.trim();
            if (!modelId) {
                showToast('Please enter a Model ID first', 'error');
                return;
            }

            // Enhanced client-side logging
            console.log(`\n🔍 === Config UI Model Fetch Request ===`);
            console.log(`📊 Timestamp: ${new Date().toISOString()}`);
            console.log(`🆔 Model ID: "${modelId}"`);
            console.log(`🌐 Current URL: ${window.location.href}`);
            console.log(`🔗 Base URL: ${window.location.origin}`);

            // Show loading state
            fetchBtn.disabled = true;
            fetchBtnText.textContent = '⏳ Fetching...';
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<span class="text-blue-600">🔍 Looking up model information from OpenRouter...</span>';

            try {
                // Fix API URL - check if we're on config server or the main app
                const isConfigServer = window.location.port === '3333';
                const apiUrl = isConfigServer
                    ? `../api/config/openrouter-model-info?modelId=${encodeURIComponent(modelId)}`
                    : `/api/config/openrouter-model-info?modelId=${encodeURIComponent(modelId)}`;

                console.log(`📡 Calling API: ${apiUrl} (Config Server: ${isConfigServer})`);

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        // Add browser-specific headers that might be needed
                    }
                });

                console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
                console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ API Error Response:`, errorText);

                    if (response.status === 404) {
                        throw new Error(`Model '${modelId}' not found in OpenRouter catalog`);
                    }
                    throw new Error(`API request failed: ${response.status} - ${errorText}`);
                }

                const data = await response.json();

                if (data.success && data.model) {
                    // Auto-fill all the form fields
                    fillModelForm(data.model);

                    // Show success status with enhanced visual feedback
                    const confidence = data.model.confidence;
                    const confidenceEmoji = confidence === 'high' ? '🎯' : confidence === 'medium' ? '⚡' : '💡';
                    const reasoningStatus = data.model.supportsReasoning
                        ? `🧠 Reasoning: ${data.model.reasoningMethod} (${confidence} confidence)`
                        : '❌ No reasoning support detected';

                    statusDiv.innerHTML = `
                        <div class="alert alert-success shadow-lg" style="animation: slideIn 0.3s ease-out;">
                            <div>
                                <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <div class="font-bold">✅ Model found! ${confidenceEmoji} Auto-filled successfully</div>
                                    <div class="text-sm">📝 ${data.model.displayName}</div>
                                    <div class="text-sm">🔢 ${data.model.contextLength.toLocaleString()} tokens | ${data.model.isFree ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block" style="color: ${document.documentElement.getAttribute('data-theme') === 'dark' ? '#c084fc' : '#9333ea'}; vertical-align: middle;"><path d="M12 7v14"/><path d="M16 3a4 4 0 0 0-8 0"/><path d="M7 12h10"/><rect x="3" y="7" width="18" height="14" rx="2"/></svg> Free` : '💰 Paid'}</div>
                                    <div class="text-sm">${reasoningStatus}</div>
                                </div>
                            </div>
                        </div>
                    `;

                    // Add animation styles if not already present
                    if (!document.querySelector('#slideInAnimation')) {
                        const style = document.createElement('style');
                        style.id = 'slideInAnimation';
                        style.textContent = `
                            @keyframes slideIn {
                                from {
                                    opacity: 0;
                                    transform: translateY(-10px);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0);
                                }
                            }
                        `;
                        document.head.appendChild(style);
                    }

                    showToast('Model information fetched and auto-filled successfully!', 'success');
                } else {
                    throw new Error(data.error || 'Unknown error occurred');
                }

            } catch (error) {
                console.error('Error fetching model info:', error);

                // Enhanced error handling with better visual feedback
                const errorMessage = error.message || 'Unknown error occurred';
                statusDiv.innerHTML = `
                    <div class="alert alert-warning shadow-lg" style="animation: slideIn 0.3s ease-out;">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div>
                                <div class="font-bold">⚠️ Auto-fetch couldn't find the model</div>
                                <div class="text-sm">${errorMessage}</div>
                                <div class="mt-2">
                                    <span class="text-sm">💡 You can still add it manually:</span>
                                    <div class="btn-group mt-1">
                                        <button onclick="enableManualMode()" class="btn btn-xs btn-secondary">
                                            ⚙️ Manual Setup
                                        </button>
                                        <button onclick="retryAutoFetch()" class="btn btn-xs btn-primary">
                                            🔄 Retry
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Add animation styles if not already present
                if (!document.querySelector('#slideInAnimation')) {
                    const style = document.createElement('style');
                    style.id = 'slideInAnimation';
                    style.textContent = `
                        @keyframes slideIn {
                            from {
                                opacity: 0;
                                transform: translateY(-10px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                    `;
                    document.head.appendChild(style);
                }

                showToast('Auto-fetch failed, but you can add the model manually', 'warning');
            } finally {
                // Restore button state
                fetchBtn.disabled = false;
                fetchBtnText.textContent = '🔍 Auto-Fill';
            }
        }

        function fillModelForm(modelInfo) {
            // Fill basic fields
            document.getElementById('new-model-name').value = modelInfo.displayName || '';
            document.getElementById('new-model-context').value = modelInfo.contextLength || '';
            document.getElementById('new-model-description').value = modelInfo.description || '';

            // Set checkboxes
            document.getElementById('new-model-free').checked = modelInfo.isFree || false;
            document.getElementById('new-model-opensource').checked = modelInfo.isOpenSource || false;
            document.getElementById('new-model-uncensored').checked = modelInfo.isUncensored || false;
            document.getElementById('new-model-reasoning').checked = modelInfo.supportsReasoning || false;

            // Toggle reasoning config visibility
            toggleReasoningConfig();

            // Fill reasoning configuration if supported
            if (modelInfo.supportsReasoning) {
                if (modelInfo.reasoningMethod) {
                    document.getElementById('reasoning-method').value = modelInfo.reasoningMethod;
                }
                if (modelInfo.defaultEffort) {
                    document.getElementById('default-effort').value = modelInfo.defaultEffort;
                }
                if (modelInfo.maxTokensLimit) {
                    document.getElementById('max-tokens-limit').value = modelInfo.maxTokensLimit;
                }
                if (modelInfo.minTokens) {
                    document.getElementById('min-tokens').value = modelInfo.minTokens;
                }
            }
        }

        function resetModelForm() {
            // Reset all form fields
            document.getElementById('new-model-id').value = '';
            document.getElementById('new-model-name').value = '';
            document.getElementById('new-model-context').value = '';
            document.getElementById('new-model-description').value = '';

            document.getElementById('new-model-free').checked = false;
            document.getElementById('new-model-opensource').checked = false;
            document.getElementById('new-model-uncensored').checked = false;
            document.getElementById('new-model-reasoning').checked = false;

            document.getElementById('reasoning-method').value = 'max_tokens';
            document.getElementById('default-effort').value = 'medium';
            document.getElementById('max-tokens-limit').value = '';
            document.getElementById('min-tokens').value = '';

            // Hide reasoning config and status
            document.getElementById('reasoning-config').style.display = 'none';
            document.getElementById('model-fetch-status').style.display = 'none';

            showToast('Form reset', 'info');
        }

        function enableManualMode() {
            const statusDiv = document.getElementById('model-fetch-status');
            const modelId = document.getElementById('new-model-id').value.trim();

            // Auto-fill what we can from the model ID
            if (!document.getElementById('new-model-name').value && modelId) {
                // Generate a reasonable display name from model ID
                const displayName = modelId.split('/').pop()
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                document.getElementById('new-model-name').value = displayName;
            }

            statusDiv.innerHTML = `
                <div class="text-yellow-600">
                    ⚙️ Manual mode enabled. Please configure the model settings below:
                    <div class="text-sm mt-1">
                        💡 If this is a reasoning model, check "🧠 Supports Reasoning" and configure the settings
                    </div>
                </div>
            `;

            showToast('Manual mode enabled - configure the model as needed', 'info');
        }

        function retryAutoFetch() {
            // Simply call fetchModelInfo again
            fetchModelInfo();
        }

        async function testOpenRouterConnection() {
            const statusDiv = document.getElementById('model-fetch-status');
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<span class="text-blue-600">🔧 Testing OpenRouter API connection...</span>';

            try {
                console.log(`🔧 Testing OpenRouter API connection...`);

                // Fix API URL for config server vs main app
                const isConfigServer = window.location.port === '3333';
                const testUrl = isConfigServer
                    ? '../api/config/test-openrouter'
                    : '/api/config/test-openrouter';

                console.log(`📡 Calling test API: ${testUrl} (Config Server: ${isConfigServer})`);

                const response = await fetch(testUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();

                if (data.success) {
                    console.log(`✅ OpenRouter API test successful:`, data);

                    const testResults = data.testModels.map(model =>
                        `${model.found ? '✅' : '❌'} ${model.id}`
                    ).join('<br>');

                    statusDiv.innerHTML = `
                        <div class="text-green-600">
                            ✅ OpenRouter API connection successful!<br>
                            📊 Total models available: ${data.totalModels}<br>
                            <div class="text-xs mt-1">
                                <strong>Test Models:</strong><br>
                                ${testResults}
                            </div>
                        </div>
                    `;

                    showToast('OpenRouter API connection test passed!', 'success');
                } else {
                    console.error(`❌ OpenRouter API test failed:`, data);

                    statusDiv.innerHTML = `
                        <div class="text-red-600">
                            ❌ OpenRouter API test failed:<br>
                            ${data.error}<br>
                            <div class="text-xs mt-1">${data.details}</div>
                        </div>
                    `;

                    showToast('OpenRouter API connection test failed: ' + data.error, 'error');
                }

            } catch (error) {
                console.error('Connection test error:', error);
                statusDiv.innerHTML = `
                    <div class="text-red-600">
                        ❌ Connection test failed: ${error.message}<br>
                        <div class="text-xs mt-1">Check browser console for details</div>
                    </div>
                `;
                showToast('Connection test failed: ' + error.message, 'error');
            }
        }

        // =========== End Auto-Fetch Functions ===========

        function addModel() {
            const idInput = document.getElementById('new-model-id');
            const nameInput = document.getElementById('new-model-name');
            const freeCheckbox = document.getElementById('new-model-free');
            const openSourceCheckbox = document.getElementById('new-model-opensource');
            const uncensoredCheckbox = document.getElementById('new-model-uncensored');
            const reasoningCheckbox = document.getElementById('new-model-reasoning');

            if (!idInput || !nameInput || !freeCheckbox || !openSourceCheckbox || !uncensoredCheckbox || !reasoningCheckbox) return;

            const id = idInput.value.trim();
            const displayName = nameInput.value.trim();
            const isFree = freeCheckbox.checked;
            const isOpenSource = openSourceCheckbox.checked;
            const isUncensored = uncensoredCheckbox.checked;
            const supportsReasoning = reasoningCheckbox.checked;

            if (!id || !displayName) {
                showToast('Please fill in both Model ID and Display Name', 'error');
                return;
            }

            // Build the model object with all fields
            const newModel = {
                id,
                displayName,
                ...(isFree && { isFree: true }),
                ...(isOpenSource && { isOpenSource: true }),
                ...(isUncensored && { isUncensored: true }),
                ...(document.getElementById('new-model-context').value && {
                    contextLength: parseInt(document.getElementById('new-model-context').value)
                }),
                ...(document.getElementById('new-model-description').value && {
                    description: document.getElementById('new-model-description').value
                })
            };

            // Add reasoning configuration if enabled
            if (supportsReasoning) {
                newModel.supportsReasoning = true;

                const reasoningMethod = document.getElementById('reasoning-method').value;
                if (reasoningMethod) {
                    newModel.reasoningMethod = reasoningMethod;
                }

                const defaultEffort = document.getElementById('default-effort').value;
                if (defaultEffort) {
                    newModel.defaultEffort = defaultEffort;
                }

                const maxTokensLimit = document.getElementById('max-tokens-limit').value;
                if (maxTokensLimit) {
                    newModel.maxTokensLimit = parseInt(maxTokensLimit);
                }

                const minTokens = document.getElementById('min-tokens').value;
                if (minTokens) {
                    newModel.minTokens = parseInt(minTokens);
                }
            }

            if (modelConfig.provider === 'openai') {
                modelConfig.openaiModels.push(newModel);
            } else if (modelConfig.provider === 'groq') {
                modelConfig.groqModels.push(newModel);
            } else {
                modelConfig.openrouterModels.push(newModel);
            }

            // Reset the form
            resetModelForm();

            renderModels();

            const reasoningStatus = supportsReasoning
                ? ` with 🧠 ${newModel.reasoningMethod} reasoning`
                : '';
            showToast(`Model '${displayName}' added successfully${reasoningStatus}!`, 'success');
        }

        function removeModel(index) {
            if (modelConfig.provider === 'openai') {
                modelConfig.openaiModels.splice(index, 1);
            } else if (modelConfig.provider === 'groq') {
                modelConfig.groqModels.splice(index, 1);
            } else {
                modelConfig.openrouterModels.splice(index, 1);
            }

            renderModels();
            showToast('Model removed successfully', 'success');
        }

        function setAsDefault(index) {
            // Get the models array for the current provider
            let models;
            if (modelConfig.provider === 'openai') {
                models = modelConfig.openaiModels;
            } else if (modelConfig.provider === 'groq') {
                models = modelConfig.groqModels;
            } else {
                models = modelConfig.openrouterModels;
            }

            // Remove isDefault flag from all models
            models.forEach(model => {
                delete model.isDefault;
            });

            // Set the selected model as default
            models[index].isDefault = true;

            // Update the modelConfig
            if (modelConfig.provider === 'openai') {
                modelConfig.openaiModels = models;
            } else if (modelConfig.provider === 'groq') {
                modelConfig.groqModels = models;
            } else {
                modelConfig.openrouterModels = models;
            }

            // Re-render the models list to show the new default
            renderModels();

            // Show success message
            showToast(`'${models[index].displayName}' is now the default model! 🌟`, 'success');

            // Show info about saving
            setTimeout(() => {
                showToast('Remember to click "Save Model Configuration" to apply changes to .env.local', 'info');
            }, 1500);
        }

        async function saveModelConfiguration() {
            try {
                // Log the configuration being saved for debugging
                console.log('📝 Saving model configuration:', modelConfig);
                console.log(`📊 Total models to save: OpenAI=${modelConfig.openaiModels.length}, Groq=${modelConfig.groqModels.length}, OpenRouter=${modelConfig.openrouterModels.length}`);

                // Show saving state
                const saveButton = event.target;
                const originalText = saveButton?.textContent || 'Save Model Configuration';
                if (saveButton) {
                    saveButton.disabled = true;
                    saveButton.textContent = '⏳ Saving to .env.local...';
                }

                const response = await fetch('../api/config/models', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(modelConfig)
                });

                console.log(`📡 Save response status: ${response.status}`);

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('❌ Save failed:', errorData);
                    throw new Error(`Failed to save: ${response.status} - ${errorData}`);
                }

                const result = await response.json();
                console.log('✅ Save successful:', result);

                if (result.success) {
                    showToast('Model configuration saved successfully to .env.local!', 'success');

                    // Show the updated values in console for reference
                    console.log('Model configuration saved automatically to .env.local:');
                    console.log('NEXT_PUBLIC_AI_PROVIDER=' + result.config.provider);
                    console.log('NEXT_PUBLIC_OPENAI_MODELS=' + JSON.stringify(result.config.openaiModels));
                    console.log('NEXT_PUBLIC_GROQ_MODELS=' + JSON.stringify(result.config.groqModels));
                    console.log('NEXT_PUBLIC_OPENROUTER_MODELS=' + JSON.stringify(result.config.openrouterModels));

                    // Restore button state BEFORE showing alerts
                    if (saveButton) {
                        saveButton.disabled = false;
                        saveButton.textContent = originalText;
                    }

                    // Now reload environment variables in the main app
                    try {
                        console.log('🔄 Reloading environment variables in main ChatRAG app...');
                        const reloadResponse = await fetch('../api/config/reload', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            }
                        });

                        if (reloadResponse.ok) {
                            const reloadResult = await reloadResponse.json();
                            console.log('✅ Environment variables reloaded successfully:', reloadResult);

                            // Show enhanced success message
                            const successMessage = `
✅ Model configuration updated successfully!

Saved to .env.local:
• Provider: ${result.config.provider}
• OpenAI Models: ${result.config.openaiModels.length} models configured
• Groq Models: ${result.config.groqModels.length} models configured
• OpenRouter Models: ${result.config.openrouterModels.length} models configured

🔄 Environment variables reloaded in main app
• Updated ${reloadResult.updatedKeys?.length || 0} environment variables  
• Models refreshed automatically in main app

✅ New models are now available immediately!
Go to your ChatRAG app and check the model dropdown - your new models should appear within 5 seconds.
                            `;
                            alert(successMessage);
                        } else {
                            console.warn('⚠️ Failed to reload environment variables');
                            // Fallback to original message
                            const successMessage = `
✅ Model configuration saved to .env.local!

Updated values:
• Provider: ${result.config.provider}
• OpenAI Models: ${result.config.openaiModels.length} models configured
• Groq Models: ${result.config.groqModels.length} models configured
• OpenRouter Models: ${result.config.openrouterModels.length} models configured

⚠️ Auto-reload failed. Please restart your ChatRAG application manually.
Run 'npm run dev' again in your terminal to pick up the new model configuration.
                            `;
                            alert(successMessage);
                        }
                    } catch (reloadError) {
                        console.error('Failed to reload environment variables:', reloadError);
                        // Fallback to original message
                        const successMessage = `
✅ Model configuration saved to .env.local!

Updated values:
• Provider: ${result.config.provider}
• OpenAI Models: ${result.config.openaiModels.length} models configured
• Groq Models: ${result.config.groqModels.length} models configured
• OpenRouter Models: ${result.config.openrouterModels.length} models configured

⚠️ Auto-reload failed. Please restart your ChatRAG application manually.
Run 'npm run dev' again in your terminal to pick up the new model configuration.
                        `;
                        alert(successMessage);
                    }
                }
            } catch (error) {
                console.error('❌ Failed to save model configuration:', error);

                // Restore button state if exists
                const saveButtons = document.querySelectorAll('button');
                saveButtons.forEach(btn => {
                    if (btn.textContent.includes('Saving')) {
                        btn.disabled = false;
                        btn.textContent = 'Save Model Configuration';
                    }
                });

                // Show detailed error message with troubleshooting
                const appUrl = window.getConfiguredChatRagAppUrl ? window.getConfiguredChatRagAppUrl() : window.location.origin;
                const errorMessage = `
❌ Failed to save model configuration

Error: ${error.message}

Troubleshooting:
1. Make sure the main ChatRAG app is running (npm run dev)
2. Check that the configured ChatRAG App URL is reachable: ${appUrl}
3. Verify .env.local file permissions
4. Try refreshing the page and saving again

If the issue persists, you can manually add models to .env.local:
NEXT_PUBLIC_OPENROUTER_MODELS=[{"id":"model-id","displayName":"Model Name"}]
                `;

                // Show both toast and alert for visibility
                showToast('Failed to save model configuration - see console for details', 'error');
                console.error(errorMessage);

                // Offer to verify current configuration
                if (confirm('Failed to save. Would you like to verify the current .env.local configuration?')) {
                    verifyEnvFile();
                }
            }
        }

        // Helper function to verify .env.local file
        async function verifyEnvFile() {
            try {
                console.log('🔍 Verifying .env.local file...');
                const response = await fetch('../api/config/models');

                if (!response.ok) {
                    throw new Error(`Failed to read config: ${response.status}`);
                }

                const data = await response.json();

                console.log('📋 Current configuration from .env.local:');
                console.log(`✅ Provider: ${data.provider}`);
                console.log(`✅ OpenAI Models: ${data.openaiModels.length}`);
                console.log(`✅ Groq Models: ${data.groqModels.length}`);
                console.log(`✅ OpenRouter Models: ${data.openrouterModels.length}`);
                console.log('📝 Full config:', data);

                const message = `Current .env.local configuration:
• Provider: ${data.provider}
• OpenAI Models: ${data.openaiModels.length}
• Groq Models: ${data.groqModels.length}
• OpenRouter Models: ${data.openrouterModels.length}
                
Check console for full details.`;

                alert(message);
                showToast(`Verified: ${data.openaiModels.length + data.groqModels.length + data.openrouterModels.length} models in .env.local`, 'success');

                // Update local modelConfig to match server
                modelConfig = data;
                renderModels();

            } catch (error) {
                console.error('❌ Error verifying .env.local:', error);
                showToast('Could not verify .env.local file - ensure main app is running', 'error');
            }
        }

        // =========== End AI Model Configuration Management ===========

        // =========== Global Reasoning Settings Management ===========

        // Update reasoning tokens display
        function updateReasoningTokensDisplay(value) {
            const display = document.getElementById('reasoning-tokens-display');
            const costEstimate = document.getElementById('reasoning-cost-estimate');
            const costMultiplier = parseFloat(document.getElementById('REASONING_COST_MULTIPLIER')?.value || 1.5);

            if (display) {
                display.textContent = `${value} tokens`;
            }

            if (costEstimate) {
                // Rough estimate: $0.015 per 1k reasoning tokens (based on OpenAI o-series pricing)
                const estimatedCost = (value / 1000) * 0.015 * costMultiplier;
                costEstimate.textContent = `Estimated cost: ~$${estimatedCost.toFixed(2)} per message at ${value} tokens`;
            }
        }

        // Update cost multiplier display
        function updateCostMultiplierDisplay(value) {
            const display = document.getElementById('cost-multiplier-display');
            if (display) {
                display.textContent = `${value}x`;
            }
            // Also update the cost estimate
            const tokensValue = document.getElementById('NEXT_PUBLIC_MAX_REASONING_TOKENS')?.value;
            if (tokensValue) {
                updateReasoningTokensDisplay(tokensValue);
            }
        }

        // Set reasoning preset
        // Media Generation Functions
        function updateImageProviderSettings() {
            const provider = document.getElementById('IMAGE_GENERATION_PROVIDER').value;

            // Hide all provider settings
            document.getElementById('openai-image-settings').style.display = 'none';
            document.getElementById('fal-image-settings').style.display = 'none';
            document.getElementById('replicate-image-settings').style.display = 'none';

            // Show selected provider settings
            if (provider === 'openai') {
                document.getElementById('openai-image-settings').style.display = 'block';
            } else if (provider === 'fal') {
                document.getElementById('fal-image-settings').style.display = 'block';
            } else if (provider === 'replicate') {
                document.getElementById('replicate-image-settings').style.display = 'block';
            }
        }

        function updateVideoProviderSettings() {
            const provider = document.getElementById('VIDEO_GENERATION_PROVIDER').value;

            // Hide all provider settings
            document.getElementById('fal-video-settings').style.display = 'none';
            document.getElementById('replicate-video-settings').style.display = 'none';

            // Show selected provider settings
            if (provider === 'fal') {
                document.getElementById('fal-video-settings').style.display = 'block';
            } else if (provider === 'replicate') {
                document.getElementById('replicate-video-settings').style.display = 'block';
            }
        }

        function update3DProviderSettings() {
            const checkbox = document.getElementById('USE_REPLICATE_PROVIDER');
            if (!checkbox) return;

            const useFalProvider = checkbox.checked;
            const falSettings = document.getElementById('fal-3d-settings');
            const replicateSettings = document.getElementById('replicate-3d-settings');

            if (falSettings && replicateSettings) {
                // Hide all provider settings
                falSettings.style.display = 'none';
                replicateSettings.style.display = 'none';

                // Show selected provider settings
                if (useFalProvider) {
                    falSettings.style.display = 'block';
                } else {
                    replicateSettings.style.display = 'block';
                }
            }
        }

        function updateReplicateImageModel() {
            const model = document.getElementById('REPLICATE_IMAGE_MODEL').value;
            const customDiv = document.getElementById('replicate-custom-model');

            if (model === 'custom') {
                customDiv.style.display = 'block';
            } else {
                customDiv.style.display = 'none';
            }
        }

        function testAPIKey(provider) {
            let apiKey = '';
            let testEndpoint = '';

            if (provider === 'fal') {
                apiKey = document.getElementById('FAL_API_KEY').value;
                if (!apiKey) {
                    showToast('Please enter a Fal.ai API key first', 'error');
                    return;
                }
                // Simple test - we'll just check if the key format is valid
                if (apiKey.startsWith('fal-')) {
                    showToast('Fal.ai API key format looks valid', 'success');
                } else {
                    showToast('Invalid Fal.ai API key format (should start with "fal-")', 'error');
                }
            } else if (provider === 'replicate') {
                apiKey = document.getElementById('REPLICATE_API_TOKEN').value;
                if (!apiKey) {
                    showToast('Please enter a Replicate API token first', 'error');
                    return;
                }
                // Simple test - check token format
                if (apiKey.startsWith('r8_') || apiKey.startsWith('r_')) {
                    showToast('Replicate API token format looks valid', 'success');
                } else {
                    showToast('Invalid Replicate token format (should start with "r8_" or "r_")', 'error');
                }
            }
        }


        function switchToTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });

            // Show selected tab
            const targetTab = document.getElementById(tabName);
            if (targetTab) {
                targetTab.classList.add('active');
                // Update URL hash for persistence
                history.replaceState(null, null, '#' + tabName);
            }

            // Update menu items
            document.querySelectorAll('.menu-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelectorAll(`.menu-item[data-tab="${tabName}"]`).forEach(item => {
                item.classList.add('active');
            });
        }

        function setReasoningPreset(preset) {
            const configs = {
                'cost': {
                    effort: 'low',
                    tokens: 2000,
                    ragEnabled: false,
                    showByDefault: false
                },
                'balanced': {
                    effort: 'medium',
                    tokens: 8000,
                    ragEnabled: true,
                    showByDefault: false
                },
                'performance': {
                    effort: 'high',
                    tokens: 16000,
                    ragEnabled: true,
                    showByDefault: true
                }
            };

            const config = configs[preset];
            if (!config) return;

            // Apply preset values
            const effortSelect = document.getElementById('NEXT_PUBLIC_DEFAULT_REASONING_EFFORT');
            const tokensSlider = document.getElementById('NEXT_PUBLIC_MAX_REASONING_TOKENS');
            const ragToggle = document.getElementById('NEXT_PUBLIC_RAG_REASONING_ENABLED');
            const showToggle = document.getElementById('NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT');

            if (effortSelect) effortSelect.value = config.effort;
            if (tokensSlider) {
                tokensSlider.value = config.tokens;
                updateReasoningTokensDisplay(config.tokens);
            }
            if (ragToggle) ragToggle.checked = config.ragEnabled;
            if (showToggle) showToggle.checked = config.showByDefault;

            // Save changes
            saveReasoningSettings();

            // Show feedback
            showToast(`Applied ${preset} preset`, 'success');
        }

        // Save reasoning settings
        async function saveReasoningSettings() {
            const settings = {
                NEXT_PUBLIC_REASONING_ENABLED: document.getElementById('NEXT_PUBLIC_REASONING_ENABLED')?.checked ? 'true' : 'false',
                NEXT_PUBLIC_DEFAULT_REASONING_EFFORT: document.getElementById('NEXT_PUBLIC_DEFAULT_REASONING_EFFORT')?.value || 'medium',
                NEXT_PUBLIC_MAX_REASONING_TOKENS: document.getElementById('NEXT_PUBLIC_MAX_REASONING_TOKENS')?.value || '8000',
                NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT: document.getElementById('NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT')?.checked ? 'true' : 'false',
                NEXT_PUBLIC_RAG_REASONING_ENABLED: document.getElementById('NEXT_PUBLIC_RAG_REASONING_ENABLED')?.checked ? 'true' : 'false',
                REASONING_COST_MULTIPLIER: document.getElementById('REASONING_COST_MULTIPLIER')?.value || '1.5'
            };

            try {
                const response = await fetch('/api/config', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                if (!response.ok) {
                    throw new Error('Failed to save reasoning settings');
                }

                showToast('Reasoning settings saved', 'success');
            } catch (error) {
                console.error('Error saving reasoning settings:', error);
                showToast('Failed to save reasoning settings', 'error');
            }
        }

        // Load reasoning settings
        async function loadReasoningSettings() {
            try {
                const response = await fetch('/api/config');
                const data = await response.json();

                // Set values from loaded config
                const reasoningEnabled = document.getElementById('NEXT_PUBLIC_REASONING_ENABLED');
                if (reasoningEnabled && data.NEXT_PUBLIC_REASONING_ENABLED !== undefined) {
                    reasoningEnabled.checked = data.NEXT_PUBLIC_REASONING_ENABLED === 'true';
                }

                const effortSelect = document.getElementById('NEXT_PUBLIC_DEFAULT_REASONING_EFFORT');
                if (effortSelect && data.NEXT_PUBLIC_DEFAULT_REASONING_EFFORT) {
                    effortSelect.value = data.NEXT_PUBLIC_DEFAULT_REASONING_EFFORT;
                }

                const tokensSlider = document.getElementById('NEXT_PUBLIC_MAX_REASONING_TOKENS');
                if (tokensSlider && data.NEXT_PUBLIC_MAX_REASONING_TOKENS) {
                    tokensSlider.value = data.NEXT_PUBLIC_MAX_REASONING_TOKENS;
                    updateReasoningTokensDisplay(data.NEXT_PUBLIC_MAX_REASONING_TOKENS);
                }

                const showByDefault = document.getElementById('NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT');
                if (showByDefault && data.NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT !== undefined) {
                    showByDefault.checked = data.NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT === 'true';
                }

                const ragEnabled = document.getElementById('NEXT_PUBLIC_RAG_REASONING_ENABLED');
                if (ragEnabled && data.NEXT_PUBLIC_RAG_REASONING_ENABLED !== undefined) {
                    ragEnabled.checked = data.NEXT_PUBLIC_RAG_REASONING_ENABLED === 'true';
                }

                const costMultiplier = document.getElementById('REASONING_COST_MULTIPLIER');
                if (costMultiplier && data.REASONING_COST_MULTIPLIER) {
                    costMultiplier.value = data.REASONING_COST_MULTIPLIER;
                    updateCostMultiplierDisplay(data.REASONING_COST_MULTIPLIER);
                }

                // RAG settings are now handled by unified checkbox system

                const debugRagToggle = document.getElementById('DEBUG_RAG');
                if (debugRagToggle && data.DEBUG_RAG !== undefined) {
                    debugRagToggle.checked = data.DEBUG_RAG === 'true';
                }

                // Load NEXT_PUBLIC_RAG_RERANKING_ENABLED
                const rerankingEnabled = document.getElementById('NEXT_PUBLIC_RAG_RERANKING_ENABLED');
                if (rerankingEnabled && data.NEXT_PUBLIC_RAG_RERANKING_ENABLED !== undefined) {
                    rerankingEnabled.checked = data.NEXT_PUBLIC_RAG_RERANKING_ENABLED === 'true';
                }

                // Load NEXT_PUBLIC_RAG_RERANKING_STRATEGY
                const rerankingStrategy = document.getElementById('NEXT_PUBLIC_RAG_RERANKING_STRATEGY');
                if (rerankingStrategy && data.NEXT_PUBLIC_RAG_RERANKING_STRATEGY) {
                    rerankingStrategy.value = data.NEXT_PUBLIC_RAG_RERANKING_STRATEGY;
                }

                // Load RAG_ENABLE_HYBRID_SEARCH
                const hybridSearch = document.getElementById('RAG_ENABLE_HYBRID_SEARCH');
                if (hybridSearch && data.RAG_ENABLE_HYBRID_SEARCH !== undefined) {
                    hybridSearch.checked = data.RAG_ENABLE_HYBRID_SEARCH === 'true';
                }

            } catch (error) {
                console.error('Error loading reasoning settings:', error);
            }
        }

        // Initialize reasoning settings on page load
        document.addEventListener('DOMContentLoaded', function () {
            // Handle unified RAG settings checkboxes
            const ragCheckboxes = [
                'RAG_MULTI_PASS',
                'RAG_ADAPTIVE_RETRIEVAL',
                'RAG_QUERY_ENHANCEMENT',
                'RAG_RERANKING',
                'RAG_ENABLE_HYBRID_SEARCH',
                'RAG_ADJACENT_CHUNKS',
                'RAG_CACHE_ENABLED',
                'NEXT_PUBLIC_RAG_RERANKING_ENABLED'
            ];

            ragCheckboxes.forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', function () {
                        if (window.configManager) {
                            window.configManager.updateConfig(id, this.checked ? 'true' : 'false');
                        }
                    });
                }
            });

            // Handle DEBUG_RAG toggle
            const debugRagToggle = document.getElementById('DEBUG_RAG');
            if (debugRagToggle) {
                debugRagToggle.addEventListener('change', function () {
                    if (window.configManager) {
                        window.configManager.updateConfig('DEBUG_RAG', this.checked ? 'true' : 'false');
                    }
                });
            }

            // Handle Reranking Strategy dropdown
            const rerankingStrategySelect = document.getElementById('NEXT_PUBLIC_RAG_RERANKING_STRATEGY');
            if (rerankingStrategySelect) {
                rerankingStrategySelect.addEventListener('change', function () {
                    if (window.configManager) {
                        window.configManager.updateConfig('NEXT_PUBLIC_RAG_RERANKING_STRATEGY', this.value);
                    }
                });
            }

            // Load settings
            loadReasoningSettings();

            // Add event listeners for reasoning settings
            const reasoningTokensSlider = document.getElementById('NEXT_PUBLIC_MAX_REASONING_TOKENS');
            if (reasoningTokensSlider) {
                reasoningTokensSlider.addEventListener('input', (e) => {
                    updateReasoningTokensDisplay(e.target.value);
                });
                reasoningTokensSlider.addEventListener('change', saveReasoningSettings);
            }

            const costMultiplierSlider = document.getElementById('REASONING_COST_MULTIPLIER');
            if (costMultiplierSlider) {
                costMultiplierSlider.addEventListener('input', (e) => {
                    updateCostMultiplierDisplay(e.target.value);
                });
                costMultiplierSlider.addEventListener('change', saveReasoningSettings);
            }

            // Add change listeners to all reasoning settings
            const reasoningInputs = [
                'NEXT_PUBLIC_REASONING_ENABLED',
                'NEXT_PUBLIC_DEFAULT_REASONING_EFFORT',
                'NEXT_PUBLIC_SHOW_REASONING_BY_DEFAULT',
                'NEXT_PUBLIC_RAG_REASONING_ENABLED'
            ];

            reasoningInputs.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('change', saveReasoningSettings);
                }
            });
        });

        // Make setReasoningPreset available globally
        window.setReasoningPreset = setReasoningPreset;

        // =========== End Global Reasoning Settings Management ===========

        // =========== Embed Widget Suggestions Management ===========

        // Global array to hold embed suggestions
        let embedSuggestions = [];

        // Initialize embed suggestions from config
        function initEmbedSuggestions() {
            if (!window.configManager || !window.configManager.config) return;

            const suggestionsConfig = window.configManager.config.NEXT_PUBLIC_EMBED_SUGGESTIONS;

            try {
                if (suggestionsConfig && suggestionsConfig.trim()) {
                    embedSuggestions = JSON.parse(suggestionsConfig);
                } else {
                    // Default suggestions
                    embedSuggestions = [
                        "What can you help me with?",
                        "How does this work?",
                        "Tell me about your features",
                        "Get started guide"
                    ];
                }
            } catch (e) {
                console.error('Failed to parse NEXT_PUBLIC_EMBED_SUGGESTIONS:', e);
                embedSuggestions = [
                    "What can you help me with?",
                    "How does this work?",
                    "Tell me about your features",
                    "Get started guide"
                ];
            }

            renderEmbedSuggestions();
        }

        // Render embed suggestions list
        function renderEmbedSuggestions() {
            const listContainer = document.getElementById('embed-suggestions-list');
            if (!listContainer) return;

            listContainer.innerHTML = '';

            embedSuggestions.forEach((suggestion, index) => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'flex items-center gap-2 p-2 bg-base-300 rounded';
                suggestionItem.innerHTML = `
                    <input 
                        type="text" 
                        class="input input-sm input-bordered flex-1" 
                        value="${suggestion}" 
                        onchange="updateEmbedSuggestion(${index}, this.value)"
                        placeholder="Enter suggestion text"
                    />
                    <button 
                        class="btn btn-sm btn-error btn-square" 
                        onclick="removeEmbedSuggestion(${index})"
                        title="Remove suggestion"
                    >
                        ❌
                    </button>
                `;
                listContainer.appendChild(suggestionItem);
            });

            // Update preview
            updateSuggestionsPreview();
        }

        // Update the preview suggestions in the live widget preview
        function updateSuggestionsPreview() {
            const previewContainer = document.getElementById('preview-suggestions');
            const suggestionsEnabled = document.getElementById('NEXT_PUBLIC_EMBED_SUGGESTIONS_ENABLED');
            const primaryColor = document.getElementById('NEXT_PUBLIC_EMBED_PRIMARY_COLOR');

            if (!previewContainer) return;

            // Clear existing pills
            previewContainer.innerHTML = '';

            // Check if suggestions are enabled
            if (suggestionsEnabled && suggestionsEnabled.checked && embedSuggestions.length > 0) {
                previewContainer.style.display = 'flex';

                const color = primaryColor ? primaryColor.value : '#FF6417';

                embedSuggestions.forEach((suggestion) => {
                    const pill = document.createElement('button');
                    pill.textContent = suggestion;
                    pill.style.cssText = `
                        padding: 8px 14px;
                        border-radius: 20px;
                        border: 1px solid #ddd;
                        background: white;
                        color: #333;
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s;
                        white-space: nowrap;
                    `;

                    // Hover effects
                    pill.addEventListener('mouseenter', function () {
                        this.style.background = color;
                        this.style.color = 'white';
                        this.style.borderColor = color;
                    });

                    pill.addEventListener('mouseleave', function () {
                        this.style.background = 'white';
                        this.style.color = '#333';
                        this.style.borderColor = '#ddd';
                    });

                    // Click handler (preview only) - auto-send, keep suggestions visible
                    pill.addEventListener('click', function () {
                        const input = document.getElementById('chatInput');
                        if (input) {
                            input.value = suggestion;
                            // Auto-send the preview message (suggestions remain visible)
                            if (typeof sendPreviewMessage === 'function') {
                                sendPreviewMessage();
                            }
                        }
                    });

                    previewContainer.appendChild(pill);
                });
            } else {
                previewContainer.style.display = 'none';
            }
        }

        // Add a new embed suggestion
        function addEmbedSuggestion() {
            embedSuggestions.push('New suggestion');
            renderEmbedSuggestions();
            saveEmbedSuggestions();
        }

        // Update an existing embed suggestion
        function updateEmbedSuggestion(index, value) {
            if (index >= 0 && index < embedSuggestions.length) {
                embedSuggestions[index] = value;
                saveEmbedSuggestions();
            }
        }

        // Remove an embed suggestion
        function removeEmbedSuggestion(index) {
            if (index >= 0 && index < embedSuggestions.length) {
                embedSuggestions.splice(index, 1);
                renderEmbedSuggestions();
                saveEmbedSuggestions();
            }
        }

        // Save embed suggestions to config
        function saveEmbedSuggestions() {
            if (!window.configManager) return;

            const suggestionsJson = JSON.stringify(embedSuggestions);
            window.configManager.updateConfig('NEXT_PUBLIC_EMBED_SUGGESTIONS', suggestionsJson);
            window.configManager.saveConfig();
        }

        // Initialize deployment mode on page load (since it's the default active tab)
        document.addEventListener('DOMContentLoaded', function () {
            // Initialize deployment mode if it's the active tab
            const deploymentContent = document.getElementById('deployment');
            if (deploymentContent && deploymentContent.classList.contains('active')) {
                setTimeout(() => {
                    console.log('Initializing deployment mode on page load');
                    initDeploymentMode();
                }, 200);
            }
        });

        // Initialize embed suggestions when embed tab becomes active
        document.addEventListener('DOMContentLoaded', function () {
            // Watch for tab switches to embed tab
            const embedTab = document.querySelector('[data-tab="embed"]');
            if (embedTab) {
                embedTab.addEventListener('click', function () {
                    setTimeout(() => {
                        initEmbedSuggestions();
                    }, 100);
                });
            }

            // Also initialize if we're already on embed tab
            const embedContent = document.getElementById('embed');
            if (embedContent && embedContent.classList.contains('active')) {
                setTimeout(() => {
                    initEmbedSuggestions();
                }, 500);
            }

            // Watch for suggestions enabled toggle
            const suggestionsToggle = document.getElementById('NEXT_PUBLIC_EMBED_SUGGESTIONS_ENABLED');
            if (suggestionsToggle) {
                suggestionsToggle.addEventListener('change', function () {
                    updateSuggestionsPreview();
                });
            }

            // Watch for primary color changes
            const primaryColorInput = document.getElementById('NEXT_PUBLIC_EMBED_PRIMARY_COLOR');
            if (primaryColorInput) {
                primaryColorInput.addEventListener('change', function () {
                    updateSuggestionsPreview();
                });
            }
        });

        // Make functions globally available
        window.addEmbedSuggestion = addEmbedSuggestion;
        window.updateEmbedSuggestion = updateEmbedSuggestion;
        window.removeEmbedSuggestion = removeEmbedSuggestion;
        window.initEmbedSuggestions = initEmbedSuggestions;

        // =========== End Embed Widget Suggestions Management ===========

        // =========== Chat Input Border Customization ===========

        function initBorderCustomization() {
            const enabledToggle = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_ENABLED');
            const lengthSlider = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_LENGTH');
            const lengthValue = document.getElementById('borderLengthValue');
            const gradientToggle = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED');
            const singleColorSection = document.getElementById('singleColorSection');
            const gradientColorsSection = document.getElementById('gradientColorsSection');
            const widthSlider = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_WIDTH');
            const widthValue = document.getElementById('borderWidthValue');
            const speedSlider = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED');
            const speedValue = document.getElementById('borderSpeedValue');

            if (!gradientToggle || !widthSlider) return;

            // Toggle enabled state
            if (enabledToggle) {
                enabledToggle.addEventListener('change', () => {
                    if (window.configManager) {
                        window.configManager.updateConfig('NEXT_PUBLIC_CHAT_BORDER_ENABLED', enabledToggle.checked);
                    }
                    updateBorderPreview();
                });
            }

            // Update length slider
            if (lengthSlider && lengthValue) {
                lengthSlider.addEventListener('input', () => {
                    lengthValue.textContent = `${lengthSlider.value}px`;
                    if (window.configManager) {
                        window.configManager.updateConfig('NEXT_PUBLIC_CHAT_BORDER_LENGTH', lengthSlider.value);
                    }
                    updateBorderPreview();
                });
            }

            // Toggle sections based on gradient mode
            gradientToggle.addEventListener('change', () => {
                if (gradientToggle.checked) {
                    singleColorSection.classList.add('hidden');
                    gradientColorsSection.classList.remove('hidden');
                } else {
                    singleColorSection.classList.remove('hidden');
                    gradientColorsSection.classList.add('hidden');
                }
                if (window.configManager) {
                    window.configManager.updateConfig('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED', gradientToggle.checked);
                }
                updateBorderPreview();
            });

            // Initial toggle state
            if (gradientToggle.checked) {
                singleColorSection.classList.add('hidden');
                gradientColorsSection.classList.remove('hidden');
            } else {
                singleColorSection.classList.remove('hidden');
                gradientColorsSection.classList.add('hidden');
            }

            // Sync color pickers with text inputs
            function syncColorInputs(colorId, textId) {
                const colorInput = document.getElementById(colorId);
                const textInput = document.getElementById(textId);

                if (!colorInput || !textInput) return;

                colorInput.addEventListener('input', () => {
                    textInput.value = colorInput.value.toUpperCase();
                    if (window.configManager) {
                        window.configManager.updateConfig(colorId, colorInput.value);
                        // Removed textId update to avoid saving redundant _TEXT variables
                    }
                    updateBorderPreview();
                });

                textInput.addEventListener('input', () => {
                    if (/^#[0-9A-Fa-f]{6}$/.test(textInput.value)) {
                        colorInput.value = textInput.value;
                        if (window.configManager) {
                            window.configManager.updateConfig(colorId, colorInput.value);
                            // Removed textId update to avoid saving redundant _TEXT variables
                        }
                        updateBorderPreview();
                    }
                });
            }

            syncColorInputs('NEXT_PUBLIC_CHAT_BORDER_COLOR', 'NEXT_PUBLIC_CHAT_BORDER_COLOR_TEXT');
            syncColorInputs('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1', 'NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1_TEXT');
            syncColorInputs('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2', 'NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2_TEXT');

            // Update slider value displays
            widthSlider.addEventListener('input', () => {
                widthValue.textContent = `${widthSlider.value}px`;
                if (window.configManager) {
                    window.configManager.updateConfig('NEXT_PUBLIC_CHAT_BORDER_WIDTH', widthSlider.value);
                }
                updateBorderPreview();
            });

            speedSlider.addEventListener('input', () => {
                if (speedValue) speedValue.textContent = `${speedSlider.value}s`;
                if (window.configManager) {
                    window.configManager.updateConfig('NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED', speedSlider.value);
                }
                updateBorderPreview();
            });

            // Initialize preview and values
            if (widthValue) widthValue.textContent = `${widthSlider.value}px`;
            if (speedValue) speedValue.textContent = `${speedSlider.value}s`;
            updateBorderPreview();
        }

        function updateBorderPreview() {
            const container = document.getElementById('borderPreviewContainer');
            if (!container) return;

            const enabledInput = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_ENABLED');
            if (enabledInput && !enabledInput.checked) {
                container.innerHTML = `<div class="w-full h-full flex items-center justify-center text-base-content/30 italic">Animation Disabled</div>`;
                return;
            }

            const widthInput = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_WIDTH');
            const lengthInput = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_LENGTH');
            const speedInput = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED');
            const gradientEnabledInput = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED');

            if (!widthInput || !speedInput || !gradientEnabledInput) return;

            const width = widthInput.value;
            const length = lengthInput ? (parseInt(lengthInput.value) || 220) : 220;
            const speed = speedInput.value;
            const gradientEnabled = gradientEnabledInput.checked;

            let color1, color2;
            if (gradientEnabled) {
                const c1 = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1');
                const c2 = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2');
                color1 = c1 ? c1.value : '#FF6417';
                color2 = c2 ? c2.value : '#FF1744';
            } else {
                const c = document.getElementById('NEXT_PUBLIC_CHAT_BORDER_COLOR');
                color1 = color2 = c ? c.value : '#FF6417';
            }

            // Calculate perimeter (approximate for preview)
            const rect = container.getBoundingClientRect();
            // Use fallback if rect is empty (e.g. element hidden)
            const w = rect.width || 300;
            const h = rect.height || 100;
            const perimeter = 2 * (w + h) - 42;

            // Create SVG preview
            container.innerHTML = `
                <svg class="absolute inset-0 w-full h-full pointer-events-none" 
                     style="overflow: visible; opacity: 0.85; filter: drop-shadow(0 0 1.5px ${color1}80) drop-shadow(0 0 3px ${color1}50) drop-shadow(0 0 5px ${color1}40);">
                    <rect x="${width / 2}" y="${width / 2}" 
                          width="calc(100% - ${width}px)" height="calc(100% - ${width}px)" 
                          rx="22.5" ry="22.5" 
                          fill="none" 
                          stroke="${color1}" 
                          stroke-width="${width}"
                          stroke-linecap="round"
                          style="stroke-dasharray: ${length} ${Math.max(0, perimeter - length)}; animation: svg-travel-preview ${speed}s linear infinite;" />
                    <rect x="${width / 2}" y="${width / 2}" 
                          width="calc(100% - ${width}px)" height="calc(100% - ${width}px)" 
                          rx="22.5" ry="22.5" 
                          fill="none" 
                          stroke="${color2}" 
                          stroke-width="${width}"
                          stroke-linecap="round"
                          style="stroke-dasharray: ${length * 0.73} ${Math.max(0, perimeter - (length * 0.73))}; stroke-dashoffset: ${-perimeter * 0.5}px; animation: svg-travel-preview ${speed}s linear infinite;" />
                </svg>
                <style>
                    @keyframes svg-travel-preview {
                        0% { stroke-dashoffset: 0; }
                        100% { stroke-dashoffset: ${-perimeter}px; }
                    }
                </style>
            `;

        }

        // Initialize on DOM ready or when Branding tab becomes active
        document.addEventListener('DOMContentLoaded', () => {
            // Watch for tab switches to branding tab
            const brandingTab = document.querySelector('[data-tab="branding"]');
            if (brandingTab) {
                brandingTab.addEventListener('click', function () {
                    setTimeout(() => {
                        initBorderCustomization();
                    }, 100);
                });
            }

            // Also init if we start on branding tab (unlikely but good for safety)
            const brandingContent = document.getElementById('branding');
            if (brandingContent && brandingContent.classList.contains('active')) {
                setTimeout(() => {
                    initBorderCustomization();
                }, 500);
            }
        });

        // Expose for debugging
        window.initBorderCustomization = initBorderCustomization;

        function resetBorderDefaults() {
            // Default values
            const defaults = {
                'NEXT_PUBLIC_CHAT_BORDER_ENABLED': true,
                'NEXT_PUBLIC_CHAT_BORDER_LENGTH': 220,
                'NEXT_PUBLIC_CHAT_BORDER_WIDTH': '2.5',
                'NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED': false,
                'NEXT_PUBLIC_CHAT_BORDER_COLOR': '#FF6417',
                'NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1': '#FF6417',
                'NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2': '#FF1744',
                'NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED': '14'
            };

            // Helper to set value and trigger change
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = val;
                    } else {
                        el.value = val;
                    }
                    if (window.configManager) {
                        window.configManager.updateConfig(id, val);
                    }
                    // Trigger input/change events for UI updates
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            setVal('NEXT_PUBLIC_CHAT_BORDER_ENABLED', defaults['NEXT_PUBLIC_CHAT_BORDER_ENABLED']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_LENGTH', defaults['NEXT_PUBLIC_CHAT_BORDER_LENGTH']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_WIDTH', defaults['NEXT_PUBLIC_CHAT_BORDER_WIDTH']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED', defaults['NEXT_PUBLIC_CHAT_BORDER_GRADIENT_ENABLED']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_COLOR', defaults['NEXT_PUBLIC_CHAT_BORDER_COLOR']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1', defaults['NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2', defaults['NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2']);
            setVal('NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED', defaults['NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED']);

            // Force update UI text inputs manually just in case sync is laggy
            // (The event dispatch above should handle it, but being explicit is safer for UX)
            if (document.getElementById('NEXT_PUBLIC_CHAT_BORDER_COLOR_TEXT'))
                document.getElementById('NEXT_PUBLIC_CHAT_BORDER_COLOR_TEXT').value = defaults['NEXT_PUBLIC_CHAT_BORDER_COLOR'];
            if (document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1_TEXT'))
                document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1_TEXT').value = defaults['NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_1'];
            if (document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2_TEXT'))
                document.getElementById('NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2_TEXT').value = defaults['NEXT_PUBLIC_CHAT_BORDER_GRADIENT_COLOR_2'];
            if (document.getElementById('borderWidthValue'))
                document.getElementById('borderWidthValue').textContent = defaults['NEXT_PUBLIC_CHAT_BORDER_WIDTH'] + 'px';
            if (document.getElementById('borderLengthValue'))
                document.getElementById('borderLengthValue').textContent = defaults['NEXT_PUBLIC_CHAT_BORDER_LENGTH'] + 'px';
            if (document.getElementById('animationSpeedValue'))
                document.getElementById('animationSpeedValue').textContent = defaults['NEXT_PUBLIC_CHAT_BORDER_ANIMATION_SPEED'] + 's';

            // Allow time for event propagation if needed, or just force update preview
            setTimeout(updateBorderPreview, 50);
        }
        window.resetBorderDefaults = resetBorderDefaults;

        // =========== End Chat Input Border Customization ===========

        (function initWebScraperPanel() {
            function getScraperWorkspaceId() {
                return window.documentProcessor?.workspaces?.currentSelection || null;
            }

            function escapeScraperHtml(value) {
                return String(value || '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            function renderScraperResult(payload, statusText) {
                const results = document.getElementById('scrape-results');
                const content = document.getElementById('scrape-results-content');
                if (!results || !content) return;

                results.classList.remove('hidden');

                if (typeof payload === 'string') {
                    content.textContent = payload;
                    return;
                }

                const document = payload.document;
                content.innerHTML = [
                    statusText || (payload.scraped ? 'Scraped URL found' : 'URL has not been scraped yet'),
                    `URL: ${escapeScraperHtml(payload.url || '')}`,
                    document ? `Document ID: ${escapeScraperHtml(document.id)}` : '',
                    document ? `Title: ${escapeScraperHtml(document.title || document.filename)}` : '',
                    document ? `Chunks: ${escapeScraperHtml(document.chunk_count)}` : '',
                    document ? `Created: ${escapeScraperHtml(new Date(document.created_at).toLocaleString())}` : '',
                    document ? `Source: ${escapeScraperHtml(document.source_provider)} (${escapeScraperHtml(document.source_file_id)})` : '',
                ].filter(Boolean).join('\n');
            }

            async function checkScraperStatus(url) {
                const params = new URLSearchParams({ url });
                const workspaceId = getScraperWorkspaceId();
                params.set('organization_id', workspaceId || 'null');

                const response = await fetch(`/api/scrapers/status?${params.toString()}`, {
                    credentials: 'same-origin'
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || data.details || `Status check failed (${response.status})`);
                }

                return data;
            }

            async function scrapeUrlFromPanel() {
                const input = document.getElementById('test-scrape-url');
                const button = document.getElementById('test-scrape-btn');
                const url = input?.value?.trim();

                if (!url) {
                    renderScraperResult('Enter a URL first.');
                    return;
                }

                try {
                    new URL(url);
                } catch (_) {
                    renderScraperResult('Enter a valid URL including http:// or https://.');
                    return;
                }

                button.disabled = true;
                const originalText = button.textContent;
                button.textContent = 'Checking...';

                try {
                    const existing = await checkScraperStatus(url);
                    if (existing.scraped) {
                        renderScraperResult(existing, 'Already scraped in the selected workspace');
                        return;
                    }

                    button.textContent = 'Scraping...';
                    renderScraperResult('Scraping URL and processing it into the knowledge base...');

                    const response = await fetch('/api/scrapers/scrape', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            url,
                            organizationId: getScraperWorkspaceId(),
                            outputFormat: 'html'
                        })
                    });
                    const scrapeResult = await response.json().catch(() => ({}));

                    if (!response.ok) {
                        throw new Error(scrapeResult.error || scrapeResult.details || `Scrape failed (${response.status})`);
                    }

                    const status = await checkScraperStatus(scrapeResult.url || url);
                    renderScraperResult(status, 'Scrape complete and verified');

                    if (window.documentManager) {
                        window.documentManager.refresh();
                    }
                } catch (error) {
                    renderScraperResult(`Scrape validation failed: ${error.message || error}`);
                } finally {
                    button.disabled = false;
                    button.textContent = originalText || 'Scrape URL';
                }
            }

            document.addEventListener('DOMContentLoaded', () => {
                const button = document.getElementById('test-scrape-btn');
                const input = document.getElementById('test-scrape-url');

                if (button) {
                    button.addEventListener('click', scrapeUrlFromPanel);
                }

                if (input) {
                    input.addEventListener('keydown', event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            scrapeUrlFromPanel();
                        }
                    });
                }
            });
        })();
