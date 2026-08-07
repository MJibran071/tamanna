import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/**
 * Plugin seed data for Tamanna Voice Assistant.
 * Each plugin has: name, type, category, description, icon, color,
 * requiresOAuth flag, and configSchema (fields needed to configure it).
 *
 * This script is idempotent — it uses upsert on the unique `type` field.
 */

interface PluginSeed {
  name: string;
  type: string;
  category: 'connector' | 'skill' | 'data_source';
  description: string;
  icon: string;
  color: string;
  requiresOAuth: boolean;
  configSchema: { key: string; label: string; type: string; required: boolean; placeholder?: string }[];
}

const plugins: PluginSeed[] = [
  // ─── CONNECTORS (8) ───────────────────────────────────────────────
  {
    name: 'Telegram',
    type: 'telegram',
    category: 'connector',
    description: 'Connect your Telegram bot to send and receive messages through Tamanna',
    icon: 'Send',
    color: 'sky',
    requiresOAuth: false,
    configSchema: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: '123456:ABC-DEF...' },
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: false, placeholder: 'https://yourdomain.com/api/webhooks/telegram' },
      { key: 'allowed_chat_ids', label: 'Allowed Chat IDs', type: 'text', required: false, placeholder: 'Comma-separated chat IDs' },
    ],
  },
  {
    name: 'Instagram',
    type: 'instagram',
    category: 'connector',
    description: 'Link your Instagram Business account to manage DMs and comments',
    icon: 'Camera',
    color: 'pink',
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'account_id', label: 'Business Account ID', type: 'text', required: true },
      { key: 'webhook_verify_token', label: 'Webhook Verify Token', type: 'password', required: false },
    ],
  },
  {
    name: 'WhatsApp',
    type: 'whatsapp',
    category: 'connector',
    description: 'Connect WhatsApp Business API for two-way messaging',
    icon: 'MessageCircle',
    color: 'emerald',
    requiresOAuth: true,
    configSchema: [
      { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'verify_token', label: 'Webhook Verify Token', type: 'password', required: false },
      { key: 'business_account_id', label: 'Business Account ID', type: 'text', required: false },
    ],
  },
  {
    name: 'X / Twitter',
    type: 'twitter',
    category: 'connector',
    description: 'Connect your X/Twitter account to post tweets and monitor mentions',
    icon: 'AtSign',
    color: 'zinc',
    requiresOAuth: true,
    configSchema: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'access_token_secret', label: 'Access Token Secret', type: 'password', required: true },
    ],
  },
  {
    name: 'Discord',
    type: 'discord',
    category: 'connector',
    description: 'Add Tamanna as a Discord bot to your servers',
    icon: 'Gamepad2',
    color: 'violet',
    requiresOAuth: true,
    configSchema: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'guild_ids', label: 'Server IDs', type: 'text', required: false, placeholder: 'Comma-separated server IDs' },
    ],
  },
  {
    name: 'Slack',
    type: 'slack',
    category: 'connector',
    description: 'Integrate Tamanna into your Slack workspace',
    icon: 'Hash',
    color: 'purple',
    requiresOAuth: true,
    configSchema: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true },
      { key: 'app_token', label: 'App-Level Token', type: 'password', required: false },
      { key: 'signing_secret', label: 'Signing Secret', type: 'password', required: true },
      { key: 'channel_ids', label: 'Channel IDs', type: 'text', required: false },
    ],
  },
  {
    name: 'GitHub',
    type: 'github',
    category: 'connector',
    description: 'Connect GitHub to manage repos, issues, and pull requests',
    icon: 'Github',
    color: 'zinc',
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: false },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
      { key: 'repositories', label: 'Repositories', type: 'text', required: false, placeholder: 'Comma-separated repo names' },
    ],
  },
  {
    name: 'Email',
    type: 'email',
    category: 'connector',
    description: 'Send and receive emails via SMTP/IMAP',
    icon: 'Mail',
    color: 'amber',
    requiresOAuth: false,
    configSchema: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: true, placeholder: '587' },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text', required: true },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: true },
      { key: 'imap_host', label: 'IMAP Host', type: 'text', required: false },
      { key: 'imap_port', label: 'IMAP Port', type: 'number', required: false },
      { key: 'imap_user', label: 'IMAP Username', type: 'text', required: false },
      { key: 'imap_password', label: 'IMAP Password', type: 'password', required: false },
    ],
  },

  // ─── SKILLS (13) ─────────────────────────────────────────────────
  {
    name: 'Web Search',
    type: 'web_search',
    category: 'skill',
    description: 'Search the web for real-time information and current events',
    icon: 'Search',
    color: 'blue',
    requiresOAuth: false,
    configSchema: [
      { key: 'provider', label: 'Search Provider', type: 'select', required: false, placeholder: 'default' },
      { key: 'max_results', label: 'Max Results', type: 'number', required: false, placeholder: '5' },
      { key: 'safe_search', label: 'Safe Search', type: 'select', required: false, placeholder: 'moderate' },
    ],
  },
  {
    name: 'Image Generation',
    type: 'image_generation',
    category: 'skill',
    description: 'Generate images from text descriptions using AI',
    icon: 'Image',
    color: 'rose',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_style', label: 'Default Style', type: 'select', required: false, placeholder: 'natural' },
      { key: 'default_size', label: 'Default Size', type: 'select', required: false, placeholder: '1024x1024' },
      { key: 'quality', label: 'Quality', type: 'select', required: false, placeholder: 'standard' },
    ],
  },
  {
    name: 'Text to Speech',
    type: 'text_to_speech',
    category: 'skill',
    description: 'Convert text to natural-sounding speech in multiple languages',
    icon: 'Volume2',
    color: 'teal',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_voice', label: 'Default Voice', type: 'text', required: false, placeholder: 'tongtong' },
      { key: 'default_speed', label: 'Default Speed', type: 'number', required: false, placeholder: '1.0' },
      { key: 'default_format', label: 'Audio Format', type: 'select', required: false, placeholder: 'wav' },
    ],
  },
  {
    name: 'Speech to Text',
    type: 'speech_to_text',
    category: 'skill',
    description: 'Transcribe spoken audio into text with high accuracy',
    icon: 'Mic',
    color: 'cyan',
    requiresOAuth: false,
    configSchema: [
      { key: 'language', label: 'Default Language', type: 'text', required: false, placeholder: 'en' },
      { key: 'model', label: 'Recognition Model', type: 'select', required: false, placeholder: 'default' },
    ],
  },
  {
    name: 'Translation',
    type: 'translation',
    category: 'skill',
    description: 'Translate text between 100+ languages with context awareness',
    icon: 'Languages',
    color: 'indigo',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_source_lang', label: 'Default Source Language', type: 'text', required: false, placeholder: 'auto' },
      { key: 'default_target_lang', label: 'Default Target Language', type: 'text', required: false, placeholder: 'en' },
      { key: 'formality', label: 'Formality Level', type: 'select', required: false, placeholder: 'auto' },
    ],
  },
  {
    name: 'Summarization',
    type: 'summarization',
    category: 'skill',
    description: 'Condense long articles, documents, and conversations into key points',
    icon: 'FileText',
    color: 'orange',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_length', label: 'Summary Length', type: 'select', required: false, placeholder: 'medium' },
      { key: 'include_key_points', label: 'Include Key Points', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'Code Generation',
    type: 'code_generation',
    category: 'skill',
    description: 'Generate, explain, and debug code in any programming language',
    icon: 'Code',
    color: 'green',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_language', label: 'Default Language', type: 'select', required: false, placeholder: 'typescript' },
      { key: 'include_comments', label: 'Include Comments', type: 'select', required: false, placeholder: 'true' },
      { key: 'include_tests', label: 'Include Tests', type: 'select', required: false, placeholder: 'false' },
    ],
  },
  {
    name: 'Data Analysis',
    type: 'data_analysis',
    category: 'skill',
    description: 'Analyze datasets, create visualizations, and extract insights',
    icon: 'BarChart3',
    color: 'fuchsia',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_chart_type', label: 'Default Chart Type', type: 'select', required: false, placeholder: 'auto' },
      { key: 'max_rows', label: 'Max Rows to Process', type: 'number', required: false, placeholder: '10000' },
    ],
  },
  {
    name: 'Math Solver',
    type: 'math_solver',
    category: 'skill',
    description: 'Solve mathematical problems step-by-step from algebra to calculus',
    icon: 'Calculator',
    color: 'yellow',
    requiresOAuth: false,
    configSchema: [
      { key: 'show_steps', label: 'Show Steps', type: 'select', required: false, placeholder: 'true' },
      { key: 'precision', label: 'Decimal Precision', type: 'number', required: false, placeholder: '6' },
    ],
  },
  {
    name: 'Writing Assistant',
    type: 'writing_assistant',
    category: 'skill',
    description: 'Help with writing, editing, proofreading, and content creation',
    icon: 'PenTool',
    color: 'lime',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_tone', label: 'Default Tone', type: 'select', required: false, placeholder: 'professional' },
      { key: 'default_format', label: 'Default Format', type: 'select', required: false, placeholder: 'paragraph' },
    ],
  },
  {
    name: 'Vision Analysis',
    type: 'vision_analysis',
    category: 'skill',
    description: 'Analyze and describe images, extract text, and identify objects',
    icon: 'Eye',
    color: 'sky',
    requiresOAuth: false,
    configSchema: [
      { key: 'detail_level', label: 'Detail Level', type: 'select', required: false, placeholder: 'high' },
      { key: 'extract_text', label: 'Extract Text (OCR)', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'Deep Research',
    type: 'research',
    category: 'skill',
    description: 'Conduct in-depth research on topics with multi-source synthesis',
    icon: 'GraduationCap',
    color: 'violet',
    requiresOAuth: false,
    configSchema: [
      { key: 'max_sources', label: 'Max Sources', type: 'number', required: false, placeholder: '10' },
      { key: 'depth', label: 'Research Depth', type: 'select', required: false, placeholder: 'medium' },
      { key: 'include_citations', label: 'Include Citations', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'Video Understanding',
    type: 'video_understanding',
    category: 'skill',
    description: 'Analyze video content, extract key moments, and generate summaries',
    icon: 'Video',
    color: 'red',
    requiresOAuth: false,
    configSchema: [
      { key: 'max_duration_minutes', label: 'Max Duration (min)', type: 'number', required: false, placeholder: '30' },
      { key: 'extract_frames', label: 'Extract Key Frames', type: 'select', required: false, placeholder: 'true' },
    ],
  },

  // ─── DATA SOURCES (10) ───────────────────────────────────────────
  {
    name: 'Google Drive',
    type: 'google_drive',
    category: 'data_source',
    description: 'Access and search files from your Google Drive',
    icon: 'FolderOpen',
    color: 'blue',
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
      { key: 'folder_ids', label: 'Folder IDs', type: 'text', required: false, placeholder: 'Comma-separated folder IDs' },
    ],
  },
  {
    name: 'Notion',
    type: 'notion',
    category: 'data_source',
    description: 'Connect to Notion workspaces to read and search pages and databases',
    icon: 'BookOpen',
    color: 'zinc',
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Integration Token', type: 'password', required: true },
      { key: 'database_ids', label: 'Database IDs', type: 'text', required: false },
      { key: 'page_ids', label: 'Page IDs', type: 'text', required: false },
    ],
  },
  {
    name: 'Airtable',
    type: 'airtable',
    category: 'data_source',
    description: 'Read and write data from Airtable bases and tables',
    icon: 'Table',
    color: 'blue',
    requiresOAuth: true,
    configSchema: [
      { key: 'api_key', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'base_id', label: 'Base ID', type: 'text', required: true },
      { key: 'table_names', label: 'Table Names', type: 'text', required: false },
    ],
  },
  {
    name: 'GitHub Repositories',
    type: 'github_repos',
    category: 'data_source',
    description: 'Access code, issues, and documentation from GitHub repositories',
    icon: 'GitBranch',
    color: 'zinc',
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'repositories', label: 'Repositories', type: 'text', required: false, placeholder: 'owner/repo,owner/repo' },
      { key: 'include_readme', label: 'Include READMEs', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'RSS Feeds',
    type: 'rss_feeds',
    category: 'data_source',
    description: 'Subscribe to RSS/Atom feeds for news, blogs, and updates',
    icon: 'Rss',
    color: 'orange',
    requiresOAuth: false,
    configSchema: [
      { key: 'feed_urls', label: 'Feed URLs', type: 'textarea', required: true, placeholder: 'One URL per line' },
      { key: 'refresh_interval_min', label: 'Refresh Interval (min)', type: 'number', required: false, placeholder: '30' },
      { key: 'max_items', label: 'Max Items per Feed', type: 'number', required: false, placeholder: '50' },
    ],
  },
  {
    name: 'Web Scraping',
    type: 'web_scraping',
    category: 'data_source',
    description: 'Extract structured data from any public web page',
    icon: 'Globe',
    color: 'emerald',
    requiresOAuth: false,
    configSchema: [
      { key: 'allowed_domains', label: 'Allowed Domains', type: 'textarea', required: false, placeholder: 'One domain per line' },
      { key: 'max_pages', label: 'Max Pages per Request', type: 'number', required: false, placeholder: '10' },
      { key: 'respect_robots_txt', label: 'Respect robots.txt', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'PDF Parser',
    type: 'pdf_parser',
    category: 'data_source',
    description: 'Extract text, tables, and metadata from PDF documents',
    icon: 'FileText',
    color: 'red',
    requiresOAuth: false,
    configSchema: [
      { key: 'ocr_enabled', label: 'Enable OCR', type: 'select', required: false, placeholder: 'true' },
      { key: 'extract_tables', label: 'Extract Tables', type: 'select', required: false, placeholder: 'true' },
      { key: 'max_file_size_mb', label: 'Max File Size (MB)', type: 'number', required: false, placeholder: '50' },
    ],
  },
  {
    name: 'Database Query',
    type: 'database',
    category: 'data_source',
    description: 'Connect to SQL/NoSQL databases for direct data access',
    icon: 'Database',
    color: 'amber',
    requiresOAuth: false,
    configSchema: [
      { key: 'db_type', label: 'Database Type', type: 'select', required: true, placeholder: 'postgresql' },
      { key: 'connection_string', label: 'Connection String', type: 'password', required: true },
      { key: 'read_only', label: 'Read Only Mode', type: 'select', required: false, placeholder: 'true' },
    ],
  },
  {
    name: 'REST API Connector',
    type: 'api_connector',
    category: 'data_source',
    description: 'Connect to any REST API with custom headers and authentication',
    icon: 'Plug',
    color: 'teal',
    requiresOAuth: false,
    configSchema: [
      { key: 'base_url', label: 'Base URL', type: 'url', required: true },
      { key: 'auth_type', label: 'Auth Type', type: 'select', required: false, placeholder: 'bearer' },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: false },
      { key: 'custom_headers', label: 'Custom Headers', type: 'textarea', required: false, placeholder: 'JSON format: {"key": "value"}' },
      { key: 'rate_limit_rpm', label: 'Rate Limit (req/min)', type: 'number', required: false, placeholder: '60' },
    ],
  },
  {
    name: 'Spreadsheets',
    type: 'spreadsheets',
    category: 'data_source',
    description: 'Import and analyze data from CSV, Excel, and Google Sheets',
    icon: 'Sheet',
    color: 'green',
    requiresOAuth: false,
    configSchema: [
      { key: 'default_format', label: 'Default Format', type: 'select', required: false, placeholder: 'csv' },
      { key: 'max_rows', label: 'Max Rows to Import', type: 'number', required: false, placeholder: '10000' },
      { key: 'google_sheet_credentials', label: 'Google Sheets Credentials', type: 'textarea', required: false },
    ],
  },
];

function buildMetadata(plugin: PluginSeed): string {
  return JSON.stringify({
    icon: plugin.icon,
    color: plugin.color,
    author: 'Tamanna',
    version: '1.0.0',
    requiresOAuth: plugin.requiresOAuth,
    configSchema: plugin.configSchema,
  });
}

async function main() {
  console.log(`Seeding ${plugins.length} plugin definitions...`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of plugins) {
    const metadata = buildMetadata(p);

    const existing = await db.plugin.findUnique({
      where: { type: p.type },
    });

    if (existing) {
      // Update metadata/configSchema but preserve connection status and user config
      await db.plugin.update({
        where: { type: p.type },
        data: {
          name: p.name,
          description: p.description,
          category: p.category,
          metadata,
          // Don't overwrite status, config, lastSyncAt, or enabled
        },
      });
      updated++;
      console.log(`  ✓ Updated: ${p.name} (${p.type})`);
    } else {
      await db.plugin.create({
        data: {
          name: p.name,
          description: p.description,
          category: p.category,
          type: p.type,
          metadata,
          status: 'disconnected',
          enabled: true,
        },
      });
      created++;
      console.log(`  + Created: ${p.name} (${p.type})`);
    }
  }

  console.log(`\nDone! ${created} created, ${updated} updated, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
