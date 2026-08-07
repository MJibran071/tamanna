/**
 * Plugin Config Schemas
 * Defines configurable fields for each plugin type (connectors, skills, data sources).
 * Used in the Settings UI to render config forms and in the API to validate input.
 */

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'url' | 'select' | 'toggle' | 'textarea' | 'password' | 'oauth';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: { label: string; value: string }[]; // for select type
  helpText?: string;
  // OAuth fields
  authUrl?: string;
  scopes?: string[];
}

export interface PluginConfigSchema {
  type: string;
  category: 'connector' | 'skill' | 'data_source';
  fields: ConfigField[];
  testEndpoint?: string; // Relative API path to test this plugin
}

// ─── CONNECTOR CONFIGS ──────────────────────────────────────────────────

const CONNECTOR_CONFIGS: PluginConfigSchema[] = [
  {
    type: 'telegram',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF...', required: true, helpText: 'Get from @BotFather on Telegram' },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-domain.com/api/webhooks/telegram', helpText: 'Auto-generated webhook for receiving messages' },
      { key: 'allowedChatIds', label: 'Allowed Chat IDs', type: 'textarea', placeholder: 'Comma-separated chat IDs', helpText: 'Leave empty to allow all chats' },
      { key: 'autoReply', label: 'Auto Reply', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'whatsapp',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: 'Your WhatsApp Business phone number ID', required: true, helpText: 'From Meta Business Settings' },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAxxxx...', required: true, helpText: 'Long-lived access token from Meta' },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'text', placeholder: 'custom_verify_token', helpText: 'Token to verify webhook subscription' },
      { key: 'autoReply', label: 'Auto Reply', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'instagram',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'accountId', label: 'Instagram Account ID', type: 'text', placeholder: '17841400...', required: true, helpText: 'From Meta Business Settings > Instagram' },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'IGQVJ...', required: true, helpText: 'Long-lived Instagram access token' },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'text', placeholder: 'custom_verify_token' },
      { key: 'replyToDMs', label: 'Reply to DMs', type: 'toggle', defaultValue: true },
      { key: 'replyToComments', label: 'Reply to Comments', type: 'toggle', defaultValue: false },
    ],
  },
  {
    type: 'x_twitter',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'your_api_key', required: true, helpText: 'From Twitter Developer Portal' },
      { key: 'apiSecret', label: 'API Secret', type: 'password', placeholder: 'your_api_secret', required: true },
      { key: 'bearerToken', label: 'Bearer Token', type: 'password', placeholder: 'AAAAAAAAAAAA...', required: true, helpText: 'App-only Bearer Token' },
      { key: 'webhookEnv', label: 'Webhook Environment', type: 'select', options: [{ label: 'Development', value: 'dev' }, { label: 'Production', value: 'prod' }], defaultValue: 'dev' },
    ],
  },
  {
    type: 'gmail',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'xxxx.apps.googleusercontent.com', required: true, helpText: 'From Google Cloud Console' },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', placeholder: 'GOCSPX-...', required: true },
      { key: 'redirectUri', label: 'Redirect URI', type: 'url', placeholder: 'https://your-domain.com/api/oauth/gmail/callback', helpText: 'Must match Google Cloud Console' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'Obtained after OAuth flow', helpText: 'Fill after completing OAuth authorization' },
      { key: 'watchLabel', label: 'Watch Label', type: 'text', placeholder: 'INBOX', defaultValue: 'INBOX', helpText: 'Which Gmail label to watch for new emails' },
      { key: 'autoRespond', label: 'Auto Respond', type: 'toggle', defaultValue: false },
    ],
  },
  {
    type: 'slack',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'botToken', label: 'Bot Token (xoxb-)', type: 'password', placeholder: 'xoxb-xxxx...', required: true, helpText: 'From Slack App > OAuth & Permissions' },
      { key: 'appToken', label: 'App Token (xapp-)', type: 'password', placeholder: 'xapp-xxxx...', helpText: 'For Socket Mode connections' },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', placeholder: 'xxxx...', required: true },
      { key: 'allowedChannels', label: 'Allowed Channels', type: 'textarea', placeholder: 'Comma-separated channel names', helpText: 'Leave empty to allow all channels' },
    ],
  },
  {
    type: 'discord',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'MTIzNDU2Nzg5...', required: true, helpText: 'From Discord Developer Portal' },
      { key: 'clientId', label: 'Application ID', type: 'text', placeholder: '123456789', required: true },
      { key: 'allowedGuilds', label: 'Allowed Server IDs', type: 'textarea', placeholder: 'Comma-separated guild IDs' },
      { key: 'commandPrefix', label: 'Command Prefix', type: 'text', placeholder: '/', defaultValue: '/' },
    ],
  },
  {
    type: 'github',
    category: 'connector',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_xxxx...', required: true, helpText: 'From GitHub Settings > Developer Settings > PAT' },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', placeholder: 'Optional webhook secret' },
      { key: 'watchedRepos', label: 'Watched Repos', type: 'textarea', placeholder: 'owner/repo, one per line', helpText: 'Repos to watch for issues/PRs' },
      { key: 'watchEvents', label: 'Watch Events', type: 'select', options: [
        { label: 'Issues & PRs', value: 'issues_prs' },
        { label: 'All Events', value: 'all' },
        { label: 'Issues Only', value: 'issues' },
        { label: 'PRs Only', value: 'prs' },
      ], defaultValue: 'issues_prs' },
    ],
  },
];

