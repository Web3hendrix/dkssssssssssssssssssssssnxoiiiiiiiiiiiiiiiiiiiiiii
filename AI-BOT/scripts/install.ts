import { Client, GatewayIntentBits, OAuth2Scopes, PermissionFlagsBits } from 'discord.js';
import { ConfigService } from '../../backend/src/config/config.service';

const config = new ConfigService();

export async function generateBotInvite(): Promise<string> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  return new Promise((resolve, reject) => {
    client.once('ready', async () => {
      try {
        const invite = await client.generateInvite({
          scopes: [OAuth2Scopes.Bot],
          permissions: [PermissionFlagsBits.Administrator]
        });
        resolve(invite);
      } catch (error) {
        reject(error);
      } finally {
        client.destroy();
      }
    });

    client.login(config.discord.token).catch(reject);
  });
}

// This will be called by the backend service when the frontend requests an invite
if (require.main === module) {
  generateBotInvite()
    .then(invite => {
      console.log(invite);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error generating invite:', error);
      process.exit(1);
    });
}
