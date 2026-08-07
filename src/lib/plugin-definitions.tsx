/**
 * Plugin Definitions
 * Central registry of all available plugins for the Tamanna AI Assistant.
 * Each plugin definition includes metadata, icon, color, and configuration schema.
 *
 * These definitions are the source of truth for the frontend UI.
 * They are also seeded into the database for backend use.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Send,
  Camera,
  MessageCircle,
  AtSign,
  Gamepad2,
  Hash,
  Github,
  Mail,
  Search,
  Image,
  Volume2,
  Mic,
  Languages,
  FileText,
  Code,
  BarChart3,
  Calculator,
  PenTool,
  Eye,
  GraduationCap,
  Video,
  FolderOpen,
  BookOpen,
  Table,
  GitBranch,
  Rss,
  Globe,
  Database,
  Plug,
  Sheet,
  type LucideProps,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

export interface PluginDefinition {
  name: string;
  type: string;
  category: 'connector' | 'skill' | 'data_source';
  description: string;
  icon: LucideIcon;
  color: string;      // Tailwind text-color class
  bgColor: string;    // Tailwind bg-color class
  requiresOAuth: boolean;
  configSchema: { key: string; label: string; type: string; required: boolean; placeholder?: string }[];
}

// ─── Color Mappings ──────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { color: string; bgColor: string }> = {
  sky:     { color: 'text-sky-500',       bgColor: 'bg-sky-500/10' },
  pink:    { color: 'text-pink-500',      bgColor: 'bg-pink-500/10' },
  emerald: { color: 'text-emerald-500',   bgColor: 'bg-emerald-500/10' },
  zinc:    { color: 'text-zinc-400',       bgColor: 'bg-zinc-400/10' },
  violet:  { color: 'text-violet-500',    bgColor: 'bg-violet-500/10' },
  purple:  { color: 'text-purple-500',    bgColor: 'bg-purple-500/10' },
  amber:   { color: 'text-amber-500',     bgColor: 'bg-amber-500/10' },
  blue:    { color: 'text-blue-500',      bgColor: 'bg-blue-500/10' },
  rose:    { color: 'text-rose-500',      bgColor: 'bg-rose-500/10' },
  teal:    { color: 'text-teal-500',      bgColor: 'bg-teal-500/10' },
  cyan:    { color: 'text-cyan-500',      bgColor: 'bg-cyan-500/10' },
  indigo:  { color: 'text-indigo-500',    bgColor: 'bg-indigo-500/10' },
  orange:  { color: 'text-orange-500',   bgColor: 'bg-orange-500/10' },
  green:   { color: 'text-green-500',     bgColor: 'bg-green-500/10' },
  fuchsia: { color: 'text-fuchsia-500',   bgColor: 'bg-fuchsia-500/10' },
  yellow:  { color: 'text-yellow-500',    bgColor: 'bg-yellow-500/10' },
  lime:    { color: 'text-lime-500',       bgColor: 'bg-lime-500/10' },
  red:     { color: 'text-red-500',       bgColor: 'bg-red-500/10' },
};

// ─── Icon Mappings ──────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Send, Camera, MessageCircle, AtSign, Gamepad2, Hash, Github, Mail,
  Search, Image, Volume2, Mic, Languages, FileText, Code, BarChart3,
  Calculator, PenTool, Eye, GraduationCap, Video, FolderOpen, BookOpen,
  Table, GitBranch, Rss, Globe, Database, Plug, Sheet,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Globe;
}

function getColors(colorName: string) {
  return COLOR_MAP[colorName] || COLOR_MAP.zinc;
}

// ─── Plugin Definitions ──────────────────────────────────────────────────

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  // ─── CONNECTORS (8) ─────────────────────────────────────────────────
  {
    name: 'Telegram',
    type: 'telegram',
    category: 'connector',
    description: 'Connect your Telegram bot to send and receive messages through Tamanna',
    icon: getIcon('Send'),
    ...getColors('sky'),
    requiresOAuth: false,
    configSchema: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true, placeholder: '123456:ABC-DEF...' },
      { key: 'webhook_url', label: 'Webhook URL', type: 'url', required: false },
      { key: 'allowed_chat_ids', label: 'Allowed Chat IDs', type: 'text', required: false },
    ],
  },
  {
    name: 'Instagram',
    type: 'instagram',
    category: 'connector',
    description: 'Link your Instagram Business account to manage DMs and comments',
    icon: getIcon('Camera'),
    ...getColors('pink'),
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
    icon: getIcon('MessageCircle'),
    ...getColors('emerald'),
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
    icon: getIcon('AtSign'),
    ...getColors('zinc'),
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
    icon: getIcon('Gamepad2'),
    ...getColors('violet'),
    requiresOAuth: true,
    configSchema: [
      { key: 'bot_token', label: 'Bot Token', type: 'password', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'guild_ids', label: 'Server IDs', type: 'text', required: false },
    ],
  },
  {
    name: 'Slack',
    type: 'slack',
    category: 'connector',
    description: 'Integrate Tamanna into your Slack workspace',
    icon: getIcon('Hash'),
    ...getColors('purple'),
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
    icon: getIcon('Github'),
    ...getColors('zinc'),
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: false },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', required: false },
      { key: 'repositories', label: 'Repositories', type: 'text', required: false },
    ],
  },
  {
    name: 'Email',
    type: 'email',
    category: 'connector',
    description: 'Send and receive emails via SMTP/IMAP',
    icon: getIcon('Mail'),
    ...getColors('amber'),
    requiresOAuth: false,
    configSchema: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: true },
      { key: 'smtp_user', label: 'SMTP Username', type: 'text', required: true },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: true },
      { key: 'imap_host', label: 'IMAP Host', type: 'text', required: false },
      { key: 'imap_port', label: 'IMAP Port', type: 'number', required: false },
    ],
  },

  // ─── SKILLS (13) ──────────────────────────────────────────────────
  {
    name: 'Web Search',
    type: 'web_search',
    category: 'skill',
    description: 'Search the web for real-time information and current events',
    icon: getIcon('Search'),
    ...getColors('blue'),
    requiresOAuth: false,
    configSchema: [
      { key: 'provider', label: 'Search Provider', type: 'select', required: false },
      { key: 'max_results', label: 'Max Results', type: 'number', required: false },
    ],
  },
  {
    name: 'Image Generation',
    type: 'image_generation',
    category: 'skill',
    description: 'Generate images from text descriptions using AI',
    icon: getIcon('Image'),
    ...getColors('rose'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_style', label: 'Default Style', type: 'select', required: false },
      { key: 'default_size', label: 'Default Size', type: 'select', required: false },
      { key: 'quality', label: 'Quality', type: 'select', required: false },
    ],
  },
  {
    name: 'Text to Speech',
    type: 'text_to_speech',
    category: 'skill',
    description: 'Convert text to natural-sounding speech in multiple languages',
    icon: getIcon('Volume2'),
    ...getColors('teal'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_voice', label: 'Default Voice', type: 'text', required: false },
      { key: 'default_speed', label: 'Default Speed', type: 'number', required: false },
    ],
  },
  {
    name: 'Speech to Text',
    type: 'speech_to_text',
    category: 'skill',
    description: 'Transcribe spoken audio into text with high accuracy',
    icon: getIcon('Mic'),
    ...getColors('cyan'),
    requiresOAuth: false,
    configSchema: [
      { key: 'language', label: 'Default Language', type: 'text', required: false },
      { key: 'model', label: 'Recognition Model', type: 'select', required: false },
    ],
  },
  {
    name: 'Translation',
    type: 'translation',
    category: 'skill',
    description: 'Translate text between 100+ languages with context awareness',
    icon: getIcon('Languages'),
    ...getColors('indigo'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_source_lang', label: 'Default Source Language', type: 'text', required: false },
      { key: 'default_target_lang', label: 'Default Target Language', type: 'text', required: false },
    ],
  },
  {
    name: 'Summarization',
    type: 'summarization',
    category: 'skill',
    description: 'Condense long articles, documents, and conversations into key points',
    icon: getIcon('FileText'),
    ...getColors('orange'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_length', label: 'Summary Length', type: 'select', required: false },
      { key: 'include_key_points', label: 'Include Key Points', type: 'select', required: false },
    ],
  },
  {
    name: 'Code Generation',
    type: 'code_generation',
    category: 'skill',
    description: 'Generate, explain, and debug code in any programming language',
    icon: getIcon('Code'),
    ...getColors('green'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_language', label: 'Default Language', type: 'select', required: false },
      { key: 'include_comments', label: 'Include Comments', type: 'select', required: false },
      { key: 'include_tests', label: 'Include Tests', type: 'select', required: false },
    ],
  },
  {
    name: 'Data Analysis',
    type: 'data_analysis',
    category: 'skill',
    description: 'Analyze datasets, create visualizations, and extract insights',
    icon: getIcon('BarChart3'),
    ...getColors('fuchsia'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_chart_type', label: 'Default Chart Type', type: 'select', required: false },
      { key: 'max_rows', label: 'Max Rows to Process', type: 'number', required: false },
    ],
  },
  {
    name: 'Math Solver',
    type: 'math_solver',
    category: 'skill',
    description: 'Solve mathematical problems step-by-step from algebra to calculus',
    icon: getIcon('Calculator'),
    ...getColors('yellow'),
    requiresOAuth: false,
    configSchema: [
      { key: 'show_steps', label: 'Show Steps', type: 'select', required: false },
      { key: 'precision', label: 'Decimal Precision', type: 'number', required: false },
    ],
  },
  {
    name: 'Writing Assistant',
    type: 'writing_assistant',
    category: 'skill',
    description: 'Help with writing, editing, proofreading, and content creation',
    icon: getIcon('PenTool'),
    ...getColors('lime'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_tone', label: 'Default Tone', type: 'select', required: false },
      { key: 'default_format', label: 'Default Format', type: 'select', required: false },
    ],
  },
  {
    name: 'Vision Analysis',
    type: 'vision_analysis',
    category: 'skill',
    description: 'Analyze and describe images, extract text, and identify objects',
    icon: getIcon('Eye'),
    ...getColors('sky'),
    requiresOAuth: false,
    configSchema: [
      { key: 'detail_level', label: 'Detail Level', type: 'select', required: false },
      { key: 'extract_text', label: 'Extract Text (OCR)', type: 'select', required: false },
    ],
  },
  {
    name: 'Deep Research',
    type: 'research',
    category: 'skill',
    description: 'Conduct in-depth research on topics with multi-source synthesis',
    icon: getIcon('GraduationCap'),
    ...getColors('violet'),
    requiresOAuth: false,
    configSchema: [
      { key: 'max_sources', label: 'Max Sources', type: 'number', required: false },
      { key: 'depth', label: 'Research Depth', type: 'select', required: false },
    ],
  },
  {
    name: 'Video Understanding',
    type: 'video_understanding',
    category: 'skill',
    description: 'Analyze video content, extract key moments, and generate summaries',
    icon: getIcon('Video'),
    ...getColors('red'),
    requiresOAuth: false,
    configSchema: [
      { key: 'max_duration_minutes', label: 'Max Duration (min)', type: 'number', required: false },
      { key: 'extract_frames', label: 'Extract Key Frames', type: 'select', required: false },
    ],
  },

  // ─── DATA SOURCES (10) ──────────────────────────────────────────────
  {
    name: 'Google Drive',
    type: 'google_drive',
    category: 'data_source',
    description: 'Access and search files from your Google Drive',
    icon: getIcon('FolderOpen'),
    ...getColors('blue'),
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Access Token', type: 'password', required: true },
      { key: 'refresh_token', label: 'Refresh Token', type: 'password', required: true },
      { key: 'folder_ids', label: 'Folder IDs', type: 'text', required: false },
    ],
  },
  {
    name: 'Notion',
    type: 'notion',
    category: 'data_source',
    description: 'Connect to Notion workspaces to read and search pages and databases',
    icon: getIcon('BookOpen'),
    ...getColors('zinc'),
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
    icon: getIcon('Table'),
    ...getColors('blue'),
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
    icon: getIcon('GitBranch'),
    ...getColors('zinc'),
    requiresOAuth: true,
    configSchema: [
      { key: 'access_token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'repositories', label: 'Repositories', type: 'text', required: false },
    ],
  },
  {
    name: 'RSS Feeds',
    type: 'rss_feeds',
    category: 'data_source',
    description: 'Subscribe to RSS/Atom feeds for news, blogs, and updates',
    icon: getIcon('Rss'),
    ...getColors('orange'),
    requiresOAuth: false,
    configSchema: [
      { key: 'feed_urls', label: 'Feed URLs', type: 'textarea', required: true },
      { key: 'refresh_interval_min', label: 'Refresh Interval (min)', type: 'number', required: false },
      { key: 'max_items', label: 'Max Items per Feed', type: 'number', required: false },
    ],
  },
  {
    name: 'Web Scraping',
    type: 'web_scraping',
    category: 'data_source',
    description: 'Extract structured data from any public web page',
    icon: getIcon('Globe'),
    ...getColors('emerald'),
    requiresOAuth: false,
    configSchema: [
      { key: 'allowed_domains', label: 'Allowed Domains', type: 'textarea', required: false },
      { key: 'max_pages', label: 'Max Pages per Request', type: 'number', required: false },
    ],
  },
  {
    name: 'PDF Parser',
    type: 'pdf_parser',
    category: 'data_source',
    description: 'Extract text, tables, and metadata from PDF documents',
    icon: getIcon('FileText'),
    ...getColors('red'),
    requiresOAuth: false,
    configSchema: [
      { key: 'ocr_enabled', label: 'Enable OCR', type: 'select', required: false },
      { key: 'extract_tables', label: 'Extract Tables', type: 'select', required: false },
      { key: 'max_file_size_mb', label: 'Max File Size (MB)', type: 'number', required: false },
    ],
  },
  {
    name: 'Database Query',
    type: 'database',
    category: 'data_source',
    description: 'Connect to SQL/NoSQL databases for direct data access',
    icon: getIcon('Database'),
    ...getColors('amber'),
    requiresOAuth: false,
    configSchema: [
      { key: 'db_type', label: 'Database Type', type: 'select', required: true },
      { key: 'connection_string', label: 'Connection String', type: 'password', required: true },
      { key: 'read_only', label: 'Read Only Mode', type: 'select', required: false },
    ],
  },
  {
    name: 'REST API Connector',
    type: 'api_connector',
    category: 'data_source',
    description: 'Connect to any REST API with custom headers and authentication',
    icon: getIcon('Plug'),
    ...getColors('teal'),
    requiresOAuth: false,
    configSchema: [
      { key: 'base_url', label: 'Base URL', type: 'url', required: true },
      { key: 'auth_type', label: 'Auth Type', type: 'select', required: false },
      { key: 'auth_token', label: 'Auth Token', type: 'password', required: false },
      { key: 'custom_headers', label: 'Custom Headers', type: 'textarea', required: false },
    ],
  },
  {
    name: 'Spreadsheets',
    type: 'spreadsheets',
    category: 'data_source',
    description: 'Import and analyze data from CSV, Excel, and Google Sheets',
    icon: getIcon('Sheet'),
    ...getColors('green'),
    requiresOAuth: false,
    configSchema: [
      { key: 'default_format', label: 'Default Format', type: 'select', required: false },
      { key: 'max_rows', label: 'Max Rows to Import', type: 'number', required: false },
    ],
  },
];