// ─── SKILL CONFIGS ──────────────────────────────────────────────────────

const SKILL_CONFIGS: PluginConfigSchema[] = [
  {
    type: 'asr',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'model', label: 'ASR Model', type: 'select', options: [
        { label: 'Default (Whisper)', value: 'default' },
        { label: 'Whisper Large', value: 'whisper-large' },
        { label: 'Whisper Medium', value: 'whisper-medium' },
      ], defaultValue: 'default' },
      { key: 'language', label: 'Language', type: 'select', options: [
        { label: 'Auto Detect', value: 'auto' },
        { label: 'English', value: 'en' },
        { label: 'Urdu', value: 'ur' },
        { label: 'Hindi', value: 'hi' },
        { label: 'Arabic', value: 'ar' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
      ], defaultValue: 'auto' },
      { key: 'sampleRate', label: 'Sample Rate', type: 'select', options: [
        { label: '16kHz', value: '16000' },
        { label: '24kHz', value: '24000' },
        { label: '48kHz', value: '48000' },
      ], defaultValue: '16000' },
    ],
  },
  {
    type: 'tts',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'voice', label: 'Voice', type: 'select', options: [
        { label: 'Default', value: 'default' },
        { label: 'Female (Warm)', value: 'female-warm' },
        { label: 'Male (Deep)', value: 'male-deep' },
        { label: 'Neutral', value: 'neutral' },
      ], defaultValue: 'default' },
      { key: 'speed', label: 'Speed Override', type: 'select', options: [
        { label: 'Use Settings', value: 'settings' },
        { label: '0.75x Slow', value: '0.75' },
        { label: '1.0x Normal', value: '1.0' },
        { label: '1.25x Fast', value: '1.25' },
        { label: '1.5x Very Fast', value: '1.5' },
      ], defaultValue: 'settings' },
    ],
  },
  {
    type: 'llm',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'model', label: 'LLM Model', type: 'select', options: [
        { label: 'Default', value: 'default' },
        { label: 'Sonnet (Fast)', value: 'sonnet' },
        { label: 'Opus (Advanced)', value: 'opus' },
        { label: 'Haiku (Cheap)', value: 'haiku' },
      ], defaultValue: 'default' },
      { key: 'temperature', label: 'Temperature', type: 'number', placeholder: '0.0 - 1.0', defaultValue: '0.7' },
      { key: 'maxTokens', label: 'Max Tokens', type: 'number', placeholder: '1024', defaultValue: '2048' },
      { key: 'systemPrompt', label: 'Custom System Prompt', type: 'textarea', placeholder: 'Optional custom system prompt override', helpText: 'Leave empty to use Tamanna default' },
    ],
  },
  {
    type: 'vlm',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'model', label: 'VLM Model', type: 'select', options: [
        { label: 'Default', value: 'default' },
        { label: 'Sonnet', value: 'sonnet' },
        { label: 'Opus', value: 'opus' },
      ], defaultValue: 'default' },
      { key: 'maxImageSize', label: 'Max Image Size (MB)', type: 'number', placeholder: '10', defaultValue: '10' },
    ],
  },
  {
    type: 'image_generation',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'defaultSize', label: 'Default Image Size', type: 'select', options: [
        { label: '512x512', value: '512x512' },
        { label: '768x768', value: '768x768' },
        { label: '1024x1024', value: '1024x1024' },
      ], defaultValue: '1024x1024' },
      { key: 'quality', label: 'Quality', type: 'select', options: [
        { label: 'Standard', value: 'standard' },
        { label: 'HD', value: 'hd' },
      ], defaultValue: 'standard' },
    ],
  },
  {
    type: 'web_search',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'maxResults', label: 'Max Results', type: 'number', placeholder: '10', defaultValue: '5' },
      { key: 'safeSearch', label: 'Safe Search', type: 'toggle', defaultValue: true },
      { key: 'region', label: 'Region', type: 'select', options: [
        { label: 'Global', value: 'global' },
        { label: 'Pakistan', value: 'pk' },
        { label: 'India', value: 'in' },
        { label: 'US', value: 'us' },
        { label: 'UK', value: 'uk' },
      ], defaultValue: 'global' },
    ],
  },
  {
    type: 'web_reader',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'timeout', label: 'Timeout (seconds)', type: 'number', placeholder: '30', defaultValue: '30' },
      { key: 'extractImages', label: 'Extract Images', type: 'toggle', defaultValue: false },
    ],
  },
  {
    type: 'translation',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'sourceLanguage', label: 'Source Language', type: 'select', options: [
        { label: 'Auto Detect', value: 'auto' },
        { label: 'English', value: 'en' },
        { label: 'Urdu', value: 'ur' },
        { label: 'Hindi', value: 'hi' },
        { label: 'Arabic', value: 'ar' },
      ], defaultValue: 'auto' },
      { key: 'targetLanguage', label: 'Target Language', type: 'select', options: [
        { label: 'English', value: 'en' },
        { label: 'Urdu', value: 'ur' },
        { label: 'Hindi', value: 'hi' },
        { label: 'Arabic', value: 'ar' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Spanish', value: 'es' },
        { label: 'French', value: 'fr' },
      ], defaultValue: 'en' },
    ],
  },
  {
    type: 'code_assistant',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'language', label: 'Preferred Language', type: 'select', options: [
        { label: 'TypeScript', value: 'typescript' },
        { label: 'Python', value: 'python' },
        { label: 'Auto Detect', value: 'auto' },
      ], defaultValue: 'auto' },
      { key: 'explainCode', label: 'Auto Explain', type: 'toggle', defaultValue: true, helpText: 'Automatically explain code snippets' },
    ],
  },
  {
    type: 'math',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'showSteps', label: 'Show Steps', type: 'toggle', defaultValue: true, helpText: 'Show step-by-step solution process' },
    ],
  },
  {
    type: 'data_analysis',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'chartType', label: 'Default Chart Type', type: 'select', options: [
        { label: 'Auto', value: 'auto' },
        { label: 'Bar', value: 'bar' },
        { label: 'Line', value: 'line' },
        { label: 'Pie', value: 'pie' },
      ], defaultValue: 'auto' },
    ],
  },
  {
    type: 'research',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'maxDepth', label: 'Max Search Depth', type: 'number', placeholder: '3', defaultValue: '3', helpText: 'How many levels of linked pages to follow' },
      { key: 'maxSources', label: 'Max Sources', type: 'number', placeholder: '10', defaultValue: '10' },
      { key: 'summaryLength', label: 'Summary Length', type: 'select', options: [
        { label: 'Brief', value: 'brief' },
        { label: 'Detailed', value: 'detailed' },
        { label: 'Comprehensive', value: 'comprehensive' },
      ], defaultValue: 'detailed' },
    ],
  },
  {
    type: 'writing',
    category: 'skill',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'tone', label: 'Default Tone', type: 'select', options: [
        { label: 'Professional', value: 'professional' },
        { label: 'Casual', value: 'casual' },
        { label: 'Formal', value: 'formal' },
        { label: 'Creative', value: 'creative' },
      ], defaultValue: 'professional' },
      { key: 'autoProofread', label: 'Auto Proofread', type: 'toggle', defaultValue: true },
    ],
  },
];

