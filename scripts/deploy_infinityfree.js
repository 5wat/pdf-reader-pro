import * as ftp from 'basic-ftp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  const host = process.env.FTP_HOST || process.argv[2] || 'ftpupload.net';
  const user = process.env.FTP_USER || process.argv[3];
  const password = process.env.FTP_PASSWORD || process.argv[4];
  const remoteDir = process.env.FTP_REMOTE_DIR || process.argv[5] || 'htdocs';

  if (!user || !password) {
    console.error('Usage: node scripts/deploy_infinityfree.js <FTP_HOST> <FTP_USER> <FTP_PASSWORD> [REMOTE_DIR]');
    console.error('Example: node scripts/deploy_infinityfree.js ftpupload.net if0_12345678 my_password htdocs');
    process.exit(1);
  }

  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`Connecting to ${host} as ${user}...`);
    await client.access({
      host,
      user,
      password,
      secure: false, // InfinityFree typically uses standard FTP or explicit FTPS
    });

    console.log(`Connected successfully!`);
    console.log(`Navigating to remote directory: /${remoteDir}...`);
    await client.cd(`/${remoteDir}`);

    // Clean default files if present
    const existing = await client.list();
    for (const item of existing) {
      if (item.name === 'index2.html' || item.name.includes('files for your website')) {
        console.log(`Removing default placeholder: ${item.name}...`);
        try {
          await client.remove(item.name);
        } catch (e) {
          console.warn(`Could not remove ${item.name}:`, e.message);
        }
      }
    }

    const localDist = path.resolve(__dirname, '../dist');
    console.log(`Uploading contents of ${localDist} to /${remoteDir}...`);
    await client.uploadFromDir(localDist);

    // Verify .htaccess
    const distHtaccess = path.resolve(localDist, '.htaccess');
    try {
      await client.uploadFrom(distHtaccess, '.htaccess');
      console.log('Uploaded .htaccess successfully.');
    } catch (e) {
      console.warn('Note on .htaccess upload:', e.message);
    }

    console.log('Verifying uploaded files in ' + remoteDir + ':');
    const uploadedList = await client.list();
    for (const file of uploadedList) {
      console.log(` - ${file.name} (${file.isDirectory ? 'DIR' : file.size + ' bytes'})`);
    }

    console.log('🎉 Deployment to InfinityFree completed successfully!');
  } catch (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  } finally {
    client.close();
  }
}

deploy();
