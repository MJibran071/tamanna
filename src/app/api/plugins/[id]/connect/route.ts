import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/plugins/[id]/connect
 *
 * Initiates a connection flow for a plugin.
 * - For OAuth connectors: returns authUrl + provider info
 * - For token-based connectors: returns config dialog schema
 * - For skills/data_sources: returns enabled confirmation
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = await db.plugin.findUnique({ where: { id } });
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Parse metadata for connection info
    const metadata = plugin.metadata ? JSON.parse(plugin.metadata) : {};
    const requiresOAuth: boolean = metadata.requiresOAuth ?? false;
    const configSchema: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }> =
      metadata.configSchema ?? [];

    // Update status to connecting
    await db.plugin.update({
      where: { id },
      data: { status: 'connecting' },
    });

    if (plugin.category === 'connector') {
      // Build connect response based on connector type
      const connectResponse = buildConnectorConnectResponse(plugin.type, configSchema);
      return NextResponse.json(connectResponse);
    }

    // Skills and data sources don't need OAuth — just confirm enable
    return NextResponse.json({
      success: true,
      message: `${plugin.name} is ready to use`,
      pluginId: plugin.id,
      pluginType: plugin.type,
      category: plugin.category,
      status: 'connected',
      requiresOAuth: false,
      configSchema,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface ConnectResponse {
  provider: string;
  authUrl?: string;
  setupInstructions?: string;
  requiredFields: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>;
  message: string;
}

function buildConnectorConnectResponse(
  type: string,
  configSchema: Array<{ key: string; label: string; type: string; required: boolean; placeholder?: string }>
): ConnectResponse {
  switch (type) {
    case 'telegram':
      return {
        provider: 'telegram',
        setupInstructions:
          '1. Create a bot via @BotFather on Telegram\n' +
          '2. Copy the Bot Token from BotFather\n' +
          '3. Set a webhook URL pointing to your server\n' +
          '4. Paste the Bot Token below to connect',
        authUrl: 'https://t.me/BotFather',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Set up your Telegram bot via BotFather, then enter the Bot Token',
      };

    case 'github':
      return {
        provider: 'github',
        authUrl: 'https://github.com/login/oauth/authorize?scope=repo,user',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Authorize Tamanna to access your GitHub repositories',
      };

    case 'discord':
      return {
        provider: 'discord',
        authUrl: 'https://discord.com/api/oauth2/authorize?scope=bot',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Authorize Tamanna bot for your Discord server',
      };

    case 'slack':
      return {
        provider: 'slack',
        authUrl: 'https://slack.com/oauth/v2/authorize?scope=chat:write,channels:history,app_mentions:read',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Authorize Tamanna for your Slack workspace',
      };

    case 'instagram':
      return {
        provider: 'instagram',
        authUrl: 'https://api.instagram.com/oauth/authorize?scope=instagram_business_basic',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Connect your Instagram Business account via Meta OAuth',
      };

    case 'whatsapp':
      return {
        provider: 'whatsapp',
        setupInstructions:
          '1. Set up a Meta Business account\n' +
          '2. Create a WhatsApp Business API app in Meta Developer Portal\n' +
          '3. Get your Phone Number ID and Access Token\n' +
          '4. Enter the credentials below',
        authUrl: 'https://developers.facebook.com/apps/',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Configure WhatsApp Business API credentials',
      };

    case 'twitter':
      return {
        provider: 'twitter',
        setupInstructions:
          '1. Create a Twitter Developer account\n' +
          '2. Create an App in the Developer Portal\n' +
          '3. Generate API Key, API Secret, and Access Tokens\n' +
          '4. Enable OAuth 2.0 with read and write permissions',
        authUrl: 'https://developer.twitter.com/en/portal/dashboard',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Set up Twitter API credentials from the Developer Portal',
      };

    case 'email':
      return {
        provider: 'email',
        requiredFields: configSchema.filter((f) => f.required),
        message: 'Enter your SMTP credentials to connect your email',
      };

    default:
      return {
        provider: type,
        requiredFields: configSchema.filter((f) => f.required),
        message: `Enter the required configuration to connect ${type}`,
      };
  }
}