// ─── DATA SOURCE CONFIGS ────────────────────────────────────────────────

const DATA_SOURCE_CONFIGS: PluginConfigSchema[] = [
  {
    type: 'local_files',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'maxFileSize', label: 'Max File Size (MB)', type: 'number', defaultValue: '50' },
      { key: 'supportedTypes', label: 'Supported File Types', type: 'textarea', defaultValue: 'pdf,txt,md,csv,json,docx,xlsx', helpText: 'Comma-separated file extensions' },
      { key: 'autoIndex', label: 'Auto Index Uploads', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'rss_feeds',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'feedUrls', label: 'Feed URLs', type: 'textarea', placeholder: 'One RSS feed URL per line', required: true, helpText: 'e.g. https://example.com/feed.xml' },
      { key: 'refreshInterval', label: 'Refresh Interval (min)', type: 'number', defaultValue: '60' },
      { key: 'maxArticles', label: 'Max Articles per Feed', type: 'number', defaultValue: '50' },
      { key: 'autoSummarize', label: 'Auto Summarize', type: 'toggle', defaultValue: false, helpText: 'Automatically summarize new articles' },
    ],
  },
  {
    type: 'api_endpoints',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://api.example.com/v1', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Optional API key' },
      { key: 'headers', label: 'Custom Headers (JSON)', type: 'textarea', placeholder: '{\n  "X-Custom-Header": "value"\n}', helpText: 'JSON object of additional headers' },
      { key: 'method', label: 'Default Method', type: 'select', options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ], defaultValue: 'GET' },
    ],
  },
  {
    type: 'calendar',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'provider', label: 'Calendar Provider', type: 'select', options: [
        { label: 'Google Calendar', value: 'google' },
        { label: 'Apple Calendar (CalDAV)', value: 'apple' },
        { label: 'Outlook', value: 'outlook' },
      ], defaultValue: 'google', required: true },
      { key: 'clientId', label: 'OAuth Client ID', type: 'text', placeholder: 'Client ID from provider' },
      { key: 'clientSecret', label: 'OAuth Client Secret', type: 'password', placeholder: 'Client secret' },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', placeholder: 'Obtained after OAuth flow' },
      { key: 'calendarId', label: 'Calendar ID', type: 'text', placeholder: 'primary', defaultValue: 'primary' },
    ],
  },
  {
    type: 'location',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'defaultLocation', label: 'Default Location', type: 'text', placeholder: 'Karachi, Pakistan', helpText: 'Used when location context is ambiguous' },
      { key: 'units', label: 'Units', type: 'select', options: [
        { label: 'Metric (km, °C)', value: 'metric' },
        { label: 'Imperial (mi, °F)', value: 'imperial' },
      ], defaultValue: 'metric' },
    ],
  },
  {
    type: 'notifications',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'channel', label: 'Notification Channel', type: 'select', options: [
        { label: 'Browser Push', value: 'browser' },
        { label: 'Email', value: 'email' },
        { label: 'Webhook', value: 'webhook' },
      ], defaultValue: 'browser', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', type: 'url', placeholder: 'https://your-webhook-url.com/notify', helpText: 'Required for webhook channel' },
      { key: 'minPriority', label: 'Minimum Priority', type: 'select', options: [
        { label: 'All', value: 'low' },
        { label: 'Medium & High', value: 'medium' },
        { label: 'High Only', value: 'high' },
      ], defaultValue: 'medium' },
    ],
  },
  {
    type: 'media_library',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'maxStorage', label: 'Max Storage (MB)', type: 'number', defaultValue: '500' },
      { key: 'supportedFormats', label: 'Supported Formats', type: 'textarea', defaultValue: 'jpg,jpeg,png,gif,mp3,mp4,wav,pdf', helpText: 'Comma-separated file formats' },
      { key: 'autoTag', label: 'Auto Tag with AI', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'cloud_storage',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', options: [
        { label: 'Google Drive', value: 'google_drive' },
        { label: 'Dropbox', value: 'dropbox' },
        { label: 'AWS S3', value: 's3' },
      ], defaultValue: 'google_drive', required: true },
      { key: 'accessToken', label: 'Access Token / Key', type: 'password', placeholder: 'OAuth token or API key' },
      { key: 'bucketName', label: 'Bucket / Folder Path', type: 'text', placeholder: 'my-bucket or /Documents', helpText: 'S3 bucket name or folder path for Drive/Dropbox' },
      { key: 'syncInterval', label: 'Sync Interval (min)', type: 'number', defaultValue: '30' },
    ],
  },
  {
    type: 'ecommerce',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: [
        { label: 'Shopify', value: 'shopify' },
        { label: 'WooCommerce', value: 'woocommerce' },
        { label: 'Amazon', value: 'amazon' },
      ], defaultValue: 'shopify', required: true },
      { key: 'storeUrl', label: 'Store URL', type: 'url', placeholder: 'https://your-store.myshopify.com', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'shpat_xxxx...', required: true },
      { key: 'trackInventory', label: 'Track Inventory', type: 'toggle', defaultValue: true },
    ],
  },
  {
    type: 'video_platforms',
    category: 'data_source',
    testEndpoint: '/api/plugins/test',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
      ], defaultValue: 'youtube', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your API key' },
      { key: 'channelId', label: 'Channel ID', type: 'text', placeholder: 'UCxxxx...' },
      { key: 'autoTranscribe', label: 'Auto Transcribe', type: 'toggle', defaultValue: true, helpText: 'Transcribe video audio for search' },
    ],
  },
];

// ─── EXPORT ──────────────────────────────────────────────────────────────

export const ALL_PLUGIN_CONFIGS: PluginConfigSchema[] = [
  ...CONNECTOR_CONFIGS,
  ...SKILL_CONFIGS,
  ...DATA_SOURCE_CONFIGS,
];

/** Get config schema for a specific plugin type */
export function getConfigSchema(type: string): PluginConfigSchema | undefined {
  return ALL_PLUGIN_CONFIGS.find((c) => c.type === type);
}

/** Get all configs for a category */
export function getConfigsByCategory(category: 'connector' | 'skill' | 'data_source'): PluginConfigSchema[] {
  return ALL_PLUGIN_CONFIGS.filter((c) => c.category === category);
}
